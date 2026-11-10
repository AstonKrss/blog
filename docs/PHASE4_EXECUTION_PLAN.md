# 阶段 4 执行计划：多实例部署与故障演练

> 日期：2026-11-09  
> 前置状态：阶段 0～3 已完成  
> 目标：把当前“可演示的多实例基础”提升为“可复现的双实例部署与故障演练”  
> 当前完成度：约 75%（单机可验证部分完成，生产级多机项延期）

---

## 执行进度（2026-11-09）

### Step 0 已完成

- MySQL 已在 Windows 运行。
- Redis 已在 WSL 运行，Windows 通过 localhost relay 访问。
- RabbitMQ 已在 WSL 运行，Windows 通过 localhost relay 访问。
- 两个 backend 实例使用同一个 jar 启动：
  - backend-1：`8081`
  - backend-2：`8082`
- RabbitMQ `visit.log.write` 当前有 2 个消费者。
- 启动脚本已去除硬编码数据库密码，并启用 RabbitMQ 访问日志和队列指标。

### Step 1 已完成

- 在 WSL 安装并使用真实 Nginx。
- 使用 `nginx -t` 验证配置。
- Nginx 监听 `8088`，转发到 Windows 宿主机上的两个后端实例。
- 修复 `/actuator/health` location 缺少 `proxy_set_header` 导致 Tomcat 拒绝 Host 的问题。
- 验证：
  - Nginx 文章接口 HTTP 200；
  - Nginx 健康检查 HTTP 200；
  - 停止 backend-1 后，Nginx 自动切换到 backend-2，接口仍 HTTP 200；
  - 恢复 backend-1 后双实例健康检查均为 UP。

### Step 2～5 单机可验证部分（2026-11-10）

- 新增固定到达率 k6 场景 `loadtest/k6/stage4-constant.js`。
- 新增 CPU 亲和性压测脚本 `ops/multi-instance/run-scaling-benchmark.ps1`。
- 启动脚本支持缓存开关与 CPU 亲和性。
- k6 固定 CPU 0-3；backend-1 固定 CPU 8-11；backend-2 固定 CPU 12-15。
- 缓存开启：1000/1500 RPS 各两轮；双实例均 0 dropped iterations，单实例多次掉迭代。
- 缓存关闭：200/500 RPS；500 RPS 两轮中双实例 0 dropped，单实例分别 47/143 次 dropped。
- 完整结果和限制：`docs/BENCHMARK_PHASE4_SCALING.md`。

### 延期项

- 真实 MinIO 上传/读取和双实例共享文件；
- 双实例 Prometheus/Grafana 标签与面板；
- Redis/RabbitMQ/MinIO/优雅停机完整故障矩阵；
- 独立压测机和两台独立应用节点；
- 每场景至少 3 轮的正式容量实验。

## 1. 目标与原则

### 目标

在**不拆微服务**的前提下，验证同一个 Spring Boot 制品可以运行两个实例，并共享：

```text
MySQL
Redis
RabbitMQ
MinIO（共享文件）
Prometheus / Grafana
```

同时完成真实反向代理、共享存储、任务防重、指标观测和故障矩阵。

### 原则

1. 保持模块化单体，不为简历硬拆服务。
2. 双实例使用同一个 jar，只通过端口和环境变量区分。
3. JWT 保持无状态，不引入 Sticky Session。
4. 所有状态必须外置：数据库、Redis、RabbitMQ、MinIO。
5. 每个故障场景必须记录请求成功率、恢复时间和数据一致性。
6. 不做没有观测和报告的“看起来能跑”。

---

## 2. 当前已具备资产

| 资产 | 位置 | 状态 |
|---|---|---|
| Nginx 双实例配置 | `ops/nginx/nginx.conf` | 已编写并通过真实 Nginx `nginx -t`、双实例代理、单实例宕机切换验证 |
| 双实例启动脚本 | `ops/multi-instance/start-backends.ps1` | 已更新，启用 RabbitMQ 访问日志和队列指标，去除硬编码数据库密码 |
| 故障演练脚本 | `ops/multi-instance/drill.ps1` | 已有 Node 替代代理演练，需改真实 Nginx |
| Node failover proxy | `ops/multi-instance/failover-proxy.js` | 仅用于无 Nginx 环境的等价验证 |
| MinIO 存储抽象 | `src/main/java/com/aston/blog/storage/` | 已实现，真实上传未端到端验证 |
| Redis 分布式锁 | `src/main/java/com/aston/blog/config/RedisDistributedLock.java` | 已实现并接入任务 |
| 优雅停机 | `application.yml` + Rabbit listener factory | 已验证 |
| RabbitMQ 队列指标 | `RabbitQueueMetrics` | 已实现 |
| Prometheus/Grafana | `ops/observability/` | 单实例已验证，双实例需补 scrape 配置 |

---

## 3. 目标拓扑

