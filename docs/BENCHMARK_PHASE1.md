# 阶段 1 大数据量性能测试与优化报告

> 项目：Aston's Blog  
> 日期：2026-11-03  
> 环境：Windows 本地开发机，Spring Boot 4.0.5，Java 23，MySQL 8.0.12，Redis 7，k6 v2.3.0  
> 压测库：`myblog_bench`（独立库，不污染 `myblog`）

---

## 1. 结论先行

1. **缓存是当前系统的生命线。** 缓存开启时，900 RPS 峰值档可以做到 0 错误、P95 约 3～5ms；缓存关闭时，300 RPS 都跑不到，P95 超过 13 秒。
2. **原来的文章分页在 4 万文章下会 OOM。** `JOIN FETCH + Page` 把大量文章和标签拉进内存，100 RPS 就触发 `OutOfMemoryError`。
3. **搜索是优化前最大的单点瓶颈。** `LIKE '%关键词%'` 在 4 万文章下 P95 约 6.19 秒；改 FULLTEXT 后，缓存开启时 P95 降到约 2ms，缓存关闭时单次查询约 0.3～0.6 秒。
4. **连接池默认 10 足够。** 缓存开启 + 访问日志开启时，连接池 10 的最大活跃为 9/10，pending 0；调到 20 没有实质收益，因此不调。
5. **访问日志目前不需要上 MQ。** 186k 次请求产生了 186k 条访问日志，Hikari pending 仍为 0。只有当目标超过当前压测规模，或出现突发流量/多实例时，才需要 RabbitMQ。
6. **GC 不需要调整。** 当前 G1 平均暂停仍为毫秒级，堆使用约 80～110MB；没有证据支持换 ZGC 或调大堆。

---

## 2. 数据规模

| 数据 | 数量 |
|---|---:|
| 用户 | 10,000 |
| 文章 | 50,000（40,000 已发布 + 10,000 草稿） |
| 标签 | 500 |
| 文章-标签关联 | 200,000 |
| 评论 | 300,000 |
| 访问日志 | 500,000（压测后约 686,000） |
| 点赞 | 200,000 |
| 照片 | 29 |
| 站点设置 | 4 |

数据特征：

- 每篇文章 2～6 个标签。
- 标签和文章作者按倾斜分布，不是平均分布。
- 评论 90% 已审核、10% 待审核。
- 访问日志覆盖最近 30 天。
- MySQL `innodb_buffer_pool_size` 从 64MB 临时调到 512MB 用于压测。

---

## 3. 优化前问题

### 3.1 文章分页 OOM

第一次 100 RPS 冒烟：

- 98.03% 请求失败。
- 大量请求 60 秒超时。
- 后端日志出现 `java.lang.OutOfMemoryError: Java heap space`。

根因：

```java
@Query("SELECT p FROM Post p LEFT JOIN FETCH p.author LEFT JOIN FETCH p.tags WHERE p.status = 'PUBLISHED'")
Page<Post> findPublishedWithAuthorAndTags(Pageable pageable);
```

`JOIN FETCH` 多集合 + `Page` 会让 Hibernate 处理大量重复行，40k 文章时直接把堆打爆。

### 3.2 搜索慢

优化前搜索使用：

```sql
title LIKE '%keyword%' OR content LIKE '%keyword%'
```

普通 BTree 索引无法使用，4 万文章下 P95 约 6.19 秒。

### 3.3 标签统计 N+1

`getAllTags()` 对每个标签执行一次 `COUNT(*)`，500 个标签就是 500 次查询。

---

## 4. 已实施优化

| 优化 | 位置 | 说明 |
|---|---|---|
| 两段式分页 | `PostRepository` / `PostServiceImpl` | 先查当前页 ID，再按 ID 批量取作者和标签 |
| 搜索两段式 | `PostRepository` / `PostServiceImpl` | FULLTEXT 与标签分支 UNION 查 ID，再批量取关联 |
| FULLTEXT 索引 | `V2_add_fulltext_search.sql` | `ngram` 分词，支持中文 |
| 搜索缓存 | `PostServiceImpl.search` | 缓存 key 含 query/page/limit |
| 标签统计批量查询 | `TagRepository` / `TagServiceImpl` | 一次 `GROUP BY tag_id` |
| 缓存开关 | `CacheConfig` | `BLOG_CACHE_ENABLED=false` 时使用 `NoOpCacheManager` |
| 访问日志开关 | `VisitLoggingInterceptor` | `BLOG_VISIT_LOG_ENABLED=false` 时不写日志 |
| 缓存指标 | `CacheConfig` | 预声明缓存名，暴露 `cache_gets_total` |

