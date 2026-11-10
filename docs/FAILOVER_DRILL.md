# 故障演练报告

> 最后更新：2026-11-10
> 范围：Redis、RabbitMQ、S3 兼容存储、Nginx、双 backend、优雅停机
> 原则：只记录真实执行过的演练；未完成项明确标为延期。

---

## 1. 演练结论

已完成：

- backend-1 宕机后 Nginx 自动切换；
- 双实例统一入口健康检查；
- Redis 停止后的核心页面回源和业务降级；
- RabbitMQ 停止 30 秒期间业务 fail-open；
- RabbitMQ 恢复后消费者自动重连；
- 重复 eventId 幂等；
- 坏消息进入 DLQ；
- DLQ 手工修复后重放；
- S3 兼容测试服务下的共享上传/读取、停止和恢复；`n- Rabbit listener 与 Tomcat 优雅停机；
- 单机 CPU 资源隔离下的单/双实例容量边界。

未完成：

- 真实 MinIO 上传、共享读取和停机恢复（本轮使用 S3 兼容替身）；
- 双实例 Prometheus/Grafana 实例级面板；
- Redis/RabbitMQ/MinIO 的完整自动化恢复时间矩阵；
- 两台独立应用节点 + 独立压测机扩容演练。

---

## 2. 环境

| 组件 | 部署 |
|---|---|
| 后端 | Windows，8081/8082 |
| Nginx | WSL，8088 |
| MySQL | Windows，3306 |
| Redis | WSL，6379 |
| RabbitMQ | WSL，5672/15672 |
| k6 | Windows |
| 数据 | `myblog` 和压测数据库 |

资源隔离实验：

```text
k6        -> CPU 0-3
backend-1 -> CPU 8-11
backend-2 -> CPU 12-15
```

---

## 3. 单实例宕机

### 操作

1. Nginx 正常运行双实例；
2. 停止 8081；
3. 连续请求 `8088`；
4. 观察响应和 Nginx upstream。

### 结果

| 项目 | 结果 |
|---|---|
| 请求成功率 | 20/20 |
| 错误率 | 0% |
| 切换目标 | backend-2 |
| 文章接口 | HTTP 200 |
| 健康检查 | HTTP 200 |

结论：通过。

证据：

- `PHASE2_RELIABILITY_REPORT.md`
- `PHASE4_EXECUTION_PLAN.md`

---

## 4. Redis 故障演练

### 操作

1. 预热文章列表、标签和详情缓存；
2. 停止 Redis；
3. 请求核心读接口；
4. 观察 fallback 指标；
5. 恢复 Redis。

### 结果

| 接口/功能 | Redis 停止时行为 |
|---|---|
| `GET /api/public/posts` | HTTP 200，回源 MySQL |
| `GET /api/public/tags` | HTTP 200，回源 MySQL |
| 文章详情 | HTTP 200，回源 MySQL |
| 在线人数 | HTTP 200，`online=0` |
| 错误密码登录 | HTTP 200，业务码 401，不变成 500 |
| 留言 | HTTP 200，限流 fail-open |

恢复后 `/actuator/health` 回到 UP。

证据：

- `CACHE_RESILIENCE.md`
- `REDIS_FAILURE_POLICIES.md`

风险：

- Redis 故障时 MySQL 压力上升；
- 登录防爆破和留言限流保护下降；
- 浏览量允许少计。

---

## 5. RabbitMQ 故障演练

### 操作

1. RabbitMQ 正常时投递访问日志事件；
2. 停止 RabbitMQ 30 秒；
3. 请求文章列表；
4. 恢复 RabbitMQ；
5. 观察消费者恢复和消息落库。

### 结果

| 项目 | 结果 |
|---|---|
| 停止期间文章列表 | 10/10 HTTP 200 |
| 生产端行为 | fail-open，publish failure 增加 |
| RabbitMQ 恢复 | 消费者自动重连 |
| 恢复后消息 | 继续写入 `visit_logs` |
| 重复 eventId | 数据库唯一键保证只有一行 |
| 批量消费 | batch size 20，20 条全部落库 |
| 非法消息 | 进入 `visit.log.write.dlq` |
| DLQ 重放 | 修复后重新投递成功 |
| 优雅停机 | listener 等待当前 worker 完成 |

证据：`RABBITMQ_VISIT_LOG.md`。

边界：

- RabbitMQ 停机期间的访问日志可能丢失；
- Publisher Confirm 只表示 Broker 接收，不表示 MySQL 已写入；
- 手动 ACK 必须在数据库事务提交之后；
- 当前重试是进程内重试，不是独立延迟队列。

---

## 6. 单实例 / 双实例性能边界演练

### 缓存开启

| 目标 RPS | 双实例 dropped | 单实例 dropped |
|---:|---:|---:|
| 1000 | 0 / 0 | 2107 / 948 |
| 1500 | 0 / 0 | 0 / 1320 |

### 缓存关闭

| 目标 RPS | 双实例 dropped | 单实例 dropped |
|---:|---:|---:|
| 500 | 0 / 0 | 47 / 143 |

结论：

- 双实例在获得额外 CPU 资源后更稳定；
- 单实例在高负载下更容易出现排队和 dropped iterations；
- 这不是两台独立服务器的线性扩容证明。

证据：`BENCHMARK_PHASE4_SCALING.md`。

---

## 7. 未完成演练

| 演练 | 状态 | 原因 |
|---|---|---|
| S3 兼容存储停止与恢复 | 已完成 | 验证 `MinioFileStorage` 的 S3 协议路径，见 `FAULT_MATRIX_RESULT.md` |`n| 真实 MinIO | 未完成 | 官方 MinIO 社区二进制已不可下载，未使用不可信旧包 |
| 双实例 Prometheus 实例标签 | 未完成 | 仅单实例验证 |
| 双实例定时任务互斥日志证据 | 部分完成 | 代码和分布式锁已接入，缺少双实例同时到点的完整日志归档 |
| Redis 长时间故障 | 未完成 | 当前只做了短时故障验证 |
| MySQL 故障 | 未完成 | MySQL 仍是单点，无高可用方案 |
| 两台独立应用节点 | 未完成 | 当前只有一台物理机 |
| 独立压测机 | 未完成 | k6 与被测系统共享资源 |

---

## 8. 恢复检查清单

- [x] Redis 已恢复，缓存命中率恢复；
- [x] RabbitMQ 已恢复，consumer count 正常；
- [x] 普通队列和 DLQ 无异常积压；
- [x] 8081 / 8082 健康检查均为 UP；
- [x] Nginx `nginx -t` 通过；
- [x] 压测配置已恢复为正常环境；
- [x] Redis DB 恢复为 0；
- [x] 访问日志、缓存预热、后台任务重新开启；
- [x] 无真实密码写入仓库。

---

## 9. 结论

当前项目已经具备：

- 可演示的双实例故障转移；
- 可解释的 Redis 降级；
- 可恢复的 RabbitMQ 异步链路；
- 可复现的单机性能测试。

但还不能声称：

- 生产级多可用区高可用；
- MySQL 高可用；
- MinIO 共享文件已完成验收；
- 两台独立服务器已经线性扩容。

本次单机故障矩阵的完整结果见 `docs/FAULT_MATRIX_RESULT.md`。`n`n这些是后续有资源后需要补齐的工程证据。