```text
                    ┌────────────┐
                    │   Nginx    │
                    │  reverse   │
                    │   proxy    │
                    └──┬─────┬───┘
                       │     │
              ┌────────┘     └────────┐
              ▼                       ▼
        Spring Boot 8081       Spring Boot 8082
              │                       │
              └──────────┬────────────┘
                         │
     ┌──────────┬────────┼────────┬────────────┐
     ▼          ▼        ▼        ▼            ▼
   MySQL      Redis   RabbitMQ   MinIO    Prometheus
                                          / Grafana
```

生产形态仍然是同一个应用制品，只是横向复制两个进程。

---

## 4. 分步执行计划

### 4.1 Step 0：环境与端口基线（P0）

预计时间：0.5 天。

任务：

1. 确认 MySQL、Redis、RabbitMQ、MinIO、Nginx 的运行方式。
2. 固定端口：
   - backend-1：`8081`
   - backend-2：`8082`
   - Nginx：`8088`
   - RabbitMQ AMQP：`5672`
   - RabbitMQ Management：`15672`
   - MinIO API：`9000`
   - MinIO Console：`9001`
3. 检查 Windows ↔ WSL 的 localhost 转发。
4. 建立统一环境变量文件，避免脚本里散落配置。

验收：

- 两个后端实例都能启动；
- 两实例都连接同一个 MySQL/Redis/RabbitMQ；
- 两实例健康检查均为可用状态；
- RabbitMQ 管理页能看到两个 backend 连接或消费者。

---

### 4.2 Step 1：真实 Nginx 双实例代理（P0）

预计时间：0.5～1 天。

任务：

1. 在 WSL 或本机安装 Nginx。
2. 使用 `ops/nginx/nginx.conf` 或拆出多实例配置。
3. 执行：
   ```bash
   nginx -t
   ```
4. 配置 upstream：
   ```text
   127.0.0.1:8081
   127.0.0.1:8082
   ```
5. 配置失败转移：
   ```text
   proxy_next_upstream error timeout http_502 http_503 http_504
   ```
6. 保留真实客户端 IP Header：
   ```text
   X-Real-IP
   X-Forwarded-For
   X-Forwarded-Proto
   ```

验收：

- `nginx -t` 通过；
- 通过 Nginx 访问文章列表、详情、搜索均 HTTP 200；
- 停止 backend-1 后，请求自动切到 backend-2；
- 恢复 backend-1 后重新进入 upstream。

---

### 4.3 Step 2：MinIO 共享文件（P0）

预计时间：1 天。

任务：

1. 启动 MinIO：
   - 优先 WSL 原生二进制；
   - 或在 Docker 可用后使用 Compose。
2. 创建 bucket：`blog`。
3. 配置：
   ```ini
   BLOG_STORAGE_TYPE=minio
   BLOG_MINIO_ENDPOINT=http://localhost:9000
   BLOG_MINIO_ACCESS_KEY=...
   BLOG_MINIO_SECRET_KEY=...
   BLOG_MINIO_BUCKET=blog
   ```
4. 验证上传：
   ```text
   POST /api/upload/image
   ```
5. 验证两个 backend 都能读取同一文件：
   ```text
   GET /uploads/...
   ```
6. 检查历史文件迁移策略。

验收：

- backend-1 上传，backend-2 能读取；
- backend-2 上传，backend-1 能读取；
- 文件 URL 对前端保持 `/uploads/...` 不变；
- 本地存储模式和 MinIO 模式可切换。

---

### 4.4 Step 3：定时任务防重（P1）

预计时间：0.5 天。

任务：

1. 开启以下任务：
   - 浏览量刷库；
   - 访问日志聚合；
   - 缓存预热；
   - 点赞数校准。
2. 确认每个任务都有 Redis 分布式锁。
3. 在两个实例同时运行时观察日志和指标。
4. 记录每个任务的锁名：
   ```text
   task:view-count-flush
   task:visit-log-aggregation
   task:post-cache-warmup
   task:post-like-count-calibration
   ```

验收：

- 同一轮任务只有一个实例执行；
- 另一个实例记录 `held/skipped`；
- 数据库无重复批次；
- 任务耗时指标正常。

---

### 4.5 Step 4：双实例观测（P1）

预计时间：0.5 天。

任务：

1. 更新 Prometheus scrape 配置：
   ```text
   127.0.0.1:8081/actuator/prometheus
   127.0.0.1:8082/actuator/prometheus
   ```
2. 为实例增加 `instance` 标签或使用 Prometheus 自动标签。
3. Grafana 增加：
   - 双实例 HTTP P95/P99；
   - Hikari active/pending；
   - Redis fallback；
   - Rabbit queue messages/ready/unacked/consumers；
   - DLQ 数量；
   - JVM/GC。
4. 增加告警规则：
   - backend down；
   - queue 积压持续增长；
   - DLQ 非零；
   - Hikari pending 持续大于 0；
   - publish failures 增长。

验收：

- Grafana 能区分两个实例；
- 队列指标实时更新；
- 告警规则可在演练中触发并恢复。

---

### 4.6 Step 5：故障矩阵演练（P0）

预计时间：1 天。

按顺序执行，并记录每次结果：

