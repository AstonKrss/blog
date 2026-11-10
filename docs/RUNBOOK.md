# Aston's Blog 运行手册（Runbook）

> 最后更新：2026-11-10
> 适用环境：本地 Windows + WSL、单机 Docker Compose、双实例 Nginx 演练
> 安全原则：数据库、RabbitMQ、MinIO 密码只通过环境变量注入，不写入仓库。

---

## 1. 端口与进程

| 服务 | 端口 | 说明 |
|---|---:|---|
| 前端 Next.js | 3000 | 开发/生产前端 |
| 后端单实例 | 8080 | 常规开发 |
| backend-1 | 8081 | 双实例演练 |
| backend-2 | 8082 | 双实例演练 |
| Nginx | 8088 | 双实例统一入口 |
| MySQL | 3306 | 本地数据库 |
| Redis | 6379 | 无密码本地开发 |
| RabbitMQ AMQP | 5672 | 异步访问日志 |
| RabbitMQ Management | 15672 | 队列/连接/消费者 |
| MinIO API | 9000 | 可选共享文件 |
| MinIO Console | 9001 | 可选管理界面 |

---

## 2. 启动前检查

```powershell
java -version
mvn -version
node -v
npm -v
k6 version
```

检查外部依赖：

```powershell
curl.exe http://localhost:8080/actuator/health
curl.exe http://localhost:15672
```

如果使用 WSL 中的 Redis / RabbitMQ：

```bash
wsl.exe -- bash -lc "redis-cli ping"
wsl.exe -- bash -lc "sudo service rabbitmq-server status"
```

---

## 3. 单实例启动

```powershell
mvn spring-boot:run
```

健康检查：

```powershell
curl.exe http://localhost:8080/actuator/health
```

Prometheus 指标：

```powershell
curl.exe http://localhost:8080/actuator/prometheus
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

---

## 4. 双实例启动

### 4.1 打包

```powershell
mvn -f pom-bench.xml package -DskipTests
```

### 4.2 启动 8081 / 8082

```powershell
.\ops\multi-instance\start-backends.ps1
```

带 CPU 亲和性进行压测：

```powershell
.\ops\multi-instance\start-backends.ps1 `
  -Affinity1 0F00 `
  -Affinity2 F000 `
  -VisitLogEnabled:$false `
  -BackgroundTasksEnabled:$false `
  -RedisDatabase 1 `
  -CacheEnabled:$true
```

### 4.3 启动真实 Nginx

```powershell
.\ops\multi-instance\start-nginx-wsl.ps1
```

单 backend 模式：

```powershell
.\ops\multi-instance\start-nginx-wsl.ps1 -SingleBackend
```

验证：

```powershell
curl.exe http://127.0.0.1:8088/actuator/health
curl.exe "http://127.0.0.1:8088/api/public/posts?page=1&limit=1"
```

---

## 5. 压测

### 5.1 固定到达率单/双实例对照

缓存开启：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\ops\multi-instance\run-scaling-benchmark.ps1 `
  -Scenario cache-on -RatesCsv "1000,1500" -DurationSeconds 30
```

缓存关闭：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\ops\multi-instance\run-scaling-benchmark.ps1 `
  -Scenario cache-off -RatesCsv "200,500" -DurationSeconds 30
```

### 5.2 检查结果

结果目录：

```text
bench-data/scaling/<scenario>-<timestamp>/
  results.csv
  single-*.json
  dual-*.json
  *.out.log
  *.err.log
```

重点指标：

- `ActualRate`：实际到达率；
- `P50Ms/P95Ms/P99Ms`：延迟分位数；
- `DroppedIterations`：压测机或调度器未按时发起的迭代；
- `K6CpuSeconds`：k6 消耗 CPU；
- `JavaCpuSeconds`：JVM 消耗 CPU。

如果出现大量 dropped iterations，先检查：

1. k6 是否被 CPU 绑核过窄；
2. backend CPU 是否被限制；
3. MySQL/Redis/WSL 是否抢占；
4. 本机是否还有编译、Docker、浏览器等其他负载。

---

## 6. 健康与可观测性

| 目标 | 地址 |
|---|---|
| 应用健康 | `/actuator/health` |
| Prometheus 指标 | `/actuator/prometheus` |
| Grafana | 按本地 dashboard 配置 |
| RabbitMQ Management | `http://localhost:15672` |

关键指标：

```text
http_server_requests_seconds
hikaricp_connections_active
hikaricp_connections_pending
hikaricp_connections_timeout_total
cache_gets_total
cache_redis_fallbacks_total
rabbit_visit_publish_failures_total
rabbit_visit_consume_dlq_total
rabbit_queue_messages
```

