# Java 后端简历项目材料

> 项目：Aston's Blog  
> 目标岗位：Java 后端开发工程师  
> 最后更新：2026-11-10  
> 原则：只写有代码、报告或演练证据支撑的内容；明确区分单机验证与生产级多机结论。

---

## 1. 项目一句话

**自建博客系统 + Java 后端性能与可靠性改造**：基于 Spring Boot 4 / Java 21，完成 SQL 与 N+1 优化、Redis 缓存治理、RabbitMQ 可靠异步、Actuator/Prometheus/k6 观测压测和 Nginx 双实例故障演练。

---

## 2. 简历标准版

建议在简历中使用以下 4 条，控制在 6～8 行。

> - 针对文章列表集合 JOIN、笔记 N+1 和 LIKE 全表扫描问题，在 5 万文章 / 20 万标签关联 / 10 万评论数据集上完成两段式分页、批量加载、索引与 MySQL FULLTEXT 改造；文章列表 P95 从 6.78s 降至 3.14ms，笔记列表 SELECT 从约 42 次/请求降至 4 次/请求。
> - 设计 Redis 缓存治理方案，实现 8～12 分钟 TTL 抖动、版本号精确失效、热点 Key 互斥回源和 Redis 故障统一回源 MySQL；文章列表/搜索缓存命中率达到 99.95%/99.98%，并通过 Hikari pending 采样将 100 VU 下 P95 从 71.45ms 优化到 40.64ms。
> - 使用 RabbitMQ 解耦访问日志写入，实现 Publisher Confirm、手动 ACK、批量消费、eventId 幂等、有限重试和 DLQ；RabbitMQ 停止 30 秒期间 10/10 业务请求返回 HTTP 200，恢复后消费者自动重连并继续落库。
> - 基于 Nginx + 双 Spring Boot 实例验证无状态部署和单实例故障转移，停机演练中 20/20 请求成功切换；使用 k6 固定到达率与 CPU 亲和性分析单双实例容量边界，并完成 Redis、RabbitMQ、S3 兼容存储和优雅停机故障矩阵。

---

## 3. 简历精简版

如果简历空间有限，只保留 2 条：

> - 主导博客后端性能优化：通过两段式分页、批量加载、索引、MySQL FULLTEXT 和 Redis 缓存治理，将文章列表 P95 从 6.78s 降至 3.14ms，笔记列表 SELECT 从约 42 次/请求降至 4 次/请求。
> - 基于 RabbitMQ 和 Nginx 双实例完成可靠异步与故障演练：实现 Publisher Confirm、手动 ACK、eventId 幂等、DLQ、Redis 降级和单实例宕机切换，RabbitMQ 停服期间业务请求 10/10 成功。

---

## 4. 技术细节版

适合项目经历较少的校招简历或面试自我介绍：

> - **查询优化**：修复 `JOIN FETCH + Page` 集合分页、笔记列表 N+1 和标签统计 N+1；先分页查 ID，再批量加载作者/标签/评论；为搜索建立 FULLTEXT 索引。
> - **缓存与一致性**：设计 Redis Key 维度、8～12 分钟 TTL 抖动、版本号精确失效、单实例本地锁 + Redis 分布式锁的热点 Key 回源保护；Redis 故障时核心页面回源 MySQL。
> - **热点写**：浏览量使用 Redis 增量 + 稳定 batchId + MySQL 唯一键幂等落库；日志聚合和缓存预热使用 Redis 分布式锁避免多实例重复执行。
> - **可靠异步**：RabbitMQ direct exchange、durable queue、持久化消息、Publisher Confirm、手动 ACK、批量事务、二分拆批和 DLQ；消费端 `event_id` 唯一键保证幂等。
> - **可观测性**：Actuator + Micrometer + Prometheus + Grafana + k6，覆盖 HTTP P50/P95/P99、JVM、GC、Hikari pending、Redis fallback、MySQL 慢查询、RabbitMQ 队列和定时任务耗时。
> - **部署与故障**：Nginx + 两个无状态 Spring Boot 实例，JWT 不依赖 Sticky Session；验证 backend-1 宕机切换、Redis 降级、RabbitMQ fail-open/恢复、DLQ、S3 兼容存储停止/恢复和优雅停机。
> - **测试**：JUnit 5 + Mockito + MockMvc，当前 94 个测试通过；4 个 Testcontainers 用例因本机无 Docker 跳过，已记录到 CI/Docker 延期项。

---

## 5. 可量化指标

| 指标 | 数据 | 证据 |
|---|---:|---|
| 文章列表 P95 | 6.78s → 3.14ms | `BENCHMARK_PHASE1.md` |
| 文章列表 P99 | 8.09s → 4.25ms | `BENCHMARK_PHASE1.md` |
| 笔记列表 SELECT | 约 42 → 4 次/请求 | `BENCHMARK_N1_2026-11-04.md` |
| 笔记评论扫描行数 | 约 100,200 → 200 行/次 | `BENCHMARK_N1_2026-11-04.md` |
| `publicPosts` 缓存命中率 | 99.95% | `BENCHMARK_PHASE1.md` |
| `search` 缓存命中率 | 99.98% | `BENCHMARK_PHASE1.md` |
| Hikari 100 VU P95 | 71.45ms → 40.64ms | `HIKARI_POOL_SAMPLING.md` |
| RabbitMQ 批量消费 | 20 条一次落库 | `RABBITMQ_VISIT_LOG.md` |
| RabbitMQ 停服 30 秒 | 10/10 HTTP 200 | `RABBITMQ_VISIT_LOG.md` |
| backend-1 宕机切换 | 20/20 HTTP 200 | `PHASE2_RELIABILITY_REPORT.md` |
| 单机故障矩阵 | Redis/RabbitMQ/DLQ/S3/优雅停机/Nginx | `FAULT_MATRIX_RESULT.md` |

