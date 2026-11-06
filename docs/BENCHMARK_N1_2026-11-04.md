# 笔记列表 N+1 与索引压测报告

> 日期：2026-11-04  
> 测试库：`myblog_bench`（独立测试库，未修改 `myblog`）  
> 被测接口：`GET /api/public/notes?page=0&limit=20`  
> 后端：Spring Boot 4.0.5 / Java 23 / 端口 8081  
> 数据库：MySQL 8.0.12  
> 慢查询阈值：`long_query_time = 0.7s`

---

## 1. 测试目标

本轮测试回答三个问题：

1. 笔记列表 N+1 修复后，一次请求实际执行多少条 SQL？
2. 数据量增大后，接口 P95/P99 和吞吐量是多少？
3. 当前 0.7 秒慢查询阈值下，是否出现真实业务慢查询？

---

## 2. 测试数据

在 `myblog_bench` 中生成：

| 表 | 行数 |
|---|---:|
| `users` | 10,000 |
| `notes` | 10,000 |
| `note_comments` | 100,000 |
| `note_likes` | 10,000 |

评论结构：

- 每条笔记 10 条评论。
- 其中 8 条根评论。
- 前 2 条根评论各有 1 条子评论。
- 接口每篇只返回前 3 条根评论，子评论保留。

造数脚本：

- `loadtest/sql/seed-notes-bench.sql`
- `loadtest/sql/add-note-indexes.sql`

---

## 3. 测试场景

### 3.1 顺序请求

连续请求 20 次：

```text
GET /api/public/notes?page=0&limit=20
```

记录：

- HTTP 延迟
- `Com_select` 增量
- `Slow_queries` 增量

### 3.2 k6 并发压测

脚本：

```text
build-bench/notes-smoke.js
```

场景：

| 场景 | VU | 时长 |
|---|---:|---:|
| 低并发 | 10 | 10s |
| 高并发 | 50 | 20s |

### 3.3 索引前后对比

先在无二级索引的 `myblog_bench` 上测试，再补充：

```sql
CREATE INDEX idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX idx_notes_author_created_at ON notes (author_id, created_at DESC);
CREATE INDEX idx_note_comments_note_created_at ON note_comments (note_id, created_at ASC);
CREATE INDEX idx_note_comments_parent ON note_comments (parent_id);
CREATE UNIQUE INDEX uk_note_likes_note_user ON note_likes (note_id, user_id);
CREATE INDEX idx_note_likes_user ON note_likes (user_id);
```

---

## 4. 无索引结果

### 4.1 顺序请求 20 次

```text
HTTP 200：20/20
Com_select 增量：83
平均每次请求 SELECT：约 4.15 次
最小延迟：60.36 ms
平均延迟：70.55 ms
P95：95.58 ms
最大延迟：95.62 ms
Slow_queries 增量：0
```

### 4.2 k6 10 VU × 10s

```text
请求数：562
吞吐：55.35 req/s
平均延迟：77.97 ms
P95：117.02 ms
P99：140.80 ms
最大延迟：153.17 ms
错误率：0%
Slow_queries 增量：0
```

### 4.3 批量评论 SQL

`performance_schema` 统计：

```text
执行次数：21
平均耗时：49.768 ms
扫描行数合计：2,104,200
平均每次扫描：约 100,200 行
```

执行计划（模拟无索引）：

```text
access_type: ALL
rows_examined_per_scan: 99,331
using_filesort: true
query_cost: 59,815.60
```

说明：虽然 N+1 已经修复为一次批量查询，但 `note_comments.note_id` 没有索引时，这一条批量查询仍然要全表扫描约 10 万行。

---

## 5. 加索引后结果

### 5.1 顺序请求 20 次

```text
HTTP 200：20/20
Com_select 增量：83
平均每次请求 SELECT：约 4.15 次
最小延迟：7.94 ms
平均延迟：9.53 ms
P95：11.52 ms
最大延迟：14.18 ms
Slow_queries 增量：0
```

### 5.2 k6 10 VU × 10s

```text
请求数：910
吞吐：90.75 req/s
平均延迟：9.22 ms
P95：13.98 ms
P99：17.09 ms
最大延迟：18.06 ms
错误率：0%
Slow_queries 增量：0
```

### 5.3 k6 50 VU × 20s

```text
请求数：9,270
吞吐：461.48 req/s
平均延迟：7.51 ms
P95：11.01 ms
P99：19.15 ms
最大延迟：58.99 ms
错误率：0%
Slow_queries 增量：0
```

### 5.4 加索引后的 SQL 统计

重置 `performance_schema` 后执行 20 次请求：

| SQL | 执行次数 | 平均耗时 | 扫描行数 |
|---|---:|---:|---:|
| 笔记分页 | 20 | 0.237 ms | 400 |
| 笔记 count | 20 | 1.222 ms | 0 |
| 批量评论 | 20 | 1.202 ms | 4,000 |
| 评论作者 | 20 | 0.385 ms | 580 |

合计：

```text
80 次 SELECT / 20 次请求 = 4 次 SELECT/请求
```

批量评论查询每次扫描 200 行，正好对应：

```text
20 条笔记 × 10 条评论 = 200 条评论
```

执行计划：

```text
access_type: range
key: idx_note_comments_note_created_at
rows_examined_per_scan: 200
using_filesort: false
query_cost: 95.01
```

---

## 6. 索引前后对比

