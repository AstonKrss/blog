# Java 后端简历与面试完整材料

> 项目：Aston's Blog
> 目标岗位：Java 后端开发工程师
> 最后更新：2026-11-10
> 说明：本文合并简历写法、表达理由、面试问答和数字边界。建议先读“使用说明”，再按目标 JD 选择对应版本。

---

## 使用说明

- 简历空间充足：使用“标准投递版”的 4 条。
- 简历空间有限：使用“精简版”的 2 条。
- 投性能/平台/基础架构：使用“性能优化版本”。
- 投普通 Java 业务后端：使用“业务后端/可靠性版本”。
- 面试前重点看“问题—方案—效果”和最后的面试题答案。
- 所有数字都要带场景限定，不能写成没有条件的“性能提升”。

### 核心证据

- `docs/BENCHMARK_RESULT.md`
- `docs/BENCHMARK_PHASE4_SCALING.md`
- `docs/CACHE_AND_HOT_WRITE_REPORT.md`
- `docs/RABBITMQ_VISIT_LOG.md`
- `docs/FAULT_MATRIX_RESULT.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR.md`

### 必须主动说明的边界

- 单机双实例不等于两台独立服务器线性扩容；
- 真实 MinIO 尚未验收，S3 兼容测试服务只验证了协议代码路径；
- MySQL 仍是单点；
- RabbitMQ 生产端是 fail-open，故障期间访问日志可能丢失；
- 4 个 Testcontainers 用例因本机无 Docker 跳过。

---

# 第一部分：简历项目材料

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

---

# 第二部分：Java 后端面试题与答案

> 最后更新：2026-11-10
> 用法：不要背整段。先讲结论，再讲你做的动作、数据和边界。
> 原则：没有数据的地方不要编，没有验证的能力不要写“已上线”。

---

## 1. 先用一句话介绍项目

**回答：**

> 这是一个面向高读低写内容平台的博客系统，我在基础功能之外做了查询优化、缓存治理、RabbitMQ 异步写入和双实例故障演练，重点是每项改造都有压测、指标或故障演练支撑。

如果面试官只想听技术栈：

> Next.js 15 + Spring Boot 4 / Java 21 + MySQL 8 + Redis + RabbitMQ，使用 Actuator、Micrometer、Prometheus、Grafana 和 k6 建立观测与压测体系。

---

## 2. 为什么保持模块化单体，不拆微服务？

**回答：**

> 当前项目没有独立团队、独立发布和独立扩缩容需求。拆微服务会先引入服务发现、配置中心、分布式事务、链路追踪和运维复杂度，但没有对应收益。我先用模块化单体把 SQL、缓存、消息和故障边界做扎实，未来出现真实边界再拆。

**边界：**

> 如果后续搜索、文件服务或访问统计需要独立扩容，再按真实瓶颈拆分，不用为了简历硬拆。

---

## 3. 你怎么发现性能瓶颈的？

**回答：**

> 先接 Actuator、Micrometer、Prometheus、Grafana 和 k6，建立 HTTP P50/P95/P99、JVM、Hikari、Redis、MySQL 慢查询和定时任务指标。然后通过大数据量和固定到达率压测定位问题，而不是先凭感觉加缓存或加机器。

具体定位过：

- 文章列表集合 JOIN 导致分页异常和慢查询；
- 笔记列表 N+1；
- 标签统计循环 count；
- 搜索 LIKE 全表扫描；
- Hikari pending 等待；
- 单机压测时 k6 和 JVM 抢 CPU。

---

## 4. P95、P99 是什么？为什么看它们？

**回答：**

> P95 表示 95% 的请求延迟不超过该值，P99 表示 99% 的请求不超过该值。平均值会被少量极慢请求拉偏，也无法反映尾部用户体验，所以性能判断要看 P95/P99，同时结合吞吐、错误率和 dropped iterations。

例如：

> 双实例在 1500 RPS 两轮 P95 为 5.17ms 和 6.92ms，且 dropped 为 0；单实例一轮正常、一轮 P95 到 1935ms 且 dropped 1320，所以不能只看某一轮均值。

---

## 5. 文章列表为什么要两段式分页？

**回答：**

> 因为文章和标签是多对多关系，直接用 `JOIN FETCH` 集合再 `Page`，Hibernate 可能先加载大量行再在内存分页，数据量上来后会出现计数和分页异常。我的做法是先查当前页文章 ID，再按 ID 批量加载作者和标签，最后按 ID 顺序组装。

收益：

- 分页边界清晰；
- 避免集合 JOIN 放大结果集；
- 查询次数可控；
- 更适合缓存。

