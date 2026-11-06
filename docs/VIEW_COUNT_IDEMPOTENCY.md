# 浏览量刷库幂等改造

> 日期：2026-11-04  
> 目标：解决“MySQL 已累加、Redis 扣减前崩溃”导致浏览量重复计数的问题。

---

## 1. 原来的问题

原流程：

```text
GET  post:view:delta:<postId>          ← 读
UPDATE posts SET view_count += delta   ← 写 MySQL
Lua DECRBY delta                       ← 扣 Redis
```

“读 delta”和“扣 delta”不是原子操作，存在两个失败方向：

| 崩溃点 | 结果 |
|---|---|
| UPDATE 后、DECRBY 前 | 下次又读到同一份 delta，重复累加（多算） |
| DECRBY 后、UPDATE 前（若调换顺序） | delta 已扣，MySQL 没加（少算） |

分布式锁只能防“两个实例同时执行”，防不住“单实例执行到一半崩溃”。

---

## 2. 新设计

核心思路：**Redis 原子认领 delta 并生成 batchId，MySQL 用唯一键做幂等。**

```text
1. Lua 原子认领
   - GET delta
   - DEL delta key
   - HSET post:view:pending <batchId> "<postId>|<delta>"
   - 返回 delta

2. MySQL 事务
   - INSERT IGNORE view_count_flush_batch(batch_id, ...)
   - UPDATE posts SET view_count = view_count + delta
   - 同一事务提交

3. 删除 pending
   - HDEL post:view:pending <batchId>
```

### 2.1 为什么 batchId 在 Redis 认领时生成

如果 batchId 在 MySQL 侧生成，崩溃重试会生成新的 batchId，唯一键挡不住重复。

所以 batchId 必须在“认领 delta”这一步一次性生成，并随 pending 持久化。

### 2.2 为什么 INSERT IGNORE 能挡住重复

`batch_id` 是主键：

```sql
INSERT IGNORE INTO view_count_flush_batch
    (batch_id, post_id, delta, status, created_at, updated_at)
VALUES (?, ?, ?, 'DONE', NOW(), NOW());
```

- 第一次：插入成功，返回 1，继续 `UPDATE`。
- 重复：主键冲突被 `IGNORE`，返回 0，直接返回 `ALREADY_APPLIED`，**不执行 UPDATE**。

### 2.3 为什么 INSERT 和 UPDATE 必须在同一事务

如果先 INSERT 提交、再 UPDATE，中间崩溃会留下“批次已登记但浏览量没加”的记录，重试时 INSERT 返回 0，导致少算。

放在同一事务里：

- 事务提交：批次和浏览量同时生效。
- 事务回滚：两者都不生效，pending 保留，下次重做。

---

## 3. 崩溃恢复矩阵

| 崩溃点 | Redis pending | MySQL 批次 | 恢复行为 |
|---|---|---|---|
| 认领前 | 无 | 无 | 下一轮正常处理 |
| 认领后、MySQL 前 | 有 | 无 | 恢复任务重做，正常累加 |
| MySQL 事务中崩溃 | 有 | 无（回滚） | 恢复任务重做 |
| MySQL 提交后、删 pending 前 | 有 | 有 DONE | INSERT IGNORE 返回 0，只删 pending，不重复累加 |
| 删 pending 后 | 无 | 有 DONE | 已完成 |
| Redis 整体丢失 pending | 无 | 可能无 | 会少算（已知边界） |

---

## 4. 代码位置

| 文件 | 作用 |
|---|---|
| `V4__view_count_flush_batch.sql` | 批次表 |
| `ViewCountFlushBatch.java` | 批次实体 |
| `ViewCountFlushBatchRepository.java` | `INSERT IGNORE`、标记跳过、清理 |
| `ViewCountFlushService.java` | 幂等入口与结果枚举 |
| `ViewCountFlushServiceImpl.java` | 单事务内登记批次 + 累加浏览量 |
| `ViewCountFlushTask.java` | Lua 认领、pending 恢复、定时清理 |

### 4.1 认领脚本

```lua
local current = redis.call('GET', KEYS[1]);
if not current then return nil end;
local delta = tonumber(current);
if not delta or delta <= 0 then redis.call('DEL', KEYS[1]); return nil end;
redis.call('DEL', KEYS[1]);
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2] .. '|' .. delta);
return delta
```

Lua 在 Redis 内单线程执行，`GET`、`DEL`、`HSET` 之间不会插入其他命令。

### 4.2 任务流程

```text
flushViewCounts()
  ├── 获取分布式锁 task:view-count-flush
  ├── recoverPendingBatches()     ← 先恢复上次未完成批次
  ├── flushDeltaKeys()            ← 再认领并处理新 delta
  └── 释放锁
```

---

## 5. 验证结果

### 5.1 单元测试

- `ViewCountFlushTaskTest`：5 个用例
  - 正常认领并应用
  - 数据库失败保留 pending
  - 恢复 pending 批次
  - 已应用批次不重复累加
  - 非法 pending 载荷被清理
- `ViewCountFlushServiceImplTest`：3 个用例
  - 首次应用累加
  - 重复批次不再累加
  - 文章不存在标记 SKIPPED

全部通过。

### 5.2 真实数据库端到端

测试文章：`test-article-123`，初始 `view_count = 25075`。

**正常流程**

```text
INCR post:view:delta:<postId> 10
等待定时任务
结果：25075 → 25085
delta_key_exists = 0
pending_size = 0
batch_rows = 1
```

**崩溃场景 A：MySQL 已提交，pending 未删除**

手动把已存在的 batchId 重新写回 pending：

```text
view_count_before_recovery = 25085
pending_size = 1
等待定时任务
结果：view_count = 25085（未增加）
pending_size = 0
batch_rows = 1
```

说明重复批次被 `INSERT IGNORE` 挡住。

**崩溃场景 B：MySQL 尚未执行**

写入一个数据库里不存在的新 batchId：

```text
view_count_before = 25085
pending_size = 1
等待定时任务
结果：view_count = 25092（+7）
pending_size = 0
batch_rows = 2
```

说明未完成批次被正确重做。

---

## 6. 已知边界

1. **Redis 整体丢失**：pending 和 delta 都没了，会少算。浏览量允许这种误差。
2. **批次表增长**：每个批次一行，任务每天 03:30 清理 7 天前的已处理记录。
3. **锁 TTL 2 分钟**：单轮刷库必须远小于 2 分钟，否则锁过期后另一个实例可能进入。
4. **不是绝对精确**：这是“已提交批次不重复”的幂等，不是跨系统分布式事务。

---

## 7. 配置

```yaml
blog:
  visit-log:
    enabled: true
```

浏览量刷库没有单独开关，跟随 `@Scheduled` 运行。批次清理时间写死在代码中：

```java
@Scheduled(cron = "0 30 3 * * *")
```