---

## 6. 30 秒自我介绍

> 这个项目是一个 Spring Boot 博客系统，我没有停留在功能叠加，而是按“观测和压测 → 查询优化 → 缓存治理 → RabbitMQ 异步 → 多实例故障演练”的路线做后端改造。比如通过两段式分页、批量加载、FULLTEXT 和 Redis 将文章列表 P95 从 6.78 秒降到 3.14 毫秒；又用 Publisher Confirm、手动 ACK、eventId 幂等和 DLQ 完成一条可靠访问日志链路。最后用 Nginx 双实例和故障矩阵验证 Redis 降级、RabbitMQ fail-open、优雅停机和单实例宕机切换。

---

## 7. 两分钟项目故事

### 背景

博客是读多写少场景，早期存在文章集合分页、N+1、LIKE 搜索和缓存缺失问题。项目目标不是拆微服务，而是建立一套可观测、可压测、可降级、可解释的后端工程链路。

### 我做了什么

1. 接入 Actuator、Micrometer、Prometheus、Grafana 和 k6，建立 P95/P99、JVM、Hikari、Redis、RabbitMQ 指标。
2. 用 5 万文章、20 万标签关联、10 万评论数据压测，修复集合 JOIN 分页、N+1 和 FULLTEXT 搜索。
3. 设计 Redis 缓存边界、TTL 抖动、精确失效、热点 Key 回源和 Redis 故障回源。
4. 用 batchId + MySQL 唯一键实现浏览量幂等落库。
5. 用 RabbitMQ 实现访问日志异步链路，包含 Publisher Confirm、手动 ACK、批量事务、eventId 幂等和 DLQ。
6. 用 Nginx + 两个 Spring Boot 实例验证无状态部署、故障切换和单机资源隔离压测。
7. 完成 Redis、RabbitMQ、S3 兼容存储、优雅停机和 backend 宕机故障矩阵。

### 结果

- 文章列表 P95：6.78s → 3.14ms；
- 笔记 SELECT：约 42 → 4 次/请求；
- Hikari 100 VU P95：71.45ms → 40.64ms；
- RabbitMQ 停服期间 10/10 业务请求成功；
- backend-1 宕机时 20/20 请求成功切换；
- 当前 94 个后端测试通过。

### 取舍

- 保持模块化单体，不为了简历硬拆微服务；
- 搜索先用 MySQL FULLTEXT，不直接引入 ES；
- 访问日志选择 fail-open，允许故障期间丢失，而不是把业务请求绑定到 MQ；
- 双实例优先证明高可用和部署能力，单机结果不包装成生产线性扩容。

---

## 8. 面试官可能追问的数字边界

### 6.78s → 3.14ms 是什么场景？

> 50k 文章数据集、缓存开启后的文章列表 P95，不是所有生产请求的平均提升。冷查询、缓存命中和数据库回源要分开看。

### 双实例是否提升性能？

> 在单机 CPU 资源隔离实验中，双实例在 1000/1500 RPS 下无 dropped iterations，单实例多次掉迭代；但 k6、MySQL、Redis、Nginx 仍共享同一台机器，因此只能证明应用层并行收益，不能证明两台独立服务器线性扩容。

### 为什么不是 100% 高可用？

> 当前 MySQL 仍是单点，真实 MinIO、物理主机故障和网络分区未验证；项目明确区分“单机应用级故障矩阵”和“生产多机高可用”。

---

## 9. 简历不要这样写

不要写：

- 精通高并发、分布式；
- 双实例性能提升 100%；
- 已完成真实 MinIO 和 MySQL 高可用；
- 使用 Kafka、Kubernetes、Nacos 支撑海量流量；
- 测试覆盖率 95%；
- 所有故障都能零丢失。

推荐写：

- 有明确数据、场景和限制；
- 能说清为什么这样做、为什么不那样做；
- 能区分高可用、水平扩展和性能优化。

---

## 10. 岗位关键词映射

| 岗位要求 | 项目证据 |
|---|---|
| Java / Spring Boot | Spring Boot 4、Java 21、Spring Security、JPA |
| MySQL | 两段式分页、N+1、索引、FULLTEXT、EXPLAIN |
| Redis | 缓存边界、TTL、精确失效、降级、热点 Key、浏览量 |
| 消息队列 | RabbitMQ Confirm、ACK、批量消费、幂等、DLQ |
| 性能优化 | P95/P99、k6、Hikari、JVM/GC、慢查询 |
| 并发与一致性 | 分布式锁、batchId 幂等、eventId 幂等 |
| 工程化 | JUnit、MockMvc、Actuator、Prometheus、Grafana |
| 部署与高可用 | Nginx 双实例、健康检查、故障转移、优雅停机 |

---

## 11. 证据入口

- `docs/BENCHMARK_RESULT.md`
- `docs/BENCHMARK_PHASE4_SCALING.md`
- `docs/CACHE_AND_HOT_WRITE_REPORT.md`
- `docs/RABBITMQ_VISIT_LOG.md`
- `docs/FAULT_MATRIX_RESULT.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- `docs/INTERVIEW_QA.md`
