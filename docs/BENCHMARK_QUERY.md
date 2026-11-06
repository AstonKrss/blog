# 阶段 1 查询优化与执行计划报告

> 日期：2026-11-05  
> 测试库：`myblog_bench`（独立测试库）  
> 数据库：MySQL 8.0.12  
> 数据规模：50,000 篇文章、200,000 条文章标签关联、500 个标签、100,000 条笔记评论  
> 说明：MySQL 8.0.12 不支持 `EXPLAIN ANALYZE`，本报告使用 `EXPLAIN FORMAT=JSON` 和真实压测数据。

---

## 1. 结论先行

| 优化项 | 优化前 | 优化后 | 结果 |
|---|---|---|---|
| 文章列表分页 | `JOIN FETCH + Page`，4 万文章下 OOM | 两段式分页：先查 ID，再批量加载作者和标签 | P95 从 6.78s 降到 3.14ms（缓存开启场景） |
| 笔记列表 N+1 | 一页 20 条笔记逐条查评论和作者 | 当前页评论、作者、点赞各批量查询一次 | SELECT 从约 42 次/请求降到 4 次/请求 |
| 标签统计 N+1 | 500 个标签执行 500 次 COUNT | 一次 `GROUP BY tag_id` | 消除标签数量线性增长 |
| 搜索 | `LIKE '%keyword%'` 全表扫描 | FULLTEXT + 标签分支 UNION | 冷缓存搜索从约 6.19s 降到 0.3～0.6s |
| 笔记评论索引 | `note_comments.note_id` 无索引 | `(note_id, created_at)` 联合索引 | 扫描行数从约 100,200 降到 200 |

---

## 2. 文章列表两段式分页

### 2.1 改造方式

不再使用集合 `JOIN FETCH` 直接分页：

```text
第 1 段：查询当前页文章 ID
第 2 段：按 ID 批量加载作者和标签
```

对应代码：

- `PostRepository.findPublishedIds(Pageable)`
- `PostRepository.findByIdInWithAuthorAndTags(Collection<String>)`
- `PostServiceImpl.getPublicPosts(...)`

### 2.2 执行计划

```sql
SELECT p.id
FROM posts p
WHERE p.status = 'PUBLISHED'
ORDER BY p.published_at DESC
LIMIT 20 OFFSET 0;
```

`EXPLAIN FORMAT=JSON` 关键结果：

```text
access_type: ref
key: idx_status_published
rows_examined_per_scan: 22,817
using_filesort: false
query_cost: 5,542.13
```

说明：

- 使用 `idx_status_published(status, published_at DESC)`。
- 排序由索引完成，没有额外 filesort。
- 第二段按 ID 批量加载，避免把全表文章和标签集合拉进内存。

### 2.3 压测结果

来自 `docs/BENCHMARK_PHASE1.md`：

| 指标 | 优化前 | 优化后 |
|---|---:|---:|
| 总请求数 | 107,895 | 185,999 |
| 平均 RPS | 238.5 | 413.3 |
| P95 | 6.78s | 3.14ms |
| P99 | 8.09s | 4.25ms |
| 错误率 | 0% | 0% |

---

## 3. 笔记列表 N+1

### 3.1 改造方式

当前页 20 条笔记不再逐条查询评论：

```sql
SELECT *
FROM note_comments
WHERE note_id IN (当前页 20 个 noteId)
ORDER BY note_id ASC, created_at ASC;
```

评论作者也只批量查询一次，当前用户点赞状态只查询当前页。

### 3.2 执行计划

有索引：

```text
access_type: range
key: idx_note_comments_note_created_at
rows_examined_per_scan: 200
using_filesort: false
query_cost: 95.01
```

无索引模拟：

```text
access_type: ALL
rows_examined_per_scan: 99,331
using_filesort: true
query_cost: 59,815.60
```

### 3.3 压测结果

来自 `docs/BENCHMARK_N1_2026-11-04.md`：