| 指标 | 无索引 | 有索引 | 变化 |
|---|---:|---:|---:|
| 顺序请求平均延迟 | 70.55 ms | 9.53 ms | 下降约 86% |
| 顺序请求 P95 | 95.58 ms | 11.52 ms | 下降约 88% |
| k6 10 VU 平均延迟 | 77.97 ms | 9.22 ms | 下降约 88% |
| k6 10 VU P95 | 117.02 ms | 13.98 ms | 下降约 88% |
| k6 10 VU 吞吐 | 55.35 req/s | 90.75 req/s | 提升约 64% |
| 批量评论扫描行数 | 约 100,200 行/次 | 200 行/次 | 下降约 99.8% |
| 批量评论平均耗时 | 49.768 ms | 1.202 ms | 下降约 97.6% |
| filesort | 有 | 无 | 消除 |

---

## 7. 高并发无索引补充实验

为了观察无索引在高并发下的表现，临时删除：

```sql
idx_note_comments_note_created_at
```

运行 50 VU × 20s：

```text
请求数：2,035
吞吐：99.72 req/s
平均延迟：395.26 ms
P90：517.55 ms
P95：557.05 ms
P99：700.20 ms
最大延迟：908.86 ms
错误率：0%
Slow_queries 增量：0
```

结论：

- 无索引 + 50 VU 时，HTTP P95 已经超过 500ms，P99 达到 700ms。
- 但 `Slow_queries` 仍然没有增加。
- 原因是慢查询日志统计的是**单条 SQL 执行时间**，不是 HTTP 请求总耗时。
- 这里的主要问题是大量全表扫描、并发排队和连接池等待，而不是单条 SQL 超过 0.7 秒。

实验结束后已恢复索引，并重新跑 10 VU 回归：

```text
P95：9.27 ms
错误率：0%
```

---

## 8. 慢查询日志结果

测试期间 `Slow_queries` 从 1 增加到 2，但两条都不是业务 SELECT：

1. 之前用于验证功能的 `SELECT SLEEP(1)`，耗时 1.009362s。
2. 造数脚本的 `INSERT INTO note_comments`，耗时 1.458843s。

日志文件：

```text
D:\php_study\phpstudy_pro\Extensions\MySQL8.0.12\data\fang-slow.log
```

结论：

> 在当前数据量、当前索引和 0.7 秒阈值下，没有出现业务接口产生的慢查询。

---

## 9. N+1 修复效果

改造前，一页 20 条笔记、每条 10 条评论时，理论 SQL 次数：

```text
1 次笔记分页
+ 1 次 count
+ 20 次评论查询
+ 20 次评论作者查询
= 约 42 次 SELECT/请求
```

改造后实际：

```text
4 次 SELECT/请求
```

其中：

- 1 次笔记分页
- 1 次 count
- 1 次批量评论
- 1 次批量评论作者

说明 N+1 已经从“随页大小线性增长”变成“固定次数”。

---

## 10. 结论与限制

### 结论

1. 笔记列表 N+1 已修复，实测约 4 次 SELECT/请求。
2. `note_comments(note_id, created_at)` 索引非常关键，批量评论查询从全表扫描约 10 万行降到 200 行。
3. 加索引后，10 VU P95 约 14ms，50 VU P95 约 11ms，错误率 0%。
4. 0.7 秒慢查询阈值下，没有业务 SELECT 慢查询。
5. HTTP 慢不等于 SQL 慢；无索引高并发时 P99 超过 700ms，但单条 SQL 仍未达到 0.7 秒。

### 限制

- 本地单机测试，不是生产网络和生产硬件。
- 数据是均匀造数，真实数据通常有热点和长尾。
- 索引前后测试时 buffer pool 已预热，不是完全冷缓存对比。
- MySQL 8.0.12 不支持 `EXPLAIN ANALYZE`，本轮使用 `EXPLAIN FORMAT=JSON`。
- 单篇详情和评论列表接口需要登录，本轮未做匿名访问测试；公开列表已验证前 3 条根评论和子评论结构。

---

## 11. 产物

| 文件 | 用途 |
|---|---|
| `loadtest/sql/seed-notes-bench.sql` | 生成 10k 笔记 / 100k 评论 / 10k 点赞 |
| `loadtest/sql/add-note-indexes.sql` | 为测试库补笔记相关索引 |
| `build-bench/notes-smoke.js` | 笔记列表 k6 脚本 |
| `build-bench/notes-bench-before-index-summary.json` | 无索引 10 VU 结果 |
| `build-bench/notes-bench-after-index-summary.json` | 有索引 10 VU 结果 |
| `build-bench/notes-bench-50vu-summary.json` | 有索引 50 VU 结果 |
| `build-bench/notes-bench-50vu-no-index-summary.json` | 无索引 50 VU 结果 |
| `build-bench/notes-bench-after-restore-summary.json` | 恢复索引后的回归结果 |
---

## 12. Hikari 连接池补充采样

笔记列表在 100 VU 下暴露出连接池等待：

| 场景 | 最大 pending | 获取连接平均 | 获取连接最大 | HTTP P95 | HTTP P99 |
|---|---:|---:|---:|---:|---:|
| 10 连接 / 100 VU | 23 | 1.611 ms | 149.636 ms | 71.45 ms | 124.10 ms |
| 20 连接 / 100 VU | 0 | 0.061 ms | 74.730 ms | 40.64 ms | 66.61 ms |
| min10/max20 / 100 VU | 0 | 0.128 ms | 104.986 ms | 55.71 ms | 97.59 ms |
| min10/max20 / 150 VU | 5 | 0.106 ms | 104.986 ms | 49.30 ms | 81.68 ms |

结论：连接池 10 在 100 VU 下饱和；调到 20 后 pending 消失，P95/P99 明显下降。最终采用 `minimum-idle=10`、`maximum-pool-size=20`：100 VU 下无 pending，150 VU 下仅出现少量 pending。

完整采样方法和原始结果见 `docs/HIKARI_POOL_SAMPLING.md`。


