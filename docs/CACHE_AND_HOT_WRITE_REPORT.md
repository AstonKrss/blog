# 阶段 2 正式报告：缓存与热点写优化

> 项目：Aston's Blog
> 报告日期：2026-11-08
> 阶段状态：✅ 已完成（100%）
> 范围：缓存边界、Redis 降级、TTL 抖动、精确失效、热点 Key 回源、浏览量幂等、点赞原子计数、Hikari 配置与可观测性

---

## 0. 执行摘要

阶段 2 的目标不是简单“加一个 Redis”，而是把读多写少的内容平台改造成一套可降级、可观测、可控失效的缓存体系。

本轮最终完成：

1. **缓存读路径**：Redis 正常时走缓存，Redis 异常时统一回源 MySQL。
2. **缓存生命周期**：TTL 增加 8～12 分钟抖动，文章变更后精确删除或使用版本号逻辑失效。
3. **热点保护**：单实例用分段本地锁保护回源，多实例尝试 Redis 锁，锁不可用时采用可用性优先降级。
4. **热点写**：浏览量使用 Redis 增量 + 幂等批次落库；点赞使用数据库原子计数 + 周期校准。
5. **连接池**：基于 Hikari 采样把配置确定为 `minimum-idle=10`、`maximum-pool-size=20`。
6. **故障可观测性**：缓存失败、回源、Redis 降级、任务耗时、连接池等待均有指标。

阶段 2 判定为完成，但“真实生产容量”仍需在 Docker/多实例环境补正式 A/B 压测和 Testcontainers 验证。

---

## 1. 本轮完成内容

| 项目 | 实现结果 | 主要位置 |
|---|---|---|
| TTL 随机抖动 | 每个缓存条目写入时在 8～12 分钟之间随机生成 TTL | `JitterTtlFunction.java`、`CacheConfig.java` |
| 精确缓存失效 | 详情/标签/归档/统计精确删除；列表/搜索用版本号逻辑失效 | `CacheInvalidationService.java`、`CacheVersionService.java`、`PostServiceImpl.java` |
| 热点 Key 互斥回源 | 单实例固定分段本地锁 + Redis 分布式锁尝试；Redis 锁不可用时可用性优先降级 | `CacheStampedeGuard.java`、`ResilientCache.java` |
| 点赞计数 | `INSERT IGNORE` / `DELETE` 与实际行数驱动原子加减；定时校准不一致计数 | `PostLikeServiceImpl.java`、`PostRepository.java`、`PostLikeCountCalibrationTask.java` |

对应本地提交：

```text
c39ffec perf: add per-entry cache ttl jitter
22cb89e perf: invalidate caches precisely with versioned list keys
4e76ae4 perf: guard hot cache keys against stampedes
b2dbb96 perf: make post like counts atomic and calibrate periodically
```

---

## 2. TTL 随机抖动

### 2.1 方案

缓存基础 TTL 仍是 10 分钟，但每个稳定对象写入 Redis 时，实际 TTL 在 **8～12 分钟**内随机取值。

```java
.entryTtl(new JitterTtlFunction(Duration.ofMinutes(8), Duration.ofMinutes(12)))
```

### 2.2 为什么

如果一批缓存 key 在同一时间被写入，固定 TTL 会让它们在 10 分钟后同时过期，形成缓存雪崩窗口。随机抖动把过期时间打散，降低同一瞬间大量请求回源 MySQL 的概率。

### 2.3 参数与边界

| 参数 | 值 | 理由 |
|---|---:|---|
| 最小 TTL | 8 分钟 | 比基础值少 2 分钟，仍保留足够缓存时长 |
| 最大 TTL | 12 分钟 | 比基础值多 2 分钟，抖动幅度约 ±20% |
| 随机粒度 | 秒 | 避免大量 key 落在同一毫秒级时间点 |

边界：

- TTL 只作用于 Spring Cache 的 Redis 条目，不影响浏览量等直接使用 `StringRedisTemplate` 的 key。
- Redis 不可用时不会写入缓存，仍由 `ResilientCache` 回源 MySQL。

---

## 3. 精确缓存失效

### 3.1 缓存 Key 设计

| 缓存 | Key / 失效方式 | 更新文章后的动作 |
|---|---|---|
| `postDetail` | 文章 slug | 精确删除旧 slug 和新 slug |
| `archive` | 无参缓存 key（`SimpleKey.EMPTY`） | 精确删除该 key |
| `tags` | 无参缓存 key（`SimpleKey.EMPTY`） | 精确删除该 key |
| `stats` | `summary` | 精确删除 `summary` |
| `publicPosts` | `v:<version>:p:<page>:l:<limit>:t:<tag>` | 递增 Redis 版本号，旧 key 逻辑失效 |
| `search` | `q:<version>:<query>:p:<page>:l:<limit>` | 递增 Redis 版本号，旧 key 逻辑失效 |