| 演练 | 操作 | 记录指标 |
|---|---|---|
| 单实例宕机 | 停 backend-1 | 错误率、恢复时间、切换目标 |
| 优雅停机 | 发送 SIGINT | Waiting workers、graceful shutdown |
| Redis 停止 30 秒 | 停 Redis | 业务 200 率、缓存回源指标 |
| RabbitMQ 停止 30 秒 | 停 RabbitMQ | 业务 200 率、publish failures |
| RabbitMQ 恢复 | 启动 RabbitMQ | consumer 重连、恢复消息落库 |
| MinIO 停止 | 停 MinIO | 上传失败率、读文件失败率 |
| 坏消息 | 投递非法 eventId | DLQ 数量、正常队列阻塞情况 |
| DLQ 重放 | 修复消息后重发 | 幂等行数、成功 ACK |

验收：

- 每项演练都有 JSON/Markdown 结果；
- 核心页面在 Redis/RabbitMQ 故障期间不失败；
- 每项故障都有恢复时间；
- DLQ 消息可人工重放；
- 双实例任务无重复执行。

---

### 4.7 Step 6：文档收口（P1）

预计时间：0.5～1 天。

交付：

1. `docs/ARCHITECTURE.md`
   - 模块化单体架构图；
   - 请求链路；
   - 缓存链路；
   - RabbitMQ 链路；
   - 多实例拓扑。
2. `docs/FAILOVER_DRILL.md`
   - 真实演练步骤和结果。
3. `docs/RUNBOOK.md`
   - 启动、停止、日志、指标、DLQ 重放、常见故障处理。
4. `docs/ADR.md`
   - 为什么保持单体；
   - 为什么访问日志 fail-open；
   - 为什么用 RabbitMQ 而不是 Kafka；
   - 为什么不用 Elasticsearch；
   - 为什么热点 Key 多实例不严格互斥。
5. 更新 README 的架构图和阶段状态。

验收：

- 新同学能按文档复现双实例部署；
- 面试时能按文档讲清每个取舍；
- 每个结论都有对应数据或演练证据。

---

## 5. 推荐执行顺序

```text
Step 0 环境与端口
  -> Step 1 真实 Nginx
  -> Step 2 MinIO
  -> Step 3 定时任务防重
  -> Step 4 双实例观测
  -> Step 5 故障矩阵
  -> Step 6 文档收口
```

不要先做文档，也不要先做大规模压测。先把双实例运行环境固定下来，再验证故障，最后整理报告。

---

## 6. 主要风险与处理

| 风险 | 影响 | 处理 |
|---|---|---|
| Windows ↔ WSL localhost 转发不稳定 | 应用连不上 RabbitMQ/Nginx | 固定 WSL IP 或配置 portproxy，并写入 Runbook |
| 本机没有 Nginx | 无法验证真实配置 | 在 WSL 安装 Nginx；必要时保留 Node proxy 作为降级演示 |
| 本机没有 Docker | MinIO/Testcontainers 不可用 | 使用 WSL 原生 MinIO；容器测试留到 CI |
| MinIO 凭据暴露 | 安全风险 | 使用本地 `.env`，不提交真实密钥 |
| 多实例任务重复 | 数据重复 | 所有任务必须走 Redis 锁 + 数据库幂等 |
| 两个实例同时刷库 | MySQL 压力放大 | 先观测 Hikari/MySQL，再决定是否降低任务频率 |
| 故障演练破坏开发数据 | 数据污染 | 使用测试 eventId 和测试 bucket，演练后清理 |

---

## 7. Definition of Done

阶段 4 完成时必须满足：

- [x] 真实 Nginx 配置通过 `nginx -t` 并加载运行。
- [x] 两个 backend 实例通过 Nginx 对外提供服务。
- [x] 停止 backend-1 后请求自动切换到 backend-2，文章接口与健康检查均 HTTP 200。
- [ ] MinIO 模式下两实例共享上传文件。
- [x] Redis、RabbitMQ 已作为共享外部依赖验证；MinIO 待 Step 2。
- [ ] 定时任务在双实例下只执行一次。
- [ ] Prometheus/Grafana 能区分两个实例。
- [x] Rabbit queue / unacked / DLQ 指标可观测。
- [ ] Redis、RabbitMQ、MinIO、单实例宕机和优雅停机演练完成。
- [x] DLQ 消息可人工重放且幂等。
- [ ] `ARCHITECTURE.md`、`FAILOVER_DRILL.md`、`RUNBOOK.md`、`ADR.md` 完成。
- [x] 单机资源隔离、缓存开关和双实例性能边界完成并记录。
- [ ] README 阶段状态更新为阶段 4 生产级完成。

---

## 8. 阶段 4 与阶段 5 的关系

阶段 4 完成后，阶段 5 不再需要补大量技术细节，只需要：

1. 汇总最终架构；
2. 整理性能结果；
3. 提炼简历亮点；
4. 准备面试问答；
5. 重写 README 项目介绍。

当前 README 已包含项目定位、架构、性能数据和简历表述；阶段 4 完成后应补充真实双实例故障演练数据。
