# 直接 Redis 操作的故障策略

> 日期：2026-11-06  
> 范围：在线人数、留言限流、登录防爆破、分布式锁  
> 原则：不同业务使用不同故障语义，不把 Spring Cache 的读降级套到所有 Redis 操作上。

---

## 1. 策略总览

| 操作 | Redis 正常 | Redis 故障 | 指标 |
|---|---|---|---|
| 在线人数标记 | 写入在线 IP 标记 | 记录失败，不影响请求 | `redis.online.mark.failures` |
| 在线人数统计 | SCAN 在线 key | 返回 0 | `redis.online.count.failures` |
| 留言限流 | INCR 计数 | fail-open，允许留言 | `redis.rate_limit.failures{scope=guestbook}` |
| 登录防爆破 | Redis 失败计数和 IP 封禁 | fail-open，允许登录，安全保护暂时失效 | `redis.login_guard.failures` / `redis.login_guard.fail_open` |
| 分布式锁 | SET NX PX 获取锁 | 跳过本轮任务，等待下一轮 | `redis.lock.failures` / `redis.lock.skipped` |

---

## 2. 在线人数

### 2.1 标记失败

`VisitLogServiceImpl.logVisit()` 原来就有 catch，但失败不可观测。现在增加：

```text
redis.online.mark.failures
```

行为：

```text
Redis SET 失败
-> 记录指标
-> 记录 warn
-> 不影响访问日志和正常请求
```

### 2.2 统计失败

`countOnlineVisitors()` 在 Redis SCAN 失败时继续返回 0：

```text
redis.online.count.failures
```

这是可接受的降级，因为在线人数不是强一致业务数据。

---

## 3. 留言限流

`GuestbookController.isRateLimited()` 保持 fail-open：

```text
Redis INCR 失败
-> redis.rate_limit.failures{scope=guestbook} + 1
-> 记录 warn
-> 返回 false，允许留言
```

取舍：Redis 故障期间留言限流暂时失效，但留言功能仍可用。

---

## 4. 登录失败计数和 IP 封禁

采用 fail-open：

| 操作 | Redis 故障行为 | 指标 operation |
|---|---|---|
| 查询 IP 是否封禁 | 返回 false，允许继续登录 | `blocked_check` |
| 查询是否暴力破解 | 返回 false | `check` |
| 记录登录失败/成功 | DB 日志照常保存，Redis 更新失败不影响请求 | `record` |
| 写入 IP 封禁 | 只记录日志和指标，不抛异常 | `block` |

指标：

```text
redis.login_guard.failures{operation}
redis.login_guard.fail_open{operation}
```

取舍：Redis 故障期间防爆破保护暂时失效，但管理员不会被 Redis 故障锁在门外。该风险应通过告警发现。

---

## 5. 分布式锁

`RedisDistributedLock` 保持“失败就跳过任务”：

```text
获取锁失败/Redis 异常
-> 返回 null
-> 任务本轮跳过
-> 下一轮继续尝试
```

指标：

```text
redis.lock.failures{operation=acquire|release,lock}
redis.lock.skipped{lock,reason=held}
```

不能 fail-open：两个实例同时拿不到分布式锁时如果都执行任务，会破坏幂等前提。

---

## 6. 真实故障验证

停止 Redis 后验证：

| 接口/行为 | 结果 |
|---|---|
| `GET /api/public/online` | HTTP 200，`online=0` |
| 错误密码登录 | HTTP 200，业务码 401，没有变成 500 |
| `POST /api/guestbook` | HTTP 200，留言成功，限流 fail-open |
| 定时任务获取锁 | 记录 lock failure，任务跳过 |
| `liveness/readiness` | UP |

Prometheus 实际指标：

```text
redis_online_mark_failures_total 1
redis_online_count_failures_total 1
redis_rate_limit_failures_total{scope="guestbook"} 1
redis_login_guard_failures_total{operation="blocked_check"} 1
redis_login_guard_failures_total{operation="check"} 1
redis_login_guard_failures_total{operation="record"} 1
redis_lock_failures_total{operation="acquire",lock="task:view-count-flush"} 1
```

验证完成后已恢复 Redis，`/actuator/health` 回到 `UP`。

---

## 7. 测试

完整测试：

```text
81 个测试
0 失败
0 错误
4 个 Testcontainers 用例因本机无 Docker 跳过
```

新增/更新测试覆盖：

- 登录防护 Redis 异常 fail-open。
- IP 封禁查询 Redis 异常返回 false。
- 登录尝试 DB 日志保存后 Redis 失败不抛异常。
- 分布式锁获取失败/持锁跳过/释放失败。
- 留言限流 Redis 失败 fail-open。

---

## 8. 已知边界

- 登录防爆破在 Redis 故障期间保护能力下降，需要监控和告警。
- 在线人数在 Redis 故障时显示 0，是用户体验上的近似值。
- 分布式锁失败时任务跳过，不保证本轮立即执行；下一轮会重试。
- 这些都是“可用性优先”的策略，不适合直接套到支付、库存等强一致场景。