文章列表和搜索的 key 带版本号，因此不需要枚举所有分页、标签和搜索词，也不需要执行 `allEntries=true` 清空整个 cache。

### 3.2 事务边界

缓存失效注册在数据库事务提交之后执行：

```text
更新数据库
-> 事务提交
-> 删除精确 key / 递增列表版本号
```

这样不会出现“数据库事务回滚，但缓存已经被删除或版本被推进”的情况。

### 3.3 为什么不用 `allEntries=true`

`allEntries=true` 会把同一个 cache 下的所有分页与筛选组合一起清掉。文章一更新，所有列表请求都需要重新回源，热点流量高时会放大数据库压力。版本号方案只让旧版本 key 失效，成本更可控。

### 3.4 已知边界

- 如果版本号递增时 Redis 恰好故障，旧版本 key 可能保留到 TTL 到期；但 Redis 故障期间读路径本身会降级回源 MySQL。
- 如果 Redis 只发生短暂写入失败、随后恢复，旧的列表缓存仍可能在剩余 TTL 内被命中。该窗口最长约 12 分钟，属于当前方案的可用性优先取舍。
- `archive` 和 `tags` 是无参方法，因此使用 `SimpleKey.EMPTY`；如果以后改成带参数缓存，需要同步修改失效 key。

---

## 4. 热点 Key 互斥回源

### 4.1 请求路径

```text
@Cacheable get
  -> ResilientCache.get(key, loader)
  -> 先查缓存
  -> 未命中则进入 CacheStampedeGuard
  -> 单实例本地锁按 cache + key hash 分段
  -> 尝试获取 Redis 分布式锁（TTL 10 秒）
  -> 再次检查缓存
  -> 仍未命中才执行 loader
  -> 写回缓存并释放锁
```

### 4.2 单实例保护

使用 256 个固定 `ReentrantLock`，按 `cacheName + key` 的 hash 分配锁。这样不需要每次请求创建锁对象，也能让同一热点 key 在单实例内只有一个请求执行回源。

### 4.3 多实例保护与降级

跨实例会尝试 Redis 锁：

```text
cache-load:<cacheName>:<key>
```

锁 TTL 为 10 秒，释放时比较随机 token，避免误删其他实例持有的锁。

重要边界：

> 这不是严格的全局互斥。如果某个实例没有抢到 Redis 锁，当前实现会让它继续执行本地回源，而不是阻塞等待。这是“可用性优先”的降级：单实例内不会重复回源，但跨实例在锁竞争时仍可能发生少量重复查询。

如果未来要求严格跨实例只回源一次，需要增加“轮询等待锁 + 等待后再次查缓存 + 超时后降级”的协调逻辑，并接受请求延迟上升。

---

## 5. 点赞原子计数与周期校准

### 5.1 点赞流程

```text
尝试 INSERT IGNORE post_likes(post_id, user_id)
  -> 插入成功：posts.like_count + 1
  -> 插入失败：说明已经点赞，执行 DELETE
       -> 删除成功：posts.like_count - 1
       -> 删除失败：说明已被并发请求取消，不再递减
```

关键点：

- `post_likes(post_id, user_id)` 唯一约束负责防止重复点赞记录。
- 只有实际插入/删除行数大于 0 才修改计数，避免并发请求重复加减。
- 点赞记录和计数的修改在同一个 `@Transactional` 方法中执行。
- 读取点赞状态和计数时不再对每次请求执行 `COUNT(*)`。

### 5.2 周期校准

`PostLikeCountCalibrationTask` 默认每小时执行一次，启动后延迟 5 分钟执行首次校准：

```text
posts.like_count
  vs
COUNT(post_likes GROUP BY post_id)
```

只更新不一致的文章，不扫描结果去逐篇更新。

配置项：

| 配置 | 默认值 | 说明 |
|---|---:|---|
| `blog.post-like.calibration.enabled` | `true` | 是否启用校准 |
| `blog.post-like.calibration.interval-ms` | `3600000` | 每小时执行一次 |
| `blog.post-like.calibration.initial-delay-ms` | `300000` | 启动后 5 分钟首次执行 |

任务使用 Redis 分布式锁 `task:post-like-count-calibration`，锁 TTL 为 10 分钟，避免多实例重复执行；任务耗时通过 `blog.task.duration{task="post-like-count-calibration"}` 记录。