---

## 5. 压测场景定义

| 场景 | 缓存 | 访问日志 | 连接池 | 目标 RPS |
|---|---|---|---:|---:|
| B | 开 | 关 | 10 | 900 |
| A-20 | 开 | 开 | 20 | 900 |
| A-10 | 开 | 开 | 10 | 900 |
| C | 关 | 关 | 10 | 600 |
| C-20 | 关 | 关 | 20 | 300 |

压测脚本：`loadtest/k6/open-loop.js`  
执行器：`ramping-arrival-rate`，峰值档 900 RPS，每档 2 分钟。

---

## 6. 压测结果

### 6.1 优化前后对比

| 指标 | 优化前（B） | 优化后（B） | 变化 |
|---|---:|---:|---:|
| 总请求数 | 107,895 | 185,999 | +72% |
| 平均 RPS | 238.5 | 413.3 | +73% |
| P95 | 6.78s | 3.14ms | 约 2160 倍改善 |
| P99 | 8.09s | 4.25ms | 约 1900 倍改善 |
| 错误率 | 0% | 0% | 持平 |
| 丢弃请求 | 78,104 | 0 | 消除 |
| Hikari pending 最大 | 190 | 0 | 消除 |
| 搜索 P95 | 6.19s | 2.06ms | 约 3000 倍改善 |
| 文章详情 P95 | 1.82s | 3.11ms | 约 585 倍改善 |

> 优化前 B 场景是“缓存开、日志关、连接池 10”。优化后同样是“缓存开、日志关、连接池 10”。

### 6.2 真实形态：缓存开 + 访问日志开

| 指标 | 连接池 10 | 连接池 20 |
|---|---:|---:|
| 总请求数 | 185,999 | 185,999 |
| 平均 RPS | 413.3 | 413.3 |
| P95 | 5.37ms | 4.24ms |
| P99 | 8.50ms | 6.33ms |
| 错误率 | 0% | 0% |
| 丢弃请求 | 0 | 0 |
| Hikari 最大活跃 | 9/10 | 8/20 |
| Hikari pending 最大 | 0 | 0 |
| 访问日志新增 | 约 186k | 约 186k |

结论：默认连接池 10 足够，不需要调到 20。

### 6.3 缓存关闭：数据库真实压力

| 指标 | 连接池 10（目标 600） | 连接池 20（目标 300） |
|---|---:|---:|
| 总请求数 | 30,889 | 17,651 |
| 平均 RPS | 91.0 | 80.6 |
| P95 | 13.58s | 15.18s |
| P99 | 16.27s | 18.37s |
| 错误率 | 0% | 0% |
| 丢弃请求 | 60,610 | 15,348 |
| Hikari 最大活跃 | 10/10 | 20/20 |
| Hikari pending 最大 | 190 | 180 |
| 获取连接平均耗时 | 1110ms | 1029ms |

结论：缓存关闭时，数据库路径无法承受当前压测规模。连接池从 10 调到 20 没有解决问题，因为瓶颈是数据库查询本身，而不是连接数。

---

## 7. 关键指标解读

### 7.1 缓存命中率

- `publicPosts`：99.95%
- `search`：99.98%
- `postDetail`：约 35%（详情页 slug 分散，缓存命中率天然低于列表）

### 7.2 Hikari

- 缓存开启 + 日志开启：最大活跃 9/10，pending 0。
- 缓存关闭：最大活跃 10/10 或 20/20，pending 180～190。
- 说明连接池不是“越大越好”，先解决查询和缓存，再谈连接数。

### 7.3 GC