| 指标 | 无索引 | 有索引 |
|---|---:|---:|
| 10 VU P95 | 117.02ms | 13.98ms |
| 50 VU P95 | 557.05ms | 11.01ms |
| 批量评论扫描行数 | 约 100,200 行/次 | 200 行/次 |
| 批量评论平均耗时 | 49.768ms | 1.202ms |
| 每请求 SELECT 次数 | 约 4 次（批量后） | 约 4 次（批量后） |

> 注意：N+1 修复解决的是“查询次数线性增长”，索引解决的是“单条批量查询扫描行数过大”。两者必须同时做。

---

## 4. 标签统计 N+1

改造前：

```text
for (每个标签) {
    count(*) from post_tags where tag_id = ?
}
```

500 个标签就是 500 次查询。

改造后：

```sql
SELECT tag_id, COUNT(*)
FROM post_tags
GROUP BY tag_id;
```

对应代码：

- `TagRepository.countPostsGroupByTag()`
- `TagServiceImpl.getAllTags()`

结果：标签数量从 500 增长到 5,000 时，统计查询次数仍然是 1 次。

---

## 5. 搜索改造

### 5.1 旧查询的问题

旧查询：

```sql
WHERE MATCH(title, content) AGAINST (...)
   OR EXISTS (标签 LIKE ...)
```

`OR` 会让 MySQL 优化器放弃 FULLTEXT 索引，退化为按 `status` 扫描全部已发布文章。

旧执行计划：

```text
access_type: ref
key: idx_status_published
rows_examined_per_scan: 22,817
query_cost: 6,844.72
FULLTEXT 索引未使用
```

### 5.2 新查询

把 FULLTEXT 分支和标签分支拆成 `UNION`：

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

新执行计划：

```text
FULLTEXT 分支：
  access_type: fulltext
  key: ft_posts_title_content
  query_cost: 1.10

整体：
  query_cost: 2,569.64
  union 结果使用临时表
  ORDER BY 使用 filesort
```

### 5.3 取舍

| 方案 | 优点 | 代价 |
|---|---|---|
| 旧 OR 查询 | SQL 短 | FULLTEXT 索引失效，扫描全部已发布文章 |
| 新 UNION 查询 | FULLTEXT 分支真正命中索引，整体成本下降 | 需要临时表和排序，SQL 更复杂 |
| Elasticsearch | 搜索能力最强 | 多一套服务、数据同步和一致性成本 |

当前数据规模下选择 UNION；如果文章量继续增长、搜索功能变复杂，再评估 Elasticsearch。

### 5.4 接口验证

在 `myblog_bench` 上启动 8081 实例，实际调用：

```text
GET /api/public/posts?tag=bench-tag-0001&page=1&limit=20
GET /api/public/search?q=性能优化&page=1&limit=10
```

结果：

| 接口 | HTTP | 返回 | 耗时 |
|---|---:|---|---:|
| 标签筛选 | 200 | 20 条，total 14,514 | 0.300s |
| FULLTEXT 搜索 | 200 | 10 条，total 40,000 | 3.139s（冷查询） |

说明：

- 标签筛选的 native 分页查询可以正常返回。
- 搜索返回 40,000 条是因为压测数据中大量文章内容包含“性能优化”，不是结果错误。
- 冷查询 3.1s 说明 UNION 搜索仍需要进一步优化；当前 FULLTEXT 分支已命中索引，但标签分支和 UNION 临时表仍有成本。
- 搜索缓存开启后，重复查询会走 Redis，不会重复执行该 SQL。

### 5.5 压测结果

来自 `docs/BENCHMARK_PHASE1.md`：

| 场景 | 优化前 | 优化后 |
|---|---:|---:|
| 搜索 P95（缓存开启） | 约 6.19s | 约 2ms |
| 搜索冷缓存单次查询 | 约 6.19s | 0.3～0.6s |
| 搜索缓存命中率 | - | 99.98% |

---

## 6. 标签筛选执行计划

```sql
SELECT p.id
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
WHERE p.status = 'PUBLISHED' AND t.slug = 'bench-tag-0001'
ORDER BY p.published_at DESC
LIMIT 20 OFFSET 0;
```

`EXPLAIN FORMAT=JSON` 关键结果：