---

## 7. 日志排查

日志目录：

```text
bench-data/logs/instance-8081.out.log
bench-data/logs/instance-8081.err.log
bench-data/logs/instance-8082.out.log
bench-data/logs/instance-8082.err.log
```

查看指定 traceId：

```powershell
Select-String -Path .\bench-data\logs\*.log -Pattern 'trace-id-from-response'
```

日志格式包含：

```text
[application,traceId]
```

请求入口会生成或透传 `X-Request-Id`。

---

## 8. Redis 故障处理

### 8.1 判断影响

- 核心页面缓存：应回源 MySQL；
- 在线人数：返回 0；
- 留言限流：fail-open；
- 登录失败计数/IP 封禁：fail-open；
- 浏览量：允许少计；
- 分布式锁：任务跳过本次执行并记录指标。

### 8.2 排查顺序

1. `/actuator/health` 是否 DOWN；
2. `cache_redis_fallbacks_total` 是否增长；
3. MySQL QPS 和 Hikari pending 是否升高；
4. Redis 恢复后缓存是否重新加载；
5. 若 Redis 长时间不可用，考虑临时关缓存或限流保护 MySQL。

验证文档：

- `CACHE_RESILIENCE.md`
- `REDIS_FAILURE_POLICIES.md`

---

## 9. RabbitMQ 故障处理

### 9.1 停止 RabbitMQ

```bash
wsl.exe -- bash -lc "sudo service rabbitmq-server stop"
```

预期：

- 业务接口仍返回 HTTP 200；
- `rabbit.visit.publish.failures` 增长；
- 访问日志可能丢失，因为生产端 fail-open。

### 9.2 恢复 RabbitMQ

```bash
wsl.exe -- bash -lc "sudo service rabbitmq-server start"
```

检查：

```bash
wsl.exe -- bash -lc "sudo rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers"
```

预期：

- consumer count 恢复为两个；
- 恢复后新消息继续落库；
- DLQ 数量不持续增长。

### 9.3 DLQ

队列：

```text
visit.log.write
visit.log.write.dlq
```

处理原则：

1. 查看 DLQ 消息头和 payload；
2. 修复非法 eventId、格式或数据库问题；
3. 保留 eventId，重新投递正常队列；
4. 确认 `visit_logs` 唯一键没有重复行；
5. 记录 DLQ 重放结果。

详细步骤见 `RABBITMQ_VISIT_LOG.md`。

---

## 10. Nginx / backend 故障转移

### 10.1 停 backend-1

```powershell
$p = Get-NetTCPConnection -LocalPort 8081 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess
Stop-Process -Id $p -Force
```

验证：

```powershell
curl.exe http://127.0.0.1:8088/api/public/posts?page=1&limit=1
```

预期：请求由 backend-2 处理，接口返回 HTTP 200。

### 10.2 恢复

```powershell
.\ops\multi-instance\start-backends.ps1
```

### 10.3 检查 Nginx

```powershell
wsl.exe -- bash -lc "nginx -t"
wsl.exe -- bash -lc "nginx -s reload"
```

---

## 11. 优雅停机

发送 Ctrl+C 或正常停止进程，观察：

```text
Graceful shutdown
Waiting for workers to finish
Rabbit listener shutdown complete
Tomcat graceful shutdown complete
```

不要在测试中直接断电式 `kill -9`，除非明确要验证非优雅故障。

---

## 12. 压测后恢复环境

```powershell
.\ops\multi-instance\start-backends.ps1 `
  -RedisDatabase 0 `
  -CacheEnabled:$true `
  -VisitLogEnabled:$true `
  -BackgroundTasksEnabled:$true

.\ops\multi-instance\start-nginx-wsl.ps1
```

验证：

```powershell
curl.exe http://127.0.0.1:8088/actuator/health
curl.exe "http://127.0.0.1:8088/api/public/posts?page=1&limit=1"
```

---

## 13. 禁止事项

- 不要把数据库、RabbitMQ、MinIO 密码写进脚本、README 或 Git；
- 不要在 MySQL 压力未知时盲目调大 Hikari 连接数；
- 不要用单机双 JVM 结果宣称生产线性扩容；
- 不要在没有 DLQ 重放验证时声称消息零丢失；
- 不要把 Testcontainers 跳过当成容器测试通过；
- 不要在未恢复 Redis/RabbitMQ 的情况下直接结束演练。