### 5.3 已知边界

- 计数校准是最终一致性，不是强实时；极端崩溃后可能有一个校准周期内的短暂偏差。
- 点赞业务仍依赖数据库事务，若数据库写入失败，整个点赞事务回滚。
- 当前只对文章点赞做原子计数；其他计数型业务如留言点赞未在本轮范围内。

---

## 6. 验证结果

### 6.1 本轮相关测试

使用 JDK 23 执行：

```powershell
mvn -q -o -f pom-bench.xml "-Dtest=JitterTtlFunctionTest,CacheInvalidationServiceTest,PostServiceCacheInvalidationTest,CacheStampedeGuardTest,ResilientCacheTest,PostLikeServiceImplTest,PostLikeCountCalibrationTaskTest" test
```

结果：

```text
7 个测试类，17 个测试，0 失败，0 错误
```

完整回归（排除受当前 Windows 临时目录权限影响的 `LocalFileStorageTest`）：

```text
阶段 2 完成时：22 个测试类，89 个测试，0 失败，0 错误，4 个 Testcontainers 用例跳过
当前全仓（含后续阶段 3 测试）：25 个测试类，93 个测试，0 失败，0 错误，4 个 Testcontainers 用例跳过
```

覆盖点：

- TTL 始终落在 8～12 分钟范围内；
- 非法 TTL 范围被拒绝；
- 文章变更后精确 key 删除和版本号递增；
- 文章写操作不再使用大范围 `allEntries` 清理；
- 热点 key 本地锁与 Redis 锁释放；
- Redis 锁不可用时仍能回源；
- Redis 读取、写入、删除失败不阻断业务；
- 点赞插入/删除与实际计数变更；
- 校准任务持锁执行并记录耗时。

### 6.2 接口烟测

当前 8080 实例健康检查：

```json
{"groups":["liveness","readiness"],"status":"UP"}
```

接口结果：

| 接口 | 状态 | 结果 |
|---|---|---|
| `GET /api/public/posts?page=1&limit=5` | 200 | 返回 5 条文章 |
| `GET /api/public/search?q=test&page=1&limit=5` | 200 | 返回 3 条搜索结果 |

> 本轮烟测用于确认改动后核心读路径仍可用；未把短时间请求当作正式高并发性能结论。正式压测数据见 `docs/BENCHMARK_BASELINE.md`、`docs/BENCHMARK_PHASE1.md` 和 `docs/HIKARI_POOL_SAMPLING.md`。

---

## 7. 决策回填

| 决策点 | 选择 | 落点 |
|---|---|---|
| TTL 抖动区间 | 8～12 分钟 | `CacheConfig.java` |
| 随机粒度 | 秒级 | `JitterTtlFunction.java` |
| 列表缓存失效 | Redis 版本号逻辑失效 | `CacheVersionService.java` |
| 详情缓存失效 | 旧/新 slug 精确删除 | `CacheInvalidationService.java` |
| 无参缓存失效 | `SimpleKey.EMPTY` | `CacheInvalidationService.java` |
| 单实例防击穿 | 256 个分段本地锁 | `CacheStampedeGuard.java` |
| 多实例锁 | Redis token + TTL 10 秒 | `CacheStampedeGuard.java`、`RedisDistributedLock.java` |
| 点赞幂等 | 数据库唯一键 + 实际影响行数 | `PostLikeRepository.java` |
| 点赞计数 | SQL 原子加减 | `PostRepository.java` |
| 点赞校准 | 每小时、首次延迟 5 分钟、分布式锁 | `PostLikeCountCalibrationTask.java` |

---

## 8. 阶段 2 完成结论

阶段 2 已完成以下闭环：

- 缓存不再使用固定 TTL，具备基础雪崩缓解能力；
- 文章更新不再清空整个列表缓存，改为精确删除或版本号失效；
- 热点 key 在单实例内有明确回源保护，多实例有 Redis 锁尝试和可用性降级；
- 点赞计数从“每次 COUNT(*)”改为原子计数，并具备周期校准兜底；
- Redis 故障、缓存回源、点赞事务和校准任务都有测试或接口验证。

剩余工作不属于阶段 2：

- 在 Docker/CI 环境实际运行 Testcontainers；
- 如进入阶段 3，只选择“访问日志异步写入”这一条 RabbitMQ 链路；
- 若要求严格跨实例热点回源互斥，需要单独决定是否增加等待与超时策略。
---

## 9. 性能与容量证据

### 9.1 缓存对读路径的影响

