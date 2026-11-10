# 单机故障矩阵结果

> 日期：2026-11-10
> 环境：单台 Windows 电脑，双 Spring Boot 实例 + WSL Nginx/Redis/RabbitMQ
> 文件存储：S3 兼容测试服务（不是实际 MinIO 二进制）

---

## 1. 结论

单机应用级故障矩阵已完成：

| 故障 | 结果 |
|---|---|
| Redis 停止 | 核心读接口和留言均 HTTP 200，回源 MySQL |
| Redis 恢复 | PONG，双实例继续服务 |
| RabbitMQ 停止 | 10/10 业务请求 HTTP 200，发布失败指标增加 10 |
| RabbitMQ 恢复 | 消费者恢复为 2 个 |
| 坏消息 | 成功路由到 `visit.log.write.dlq` |
| S3 兼容存储停止 | 上传失败、读取旧对象失败 |
| S3 兼容存储恢复 | 上传恢复，跨实例读取哈希一致 |
| 优雅停机 | Rabbit listener 等待 worker，Tomcat/Hikari 正常关闭 |
| backend-1 宕机 | Nginx 切换，20/20 HTTP 200 |

不能据此声明：

- 真实多机高可用；
- 真实物理机宕机自动恢复；
- 真实 MinIO 已完成端到端验收；
- MySQL 已具备高可用；
- 跨主机网络分区已覆盖。

---

## 2. Redis 故障

### 操作

1. 停止 WSL Redis service；
2. 请求文章列表、标签、在线人数；
3. POST 留言；
4. 恢复 Redis。

### 结果

| 接口 | HTTP | 耗时 |
|---|---:|---:|
| `/api/public/posts` | 200 | 9308.29 ms |
| `/api/public/tags` | 200 | 2667.19 ms |
| `/api/public/online` | 200 | 2040.93 ms |
| `POST /api/guestbook` | 200 | 2448.24 ms |

恢复后：

```text
redis_after=PONG
```

### 解读

- 核心页面缓存读路径成功回源 MySQL；
- 留言限流在 Redis 故障时 fail-open；
- 在线人数故障时返回近似值；
- Redis 故障时接口虽然可用，但延迟明显上升，说明 MySQL 和连接池压力会变大。

原始文件：

```text
bench-data/fault-matrix-redis.json
```

---

## 3. RabbitMQ 故障与 DLQ

### 3.1 停服

执行：

```text
停止 RabbitMQ
  -> 请求 10 次文章列表
  -> 读取 publish failure 指标
  -> 恢复 RabbitMQ
```

结果：

| 项目 | 结果 |
|---|---:|
| 业务请求 HTTP 200 | 10/10 |
| `rabbit.visit.publish.failures` 增量 | 10 |
| 恢复后 `visit.log.write` consumers | 2 |
| 恢复后 ready/unacked | 0/0 |

结论：

- 访问日志生产端 fail-open 生效；
- RabbitMQ 停止不会阻断文章页面；
- 恢复后消费者自动重连；
- 停机期间访问日志允许丢失，符合当前 ADR 取舍。

### 3.2 坏消息进入 DLQ

通过 RabbitMQ Management API 向 `blog.events` 发布一条缺少 `eventId` 的消息，routing key 为 `visit.recorded`。

结果：

```text
publish_response={"routed":true}
visit.log.write     consumers=2 messages_ready=0 messages_unacknowledged=0
visit.log.write.dlq consumers=0 messages_ready=1 messages_unacknowledged=0
```

随后已清理该测试消息，DLQ 回到 0。

原始文件：

```text
bench-data/fault-matrix-rabbit.json
```

---

## 4. S3 兼容存储故障

### 4.1 重要说明

2026-11-10 官方 `dl.min.io` 对 MinIO 社区版二进制返回 `410 Gone`，官方说明社区项目已归档，不再提供下载。

因此本轮使用 `moto 5.2.5` 作为 **S3 兼容测试服务**：

- 验证 `MinioFileStorage` 的 S3 Signature V4、bucket 创建、PUT、GET 代码路径；
- 不把它写成“真实 MinIO 已验证”；
- 真实 MinIO 端到端验收继续延期；
- 不引入不可信来源的旧二进制。

### 4.2 共享存储正常路径

| 操作 | 结果 |
|---|---|
| backend-1 上传 | HTTP 200，业务 code=0 |
| backend-2 读取 | HTTP 200 |
| SHA-256 | 上传文件与读取文件一致 |

这证明两个应用实例指向同一个 S3 bucket，文件 URL 不依赖单个 backend 的本地目录。

### 4.3 存储服务停止

停止 S3 兼容测试服务后：