- 缓存开启 + 日志开启：GC 约 75 次/分钟，堆使用约 78MB。
- 没有观察到 Old GC。
- 当前 G1 表现正常，不建议更换 GC。

### 7.4 访问日志

- 186k 请求产生约 186k 条访问日志。
- 异步写入没有拖垮请求，Hikari pending 0。
- 但访问日志表会持续增长，后续需要归档/聚合策略。

---

## 8. 当前仍存在的问题

1. **缓存关闭时数据库容量不足**：这是预期结果，但也说明缓存是核心依赖。
2. **搜索冷缓存仍需 300～600ms**：FULLTEXT 比 LIKE 好很多，但数据继续增长后可能需要独立搜索引擎。
3. **访问日志持续增长**：需要定期归档、分区或聚合表。
4. **文章详情缓存命中率低**：随机 slug 访问导致缓存效果有限，可考虑热点文章预热。
5. **多实例未验证**：当前仍是单实例，定时任务和本地文件未做多实例适配。

---

## 9. 决策结论

| ID | 决策 | 结论 | 理由 |
|---|---|---|---|
| D-01 | 是否保持单体 | 保持 | 当前瓶颈在查询和缓存，不在服务拆分 |
| D-02 | 是否上 RabbitMQ | 暂不上 | 900 RPS 下访问日志异步写入正常，pending 0 |
| D-03 | 是否调 Hikari | 保持 10 | 10 已足够，20 无实质收益 |
| D-04 | 是否换 GC | 保持 G1 | 无 Old GC，暂停毫秒级 |
| D-05 | 是否上 Elasticsearch | 暂不上 | FULLTEXT 已把搜索从 6s 降到 0.3～0.6s |
| D-06 | 是否加数据继续测 | 可以，但先归档日志 | 访问日志已 68.6 万，继续增长会污染基线 |

---

## 10. 复现命令

```powershell
# 1. 启动压测库实例（缓存开、日志开、连接池 10）
$env:SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/myblog_bench?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true'
$env:SPRING_DATASOURCE_USERNAME='root'
$env:SPRING_DATASOURCE_PASSWORD='root'
$env:SPRING_FLYWAY_ENABLED='false'
$env:SPRING_DATA_REDIS_DATABASE='1'
$env:BLOG_CACHE_ENABLED='true'
$env:BLOG_VISIT_LOG_ENABLED='true'
$env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE='10'
mvn -f pom-bench.xml spring-boot:run

# 2. 开环压测
k6 run -e BASE_URL=http://localhost:8080 -e MAX_RPS=900 loadtest/k6/open-loop.js

# 3. 缓存关闭对照
$env:BLOG_CACHE_ENABLED='false'
k6 run -e BASE_URL=http://localhost:8080 -e MAX_RPS=300 loadtest/k6/open-loop.js
```

> `pom-bench.xml` 和 `bench-data/` 是本地压测辅助文件，已加入 `.gitignore`，不提交到仓库。

---

## 11. 测试副作用

- 压测库 `myblog_bench` 保留，供后续复测。
- 压测库访问日志从 500,000 增长到约 686,000。
- 真实库 `myblog` 未被本次大数据量压测写入。
- 测试完成后应用已切回 `myblog`。
### 搜索 SQL 补充（2026-11-05）

进一步检查发现，`MATCH(...) OR EXISTS(...)` 会让 MySQL 放弃 FULLTEXT 索引，退化为扫描全部已发布文章。

已改为 UNION：

```sql
SELECT matched.id
FROM (
    SELECT p.id, p.published_at
    FROM posts p
    WHERE p.status = 'PUBLISHED'
      AND MATCH(p.title, p.content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
    UNION
    SELECT p.id, p.published_at
    FROM posts p
    WHERE p.status = 'PUBLISHED'
      AND EXISTS (标签匹配)
) matched
ORDER BY matched.published_at DESC
LIMIT :limit OFFSET :offset;
```

执行计划确认 FULLTEXT 分支使用 `ft_posts_title_content`，整体 query cost 从 6,844.72 降到 2,569.64。详细对比见 `docs/BENCHMARK_QUERY.md`。