---

## 6. N+1 是什么？你怎么修的？

**回答：**

> N+1 是先查出一页主对象，再在循环里对每个对象单独查关联数据。比如一页 20 篇笔记，每篇再查评论和评论作者，就会产生大量 SELECT。

我改为：

1. 只收集当前页 `noteId`；
2. 一次批量查评论；
3. 一次批量查评论作者；
4. 一次批量查当前用户点赞；
5. 按 `noteId` 分组建树；
6. 每篇截取前 3 条根评论。

结果：约 42 次 SELECT/请求降到约 4 次。

---

## 7. 为什么搜索先用 MySQL FULLTEXT，不直接上 Elasticsearch？

**回答：**

> 当前搜索需求和数据量还不需要 ES。ES 会引入索引同步、双写一致性、集群运维和故障处理成本。先用 FULLTEXT 解决 LIKE 全表扫描问题，并且用执行计划验证索引命中。

什么时候再上 ES：

- 需要中文分词和相关度排序；
- 数据量明显增大；
- 需要复杂聚合、模糊匹配和多字段权重；
- 能接受索引同步和运维成本。

---

## 8. Redis 缓存边界怎么设计？

**回答：**

> 我优先缓存高读、低变化、可容忍短暂不一致的数据，比如文章列表、详情、标签、归档、搜索和站点公开设置。写操作后按版本号或精确 Key 失效，并给 TTL 加随机抖动，避免同一时间大量 Key 过期。

不会把所有数据都缓存，也不会在更新时直接 `allEntries=true` 清空全部。

---

## 9. Redis 挂了，`@Cacheable` 会怎样？

**回答：**

> 默认 Spring Cache 在 Redis 连接失败时可能直接抛异常，方法体还没执行。我的项目增加了统一 `ResilientCacheManager`：捕获 Redis 读写异常，记录 fallback 指标，然后执行 loader 查 MySQL；写回失败也不影响业务返回。

但这不是所有 Redis 操作都统一 fail-open：

- 在线人数返回 0；
- 留言限流 fail-open；
- 登录防护 fail-open；
- 浏览量允许少计；
- 分布式锁获取失败时任务跳过本次执行。

不同业务要有不同故障语义。

---

## 10. 热点 Key 缓存击穿怎么处理？

**回答：**

> 单实例内用固定分段 `ReentrantLock`，同一个 cacheName + key 只允许一个请求回源；跨实例尝试 Redis 分布式锁，获取锁后二次检查缓存，再执行 loader。

取舍：

> 我的实现是可用性优先。跨实例没抢到锁时允许继续回源，而不是无限等待，所以不是严格全局单飞；严格单飞会增加请求延迟和超时风险。

---

## 11. 为什么 Hikari 连接池不是越大越好？

**回答：**

> Hikari 是数据库连接池，不是线程池。连接数太大只会把压力推给 MySQL，增加上下文切换和锁竞争。我先用 pending、acquire、timeout 指标采样，发现 10 连接在 100 VU 下最大 pending 23，调到 20 后 pending 为 0，P95 从 71.45ms 降到 40.64ms。

最终还要结合实例数、MySQL 最大连接数和实际 QPS 再评估。

---

## 12. 浏览量为什么不能直接 Redis 加一、MySQL 也加一？

**回答：**

> Redis 和 MySQL 不能组成一个本地事务。如果先更新 MySQL 再扣 Redis，进程可能在中间崩溃；如果先扣 Redis 再写 MySQL，也可能丢数据。我的做法是生成稳定 batchId，MySQL 用 batchId 唯一键保证幂等，在同一事务里写批次记录和更新文章计数，成功后再扣 Redis。

Redis 故障时允许少计，优先保证页面可用。

---

## 13. 为什么用 RabbitMQ？为什么只做访问日志？

**回答：**

> 访问日志是低优先级、可异步、可容忍短暂失败的链路，适合解耦。我只选这一条链路，是为了把 Producer Confirm、手动 ACK、批量消费、eventId 幂等、重试和 DLQ 真正做完整，而不是把邮件、点赞、缓存失效全部塞进 MQ 增加复杂度。

---

## 14. Exchange、Routing Key、Queue 和 DLX/DLQ 分别是什么？

**回答：**

> Producer 不直接把消息塞进 Queue，而是发给 Exchange，Exchange 根据 Routing Key 和 Binding 路由到 Queue。我的链路是 direct exchange `blog.events`、routing key `visit.recorded`、queue `visit.log.write`。消费失败且重试耗尽后，消息通过 dead-letter exchange 转到 `visit.log.write.dlq`。