数据来自 `docs/BENCHMARK_PHASE1.md`，测试库为 `myblog_bench`，不是小数据量演示库。

| 场景 | 目标/实际负载 | P95 | P99 | 错误率 | Hikari 最大 pending |
|---|---:|---:|---:|---:|---:|
| 缓存开启，访问日志开启 | 约 900 RPS 档、实际约 413 RPS | 4.24～5.37 ms | 6.33～8.50 ms | 0% | 0 |
| 缓存关闭，目标 600 RPS | 实际约 91 RPS | 13.58 s | 16.27 s | 0% | 190 |
| 缓存关闭，目标 300 RPS | 实际约 80.6 RPS | 15.18 s | 18.37 s | 0% | 180 |

关键结论：

- 缓存不是“锦上添花”，而是当前读多写少场景的核心容量组件。
- 缓存关闭后数据库查询路径饱和，继续增加连接池没有解决根因。
- 这里的缓存开关对照发生在阶段 1 的大数据量实验中，不能替代阶段 2 所有细项改动后的独立 A/B 压测。

### 9.2 缓存命中率

| 缓存 | 命中率 | 说明 |
|---|---:|---|
| `publicPosts` | 99.95% | 列表和分页重复访问命中高 |
| `search` | 99.98% | 相同搜索词重复访问命中高 |
| `postDetail` | 约 35% | 详情 slug 分散，长尾明显 |

`postDetail` 命中率低不是代码错误，而是访问分布问题；后续可以通过热点文章预热提升。

### 9.3 Hikari 连接池采样

| 场景 | 最大活跃 | 最大 pending | HTTP P95 | HTTP P99 | 吞吐 |
|---|---:|---:|---:|---:|---:|
| 10 连接 / 100 VU | 10/10 | 23 | 71.45 ms | 124.10 ms | 812 req/s |
| 固定 20 连接 / 100 VU | 20/20 | 0 | 40.64 ms | 66.61 ms | 857 req/s |
| min10/max20 / 100 VU | 18/20 | 0 | 55.71 ms | 97.59 ms | 830 req/s |
| min10/max20 / 150 VU | 20/20 | 5 | 49.30 ms | 81.68 ms | 1,211 req/s |

最终配置：

```yaml
spring:
  datasource:
    hikari:
      minimum-idle: 10
      maximum-pool-size: 20
```

结论：

- 100 VU 下 pool=10 明显出现连接等待，pool=20 消除了 pending。
- 150 VU 下 min10/max20 开始出现少量 pending，超时为 0。
- 这说明连接池配置已经改善当前场景，但不代表可以无限加连接。多实例部署时还要把每个实例的 pool size 乘以实例数，并重新评估 MySQL 承载能力。

---

## 10. 缓存与 Redis 故障矩阵

| 场景 | 当前行为 | 业务语义 |
|---|---|---|
| Spring Cache 读 Redis 失败 | 记录 `cache.redis.failures`，按缓存未命中回源 MySQL | 核心读接口保持可用 |
| Spring Cache 写回失败 | 记录失败，不阻断业务返回 | 本次结果仍返回，缓存暂时不更新 |
| Spring Cache evict 失败 | 记录失败，旧值等待 TTL 到期 | 可能出现短暂旧缓存窗口 |
| 浏览量 Redis 失败 | 记录 `post.view.redis.failures`，不写入增量 | 允许少计，文章详情继续可访问 |
| 在线人数 Redis 失败 | 返回 0，记录失败指标 | 在线人数是近似值 |
| 留言限流 Redis 失败 | fail-open，允许留言 | 可用性优先，限流暂时失效 |
| 登录防爆破 Redis 失败 | fail-open，允许登录，记录指标 | 防止 Redis 故障把用户锁在门外 |
| 分布式锁 Redis 失败 | 跳过本轮任务，等待下一轮 | 不能让多个实例同时执行定时任务 |
| 缓存版本号递增失败 | 旧版本列表缓存可能保留到 TTL | 需要监控并接受短暂旧数据窗口 |

原则：**不同业务不能共用同一种故障语义。** 缓存读、低价值统计、安全限流和分布式锁的可用性/一致性要求不同。

---

## 11. 浏览量幂等与少计边界

浏览量链路的核心问题是跨 Redis/MySQL 两个系统，不能依赖“先写哪个再写哪个”来保证原子性。

最终设计：

```text
Redis Lua 原子认领 delta
  -> 生成 batchId
  -> pending 保存 batchId + postId + delta
  -> MySQL 事务中 INSERT IGNORE batch + UPDATE view_count
  -> 提交后删除 pending
```