| 操作 | 结果 |
|---|---|
| 上传图片 | HTTP 400，`操作失败，请稍后重试` |
| 读取旧对象 | HTTP 404 |

说明当前应用把存储异常转换为统一业务错误，而不是让进程崩溃。

### 4.4 存储服务恢复

恢复 S3 兼容测试服务后：

- 新上传 HTTP 200，业务 code=0；
- 通过另一个 backend 读取 HTTP 200；
- 文件哈希一致。

### 4.5 限制

- `moto` 是内存测试服务，重启后对象不持久；
- 本次验证的是 S3 协议和 `MinioFileStorage` 代码路径；
- 真实 MinIO 的磁盘持久化、桶策略、跨主机网络和服务进程模型仍未验证。

原始文件：

```text
bench-data/fault-matrix-storage-shared.json
bench-data/fault-matrix-storage-down.json
bench-data/fault-matrix-storage-recovery.json
bench-data/fault-matrix-storage-recovered-read.json
```

---

## 5. 优雅停机

### 操作

启动临时 8090 实例，启用 shutdown 端点，使用测试 JWT 调用：

```text
POST /actuator/shutdown
```

### 结果

```text
HTTP 200
{"message":"Shutting down, bye..."}
port 8090 listening = false
```

日志包含：

```text
SimpleMessageListenerContainer: Waiting for workers to finish.
SimpleMessageListenerContainer: Successfully waited for workers to finish.
GracefulShutdown: Commencing graceful shutdown. Waiting for active requests to complete
GracefulShutdown: Graceful shutdown complete
HikariPool-1 - Shutdown initiated...
HikariPool-1 - Shutdown completed.
```

结论：

- Rabbit listener 有等待 worker 的窗口；
- Tomcat graceful shutdown 完成；
- Hikari 正常关闭；
- shutdown 端点默认被 Spring Security 保护，测试使用测试 JWT 才可访问。

原始文件：

```text
bench-data/fault-matrix-graceful.json
bench-data/logs/shutdown-8090.out.log
```

---

## 6. backend-1 宕机与 Nginx 故障切换

### 操作

1. 强制停止监听 8081 的 backend-1；
2. 通过 8088 连续请求 20 次文章列表；
3. 检查 HTTP 状态和延迟。

### 结果

| 指标 | 结果 |
|---|---:|
| 总请求 | 20 |
| HTTP 200 | 20 |
| 失败 | 0 |
| P95 | 3016.20 ms |
| 前两次切换请求 | 约 3.0～3.2 s |
| 其余请求 | 多在 10～36 ms |

结论：

- Nginx 能自动切换到 backend-2；
- 请求不返回 5xx；
- 首次故障检测有约 3 秒切换成本；
- 可通过调整 Nginx 被动健康检查、upstream keepalive 和连接超时进一步降低切换时间。

原始文件：

```text
bench-data/fault-matrix-failover.json
```

---

## 7. 环境恢复验证

演练结束后已确认：

```text
Redis: PONG
RabbitMQ visit.log.write consumers: 2
RabbitMQ ready/unacked: 0/0
visit.log.write.dlq: 0
Nginx /actuator/health: 200
Nginx /api/public/posts: 200
backend-1: 200
backend-2: 200
S3 测试服务: 已停止
应用存储模式: 恢复 local
访问日志/后台任务: 恢复开启
```

---

## 8. 本次完成与延期

### 已完成

- [x] Redis 停止/恢复；
- [x] RabbitMQ 停止/恢复；
- [x] RabbitMQ 坏消息进入 DLQ；
- [x] 双实例共享 S3 兼容存储；
- [x] S3 兼容存储停止/恢复；
- [x] 优雅停机；
- [x] backend-1 宕机 Nginx 切换；
- [x] 演练后环境恢复。

### 延期

- [ ] 真实 MinIO 端到端；
- [ ] 物理主机宕机；
- [ ] 网络分区；
- [ ] 两台独立应用节点 + 独立压测机；
- [ ] MySQL 高可用；
- [ ] 双实例 Prometheus/Grafana 实例级面板；
- [ ] MinIO 持久化和桶策略验证。

---

## 9. 面试安全表述

可以说：

> 在单机应用级故障矩阵中验证 Redis 缓存回源、RabbitMQ fail-open 与自动重连、DLQ、双实例共享 S3 兼容存储、Spring Boot 优雅停机和 Nginx 故障切换；RabbitMQ 停服期间 10/10 业务请求成功，backend-1 宕机时 20/20 请求成功切换。

不能说：

> 已完成真实多机高可用、真实 MinIO 和 MySQL 高可用验证。