Publisher Confirm 是 Broker 告诉 Producer“我收到了”；Consumer ACK 是消费者告诉 Broker“我处理完成了”。

---

## 15. 重复消息怎么防重？

**回答：**

> Producer 第一次生成稳定 `eventId`，重试时不能重新生成。Consumer 把 `eventId` 写入 `visit_logs.event_id` 唯一索引，数据库用唯一约束兜底。消息至少一次投递时，重复消息不会产生重复行。

关键点：

> 不能把 Publisher Confirm 当成 exactly-once，也不能只靠消费者内存去重。

---

## 16. 批量消费失败怎么办？

**回答：**

> 一批消息使用整体事务，数据库提交后才 ACK。如果一批失败，二分拆批，成功的子批继续提交并 ACK，最终定位坏消息，重试耗尽后 NACK 到 DLQ。

取舍：

- 整批重试简单，但正常消息会被重复处理；
- 二分拆批增加重试次数，但能隔离坏消息；
- 消费端仍然依赖 eventId 幂等。

---

## 17. 为什么 RabbitMQ 故障时允许丢访问日志？

**回答：**

> 访问日志不是核心交易数据。RabbitMQ 故障时如果生产端同步重试或写本地事务表，会阻塞或放大业务请求。当前选择 fail-open，保证文章页面可用，同时记录 publish failure 指标。

如果业务要求零丢失，下一步应使用 Outbox：业务事务内写事件表，后台可靠投递，再做消费端幂等。

---

## 18. 双实例到底有没有性能提升？

**回答：**

> 要分两个问题。高可用方面，真实 Nginx 下停掉 backend-1 后 20/20 请求成功切换。性能方面，最初两个 JVM 在同一台电脑上抢 CPU，结果并不稳定；后来给 k6 和两个 JVM 分配不同 CPU 组，双实例在 1000/1500 RPS 两轮都无 dropped iterations，单实例多次出现 dropped 和长尾。

但不能说生产性能翻倍，因为 k6、MySQL、Redis、Nginx 仍然共享同一台机器。真实水平扩容需要独立压测机和两台应用节点，这是明确延期项。

---

## 19. 为什么没有用 Kafka、Kubernetes、Nacos？

**回答：**

> 它们没有对应真实问题。Kafka 面向更高吞吐和日志流场景；K8s 解决容器编排和弹性；Nacos 解决服务发现和配置。当前单条 RabbitMQ 链路、两个 Spring Boot 实例和环境变量配置已经够用。先把每个引入的组件讲清楚，比堆技术栈更重要。

---

## 20. 这个项目还有哪些不足？

**回答：**

- MySQL 仍是单点；
- RabbitMQ 没有 Outbox，访问日志可能丢失；
- 热点 Key 跨实例不是严格全局单飞；
- 真实 MinIO 共享文件尚未端到端验收；
- 双实例指标和完整故障矩阵尚未补齐；
- 单机压测不能等同生产容量；
- Testcontainers 需要在 Docker/CI 环境完整执行。

**加分说法：**

> 我刻意把这些写成延期项，而不是把未验证能力写成已完成。面试时可以讲清楚下一步怎么做。

---

## 21. 如果继续优化，下一步做什么？

**回答顺序：**

1. 独立压测机 + 两台应用节点，验证真实水平扩容；
2. 双实例 Prometheus/Grafana 和告警；
3. MinIO 共享文件与停机恢复；
4. Redis/RabbitMQ/MinIO/MySQL 故障矩阵；
5. RabbitMQ Outbox；
6. 视搜索需求评估 ES；
7. 视部署规模评估 K8s，而不是现在直接上。

---

## 22. 面试表达模板

> 这个项目不是功能堆叠。我先用可观测性和压测找到真实瓶颈，再针对文章分页、N+1、FULLTEXT、缓存和连接池做优化；然后用 RabbitMQ 实现一条可验证的可靠异步链路；最后用双实例和故障演练验证无状态部署。每个结论都有报告和边界，不能证明的部分我会明确说延期。

---

## 23. 相关材料

- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- `docs/BENCHMARK_RESULT.md`
- `docs/RUNBOOK.md`
- `docs/FAILOVER_DRILL.md`
- `docs/BENCHMARK_PHASE4_SCALING.md`
- `docs/FAULT_MATRIX_RESULT.md`
- `docs/INTERVIEW_QA.md`
- `docs/RESUME_PROJECT.md`
- `docs/CACHE_AND_HOT_WRITE_REPORT.md`
- `docs/RABBITMQ_VISIT_LOG.md`