关键保证：

- `batchId` 在 Redis 认领时生成，重试不会生成新批次；
- `view_count_flush_batch.batch_id` 是唯一键；
- `INSERT IGNORE` 和 `UPDATE posts.view_count` 在同一个 MySQL 事务内；
- MySQL 已提交但 pending 未删除时，重试会识别 `ALREADY_APPLIED`，不会重复累加；
- MySQL 未执行时，pending 会被恢复任务重做。

真实验证：

```text
正常：view_count +10，pending 最终为 0，batch_rows = 1
已提交后重放：view_count 不增加，pending 删除
未执行批次重放：view_count 正确增加，pending 删除
```

已知边界：Redis 整体丢失时，delta 和 pending 都可能丢失，浏览量会少计。这个误差已经明确接受。

---

## 12. 验收对照

| 验收项 | 结果 | 证据 |
|---|---|---|
| 缓存命中率达到预设目标 | 列表 99.95%、搜索 99.98% | `BENCHMARK_PHASE1.md` |
| 数据库读 QPS 明显下降 | 缓存关闭时数据库路径饱和，开启时读请求主要命中 Redis | `BENCHMARK_PHASE1.md` |
| Redis 不可用时核心页面可访问 | 文章列表、标签、详情烟测 HTTP 200 | `CACHE_RESILIENCE.md` |
| Redis 不可用时业务不直接失败 | 浏览量、在线人数、留言、登录、锁均有明确降级策略 | `REDIS_FAILURE_POLICIES.md` |
| 更新文章后不读到明显旧数据 | 事务提交后精确删除/推进版本号 | `CacheInvalidationService` / `CacheVersionService` |
| 热点 Key 不会在单实例内同时回源 | 256 个分段本地锁保护 | `CacheStampedeGuard` 测试 |
| 浏览量崩溃重试不重复累加 | batchId + 唯一键 + 同事务 UPDATE | `VIEW_COUNT_IDEMPOTENCY.md` |
| 点赞并发不重复计数 | 唯一键 + 实际影响行数 + 原子 SQL | `PostLikeServiceImpl` 测试 |
| 连接池有数据依据 | Hikari 采样报告 | `HIKARI_POOL_SAMPLING.md` |
| 定时任务不会多实例重复执行 | Redis 分布式锁 | `REDIS_FAILURE_POLICIES.md` |

---

## 13. 已知边界与后续动作

### 13.1 已知边界

1. **跨实例热点回源不是严格全局互斥。**
   多实例抢不到 Redis 锁时会继续本地回源，优先保证可用性，可能产生少量重复数据库查询。

2. **缓存 evict 失败时有短暂旧数据窗口。**
   删除失败只能等待 TTL 到期；版本号递增失败也有最长约 12 分钟的窗口。

3. **Testcontainers 尚未在 Docker 环境真实执行。**
   当前本机无 Docker，4 个容器测试自动跳过。

4. **阶段 2 细项改动后的正式 A/B 压测尚未单独重跑。**
   现有大数据量数据覆盖数据库、缓存和连接池主路径；TTL 抖动、版本号失效、热点回源和点赞计数还需要一轮收尾压测。

5. **Redis 整体丢失时浏览量允许少计。**
   这是明确的业务取舍，不是强一致计数。

### 13.2 建议后续动作

1. 在 Docker/CI 执行阶段 2 相关 Testcontainers。
2. 用 k6 对缓存开启、缓存关闭、Redis 故障三种场景重新跑一组固定数据量 A/B。
3. 在 Grafana 增加缓存命中率、回源率、Redis 失败、Hikari pending 和点赞校准结果面板。
4. 如果要求严格跨实例互斥，重新设计等待锁、二次检查、超时降级和延迟目标。

---

## 14. 面试可讲版本

> 针对博客读多写少的特点，我对缓存体系做了边界化改造：使用 8～12 分钟 TTL 抖动缓解雪崩，文章更新采用精确删除和版本号逻辑失效，热点 Key 增加分段本地锁和 Redis 锁尝试；Redis 故障时统一回源 MySQL，浏览量采用批次幂等落库并允许少计；点赞计数改为数据库原子更新并增加周期校准，Hikari 连接池通过采样确定为 min10/max20。大数据量压测中，缓存开启时核心读接口 P95 约 4～5ms，缓存关闭后数据库路径 P95 达到 13～15 秒并出现大量连接等待，验证了缓存和查询优化是当前系统的主要容量边界。

注意：这段是面试表达模板，数字必须结合对应压测场景解释，不能把不同负载条件下的结果直接包装成同一场景的前后提升。