```text
t:  access_type=const, key=slug
p:  access_type=ref, key=idx_status_published, rows=22,817
pt: access_type=eq_ref, key=PRIMARY, rows=1
using_filesort=false
query_cost=13,528.08
```

说明：

- 标签通过 `slug` 唯一索引定位。
- 文章通过 `idx_status_published` 范围扫描。
- 关联表通过主键 `(post_id, tag_id)` 精确定位。
- 没有 filesort。

补充实验：使用 `STRAIGHT_JOIN` 强制从标签侧驱动，会扫描 37,030 条关联并产生 filesort，成本反而更高，因此保留优化器选择的执行顺序。

---

## 7. 索引验证

| 索引 | 表 | 用途 | 验证 |
|---|---|---|---|
| `idx_status_published` | `posts` | 已发布文章分页 | `ref`，无 filesort |
| `ft_posts_title_content` | `posts` | FULLTEXT 搜索 | `access_type=fulltext` |
| `idx_note_comments_note_created_at` | `note_comments` | 当前页评论批量查询 | `range`，200 行 |
| `idx_note_comments_parent` | `note_comments` | 评论树父子关系 | 已存在 |
| `uk_note_likes_note_user` | `note_likes` | 防止重复点赞 | 唯一约束 |
| `idx_tags_slug` / `slug` | `tags` | 标签筛选 | `const` |

---

## 8. Testcontainers 集成测试

新增：

- `src/test/java/com/aston/blog/integration/Phase1QueryIntegrationTest.java`

覆盖：

1. 文章两段式分页：ID 分页 + 作者/标签批量加载。
2. 标签筛选只返回已发布且带指定标签的文章。
3. FULLTEXT 中文搜索和 count。
4. 点赞 toggle 的真实数据库行为，重复操作不产生重复记录。

依赖：

- `org.testcontainers:testcontainers:1.21.4`
- `org.testcontainers:junit-jupiter:1.21.4`
- `org.testcontainers:mysql:1.21.4`

当前本机没有 Docker，Testcontainers 自动跳过：

```text
Tests run: 4, Failures: 0, Errors: 0, Skipped: 4
```

在有 Docker 的 CI 或开发机上运行：

```bash
mvn -Dtest=Phase1QueryIntegrationTest test
```

这会启动干净的 `mysql:8.0.36` 容器，执行 Flyway 迁移后跑测试。

---

## 9. 阶段 1 验收对照

| 验收标准 | 状态 | 证据 |
|---|---|---|
| 核心读接口不再出现明显 N+1 | ✅ | 笔记列表约 4 次 SELECT/请求；标签统计 1 次 GROUP BY |
| 分页查询不依赖内存分页 | ✅ | 两段式 ID 分页 + 批量加载 |
| 搜索能命中预期索引或 FULLTEXT | ✅ | UNION 后 FULLTEXT 分支 `access_type=fulltext` |
| 集成测试可在干净 MySQL 容器中运行 | 🟡 已提供，待 Docker 环境执行 | Testcontainers 测试已编译，本机无 Docker 自动跳过 |

---

## 10. 产物

| 文件 | 内容 |
|---|---|
| `src/main/java/com/aston/blog/repository/PostRepository.java` | 两段式分页、标签筛选、FULLTEXT UNION 搜索 |
| `src/main/java/com/aston/blog/Service/impl/PostServiceImpl.java` | 文章分页和搜索组装 |
| `src/main/java/com/aston/blog/Service/impl/NoteServiceImpl.java` | 笔记列表批量组装 |
| `src/main/java/com/aston/blog/Service/impl/TagServiceImpl.java` | 标签统计批量查询 |
| `src/main/resources/db/migration/V2__add_fulltext_search.sql` | FULLTEXT 索引 |
| `src/test/java/com/aston/blog/integration/Phase1QueryIntegrationTest.java` | Testcontainers 集成测试 |
| `docs/BENCHMARK_PHASE1.md` | 大数据量压测报告 |
| `docs/BENCHMARK_N1_2026-11-04.md` | 笔记 N+1 与索引报告 |
