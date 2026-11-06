# Aston's Blog 后端性能与可靠性优化路线

> 项目：Aston's Blog  
> 技术栈：Next.js 15 + Spring Boot 4 + Java 21 + MySQL 8 + Redis + Docker  
> 目标岗位：Java 后端工程师  
> 文档日期：2026-11-02  
> 状态：执行中（最后更新：2026-11-05）

---

## 0. 执行状态总览（2026-11-05）

| 阶段 | 状态 | 完成度 | 已完成 | 未完成 / 风险 |
|---|---|---:|---|---|
| 阶段 0：可观测性与压测基线 | ✅ 已完成 | 100% | Actuator、Micrometer、Prometheus、Grafana、traceId、k6、慢查询、Hikari/Redis/任务指标、基线报告 | 无阻断项；基线数据已补充大数据量实验 |
| 阶段 1：数据库与查询路径优化 | ✅ 已完成 | 100% | 文章两段式分页、笔记 N+1、标签统计 N+1、FULLTEXT UNION 搜索、标签筛选执行计划、索引前后对比、Testcontainers 集成测试、`BENCHMARK_QUERY.md` | 本机无 Docker，Testcontainers 4 个用例自动跳过；需在 Docker/CI 环境执行一次真实容器测试 |
| 阶段 2：缓存与热点写优化 | 🟡 部分完成 | 约 88% | 缓存边界与命中率指标、浏览量幂等+允许少计、Hikari min10/max20、Redis Cache 统一降级、在线/限流/登录防护/分布式锁故障策略 | TTL 抖动、精确缓存失效、热点 Key 互斥回源、点赞原子计数与校准任务 |
| 阶段 3：RabbitMQ 可靠异步链路 | ⬜ 未开始 | 0% | 无 | RabbitMQ 依赖、Compose、生产者/消费者、DLQ、幂等消费、积压监控、故障演练 |
| 阶段 4：多实例部署与故障演练（可选） | 🟡 部分完成 | 约 55% | Nginx 配置、JWT 无状态、MinIO 存储抽象、Redis 分布式锁、健康/就绪检查、双实例故障转移演练 | 真实 Nginx 加载、真实 MinIO 上传、优雅停机、Redis/RabbitMQ 故障演练、完整一致性记录 |
| 阶段 5：文档、数据与简历包装 | 🟡 部分完成 | 约 25% | `BENCHMARK_BASELINE.md`、k6 脚本、阶段 1/2 报告、N+1/Hikari 专项报告 | `ARCHITECTURE.md`、`ADR.md`、`BENCHMARK_RESULT.md`、`RUNBOOK.md`、`FAILOVER_DRILL.md`、架构图/时序图、README 优化亮点重写 |

### 当前结论

- 阶段 0 已完成，并且已经用大数据量实验验证了真实瓶颈：连接池等待、索引缺失、缓存掩盖数据库压力。
- 阶段 1 已完成：核心查询改造、执行计划对比、Testcontainers 测试和 `BENCHMARK_QUERY.md` 均已落地；本机无 Docker，容器测试需在 CI 或安装 Docker 后执行。
- 阶段 2 已完成主要 Redis 故障策略：Spring Cache 回源 MySQL，浏览量和在线人数可降级，留言/登录防护 fail-open，分布式锁跳过任务；仍需补 TTL 抖动、精确失效、热点互斥和点赞计数校准。
- 阶段 3 尚未开始，不建议现在直接上 RabbitMQ；先把阶段 2 缓存可靠性做扎实。
- 阶段 4 已有可演示的多实例资产，但真实 Nginx/MinIO 和完整故障矩阵还没验证。
- 阶段 5 的专项报告已经不少，但还缺统一的架构、ADR、Runbook 和 README 包装。

### 下一步建议（按顺序）

1. **P0：阶段 2 缓存可靠性续作**：TTL 抖动、精确缓存失效、热点 Key 互斥回源。
2. **P1：点赞计数原子化与周期校准**，避免高并发下计数漂移。
3. **P1：完成阶段 2 后再决定是否进入 RabbitMQ**；如果进入，只做访问日志异步写入一条链路。
4. **P2：真实 Nginx + MinIO 验证和优雅停机**，把多实例从“可演示”提升到“可复现”。
5. **P2：在 Docker/CI 环境执行 Testcontainers 测试**，补齐阶段 1 的容器验证证据。
6. **最后：阶段 5 文档与 README 重写**，统一架构图、ADR、Benchmark、Runbook 和简历表述。

---

## 1. 结论先行

当前最重要的动作不是继续增加业务功能，也不是立刻引入微服务、Kafka、Nacos、Kubernetes。

更合适的项目定位是：

> **面向高读低写内容平台的性能优化与可靠性改造**

核心策略：

1. 保持模块化单体，不拆微服务。
2. 先建立可观测性和压测基线，再优化。
3. 优先处理 SQL、分页、N+1、索引和缓存一致性。
4. 用一条 RabbitMQ 可靠异步链路展示消息队列能力。
5. 在基础优化完成后再考虑双实例部署、共享存储和故障转移。
6. 所有优化必须有压测前后数据、失败模式和取舍说明。

一个有数据、有文档、能解释清楚取舍的单体项目，比一个为了简历硬拆出来的分布式 Demo 更有竞争力。

---

## 2. 当前项目基线

### 2.1 已有能力

- Spring Boot 4 / Java 21
- MySQL 8 + Flyway
- Redis 缓存
- JWT + RBAC
- 参数校验和统一响应
- 浏览量 Redis 增量 + 定时批量落库
- `@Async` 访问日志
- 文章、标签、评论、点赞、留言、照片、项目等功能
- Docker Compose
- GitHub Actions
- 单元测试
- 安全拦截、简单限流

### 2.2 已有优势

项目不是简单的纯 CRUD：

- 已使用 Redis 承接部分高频读写。
- 已有浏览量和在线人数设计。
- 已有定时任务、缓存失效和异步日志。
- 已有 Flyway 索引迁移。
- 已有安全拦截和测试基础。

这些内容可以直接改造成后端工程能力，而不是推倒重来。

### 2.3 当前主要问题

| 类型 | 当前问题 | 影响 |
|---|---|---|
| 性能证据 | 没有压测基线和前后对比 | 无法证明优化有效 |
| 可观测性 | 没有 Micrometer、Prometheus、Grafana | 无法定位 P95、慢 SQL、缓存命中率 |
| 数据库 | `JOIN FETCH + Page`、N+1、LIKE 搜索 | 数据量增长后查询退化 |
| 缓存 | TTL 统一、存在大范围清缓存 | 雪崩、穿透和一致性问题难以评估 |
| 异步 | `@Async` 没有专用线程池和背压 | 队列积压、任务丢失、服务重启不可恢复 |
| 消息队列 | 没有可靠异步链路 | 无法展示重试、死信、幂等消费 |
| 分布式 | 本地文件、定时任务不支持多实例 | 水平扩展会产生文件丢失和重复任务 |
| 测试 | 缺少真实 MySQL/Redis 集成测试 | 很多问题只能靠手工验证 |
| 文档 | 缺少架构图、ADR、Benchmark、Runbook | 面试时难以讲清工程过程 |

---

## 3. 项目定位与边界

### 3.1 推荐定位

**内容发布与访问分析平台的后端性能优化**

主线能力：

- 文章发布与读取
- 标签、归档、搜索
- 评论和点赞
- 访问统计
- 安全审计
- 热点读缓存
- 异步日志写入
- 多实例部署与故障恢复

### 3.2 明确不做

- 不拆用户、文章、评论微服务。
- 不为了简历而引入 Nacos、Sentinel、API Gateway 全家桶。
- 不引入 Kubernetes。
- 不引入 Elasticsearch，除非真实文章量证明 MySQL FULLTEXT 不够。
- 不在没有多实例需求时使用分布式锁。
- 不继续堆小游戏、收藏、足迹等新功能。
- 不伪造 QPS、P95、缓存命中率等数据。

---

## 4. 架构决策记录

| ID | 决策项 | 候选方案 | 建议选定 | 理由 | 级别 |
|---|---|---|---|---|---|
| D-01 | 系统形态 | 模块化单体 / 微服务 | 模块化单体 | 当前无独立部署和团队边界，微服务只增加复杂度 | P0 |
| D-02 | 首要目标 | 新功能 / 性能与可靠性 | 性能、观测、测试 | Java 后端面试更看重工程深度和结果 | P0 |
| D-03 | 搜索方案 | MySQL FULLTEXT / Elasticsearch | 先 FULLTEXT | 当前数据量不需要 ES，避免运维和一致性成本 | P0 |
| D-04 | 缓存方案 | Redis / Redis + Caffeine | 先 Redis | 两级缓存会增加一致性和失效复杂度 | P1 |
| D-05 | MQ 选型 | RabbitMQ / Kafka / Redis Stream / 不加 | RabbitMQ | 单条异步链路足够，路由、重试、DLQ 能力清晰 | P1 |
| D-06 | MQ 场景 | 访问日志 / 邮件 / 点赞 / 缓存失效 | 访问日志 | 高频、非强一致、适合异步批处理 | P1 |
| D-07 | 分布式形态 | 微服务 / 多实例单体 / 不做 | 可选多实例单体 | 用 Nginx + 两个后端实例即可演示故障转移 | P1 |
| D-08 | 文件存储 | 本地目录 / MinIO | 单机本地，多实例 MinIO | 横向扩展后本地文件无法共享 | P1 |
| D-09 | 压测工具 | JMeter / Gatling / k6 | k6 | 脚本可版本化、CI 友好、指标清晰 | P1 |
| D-10 | 集成测试 | Mock / Testcontainers | Testcontainers | 验证真实 SQL、事务、Redis 和 MQ 行为 | P1 |

> D-05、D-07、D-08 属于第二阶段能力，必须先完成可观测性和数据库优化。  
> 在这些决策未确认前，不应直接开始堆基础设施。

---

## 5. 目标架构演进

### 5.1 第一阶段：单体 + Redis + 可观测性

```text
Browser
   |
   v
Next.js
   |
   v
Spring Boot Monolith
   |---- MySQL
   |---- Redis
   |---- Prometheus / Grafana
```

目标：

- 能观察请求耗时、错误率、JVM、连接池、缓存和慢 SQL。
- 能压测并形成基线数据。
- 先修数据库和查询问题。

### 5.2 第二阶段：异步日志链路

```text
HTTP Request
   |
   v
Spring Boot
   |
   +---- RabbitMQ exchange: blog.events
   |         |
   |         v
   |     queue: visit.log.write
   |         |
   |         v
   |     Batch Consumer
   |         |
   |         v
   |       MySQL
   |
   +---- 正常业务直接返回
```

关键能力：

- Publisher Confirm
- 手动 ACK
- 重试与死信队列
- 幂等消费
- 批量写库
- 消费积压监控
- 优雅停机

### 5.3 可选第三阶段：多实例单体

```text
Nginx
  |---- backend-1
  |---- backend-2

共享基础设施：
  MySQL
  Redis
  RabbitMQ
  MinIO
```

目标不是“微服务”，而是验证：

- JWT 无状态是否真的可水平扩展。
- 本地文件上传是否影响多实例。
- 定时任务是否重复执行。
- 单实例宕机后请求是否能自动转移。
- Redis、RabbitMQ 故障时是否有降级行为。

---

## 6. 分阶段实施路线

## 阶段 0：可观测性与压测基线

**周期：3～5 天**  
**优先级：P0，必须先做**

### 任务

1. 接入 Spring Boot Actuator。
2. 接入 Micrometer、Prometheus、Grafana。
3. 暴露并观察：
   - HTTP 请求量和 P50/P95/P99
   - JVM 堆内存、GC、线程数
   - Hikari 活跃连接、等待连接、超时
   - Redis 命令耗时、缓存命中率
   - MySQL 慢查询数量
   - 定时任务执行耗时
4. 增加请求 ID，日志输出 traceId。
5. 使用 k6 编写压测场景：
   - 首页文章列表
   - 文章详情
   - 标签筛选
   - 搜索
   - 登录
   - 点赞
   - 留言
6. 记录优化前基线。

### 交付物

- `docs/BENCHMARK_BASELINE.md`
- `loadtest/k6/*.js`
- Grafana Dashboard JSON
- 可观测性接入说明

### 验收标准

- 压测时能看到接口 P95/P99。
- 能看到 Hikari 连接池等待情况。
- 能看到 Redis 命中率和请求耗时。
- 能定位至少一个真实瓶颈。

---

## 阶段 1：数据库与查询路径优化

**周期：5～7 天**  
**优先级：P0**

### 任务

1. 修复文章列表 `JOIN FETCH + Page`
   - 先分页查询文章 ID。
   - 再按 ID 批量加载作者和标签。
   - 避免集合 JOIN 导致计数和分页异常。

2. 修复笔记列表 N+1
   - 批量查询一页笔记的评论。
   - 按 `noteId` 分组后组装。
   - 禁止在循环中逐条查询评论。

3. 修复标签统计 N+1
   - 用一次 `GROUP BY tag_id` 查询所有标签文章数。
   - 不在标签循环中重复执行 count SQL。

4. 搜索改造
   - 为 `title`、`content` 增加 FULLTEXT 索引。
   - 标签搜索保留 EXISTS 或独立关联查询。
   - 记录改造前后的查询计划。

5. 索引验证
   - 对核心 SQL 执行 `EXPLAIN ANALYZE`。
   - 检查是否全表扫描、是否产生临时表、是否 filesort。
   - 删除无效或重复索引。

6. 补 Testcontainers 集成测试
   - 至少覆盖文章分页、标签筛选、搜索、点赞事务。

### 交付物

- 新 Flyway migration
- 查询优化前后对比
- `docs/BENCHMARK_QUERY.md`

### 验收标准

- 核心读接口不再出现明显 N+1。
- 分页查询不依赖内存分页。
- 搜索能命中预期索引或 FULLTEXT。
- 集成测试可在干净 MySQL 容器中运行。

---

## 阶段 2：缓存与热点写优化

**周期：4～6 天**  
**优先级：P0/P1**

### 任务

1. 明确缓存边界
   - 文章列表
   - 文章详情
   - 标签列表
   - 归档
   - 站点公开设置
   - 首页统计

2. 缓存策略
   - Key 包含分页、标签、语言等业务维度。
   - TTL 增加随机抖动。
   - 更新文章后精确失效相关 Key。
   - 避免不必要的 `allEntries=true`。

3. 缓存异常处理
   - Redis 不可用时降级查 MySQL。
   - 记录缓存加载时间和失败率。
   - 防止热点 Key 同时回源。

4. 浏览量与点赞
   - 浏览量继续使用 Redis 增量 + 批量落库。
   - 点赞使用唯一约束防重复。
   - 点赞计数尽量使用原子 SQL 或 Redis 计数。
   - 增加周期性计数校准任务。

5. 连接池配置
   - 显式配置 Hikari 最大连接数、最小空闲、超时和生命周期。
   - 用压测确认配置，不盲目调大。

### 交付物

- 缓存 Key 与 TTL 设计表
- 热点写策略说明
- 缓存命中率与数据库 QPS 对比

### 验收标准

- 缓存命中率达到预设目标。
- 数据库读 QPS 明显下降。
- Redis 不可用时核心页面仍能降级访问。
- 更新文章后不会读到明显旧数据。

---

## 阶段 3：RabbitMQ 可靠异步链路

**周期：5～7 天**  
**优先级：P1**

### 场景选择

只选择一条链路：**访问日志异步写入**。

不建议同时把邮件、点赞、缓存失效、搜索索引全部塞进 MQ。

### 推荐拓扑

```text
exchange: blog.events
queue: visit.log.write
routing key: visit.recorded
dead letter exchange: blog.dlx
dead letter queue: visit.log.write.dlq
```

### 任务

1. 定义事件结构
   - eventId
   - occurredAt
   - ip
   - path
   - userAgent
   - referer
2. 生产者使用 Publisher Confirm。
3. 消费者使用手动 ACK。
4. 配置有限重试和指数退避。
5. 超过重试次数进入 DLQ。
6. 使用 eventId 或数据库唯一键保证幂等。
7. 消费者批量写 MySQL。
8. 监控队列积压、消费耗时、失败次数和 DLQ 数量。
9. 服务关闭时等待消费者处理完当前消息。

### 交付物

- RabbitMQ Compose 服务
- 生产者、消费者和配置类
- DLQ 重放说明
- MQ 故障演练记录

### 验收标准

- RabbitMQ 停止 30 秒后，业务请求仍可正常返回。
- 消息恢复后能继续消费。
- 重复消息不会产生重复日志。
- 失败消息可进入 DLQ 并手动重放。
- 消费积压可观测。

---

## 阶段 4：多实例部署与故障演练（可选）

**周期：7～10 天**  
**优先级：P1，建议在阶段 0～3 完成后再做**

### 任务

1. Nginx 配置两个 backend 实例。
2. JWT 保持无状态，不引入 Sticky Session。
3. 上传文件迁移到 MinIO。
4. 定时任务增加分布式锁，避免重复执行。
5. 健康检查和就绪检查。
6. 增加优雅停机。
7. 故障演练：
   - 杀掉一个 backend 实例。
   - Redis 停止 30 秒。
   - RabbitMQ 停止 30 秒。
   - 单实例高负载。
8. 记录故障期间错误率、恢复时间和数据一致性。

### 交付物

- `docs/ARCHITECTURE.md`
- `docs/FAILOVER_DRILL.md`
- Nginx 配置
- MinIO 接入说明
- 多实例启动说明

### 验收标准

- 单实例宕机时请求能自动切换。
- 文件上传不依赖单台机器本地目录。
- 定时任务不会重复执行。
- 消息消费保持幂等。
- 故障期间错误率在预设范围内。

> 这一阶段可以显著提升项目亮点，但必须在基础性能、测试、文档完成之后进行。

---

## 阶段 5：文档、数据与简历包装

**周期：3～4 天**  
**优先级：P0**

### 交付物

1. `docs/ARCHITECTURE.md`
2. `docs/ADR.md`
3. `docs/BENCHMARK_BASELINE.md`
4. `docs/BENCHMARK_RESULT.md`
5. `docs/RUNBOOK.md`
6. `docs/FAILOVER_DRILL.md`
7. `loadtest/k6/`
8. 架构图、时序图、缓存 Key 图
9. README 项目亮点重写

### README 必须包含

- 项目定位
- 系统架构图
- 核心数据流
- 性能优化前后对比
- 缓存策略
- MQ 可靠性设计
- 测试策略
- 部署与压测命令
- 已知限制与后续计划

---

## 7. 测试与验证方案

### 7.1 测试分层

| 层级 | 工具 | 目标 |
|---|---|---|
| 单元测试 | JUnit 5 + Mockito | 业务规则、权限、边界条件 |
| 集成测试 | Testcontainers | MySQL、Redis、RabbitMQ 真实行为 |
| API 测试 | MockMvc / RestAssured | HTTP 状态码、鉴权、参数校验 |
| 压测 | k6 | QPS、P95、P99、错误率、恢复能力 |
| 故障演练 | Docker Compose / 手工停服务 | 降级、重连、DLQ、故障转移 |

### 7.2 必测场景

- 文章分页第 1 页、中间页、空页。
- `page=0`、`limit=0`、`limit>100`。
- 标签筛选。
- 标签搜索和正文搜索。
- 点赞重复提交。
- 同一用户取消点赞。
- 匿名点赞失败。
- Redis 不可用时公开页面降级。
- RabbitMQ 停止后请求仍成功。
- 重复消息消费。
- 多实例下定时任务只执行一次。

### 7.3 压测场景

1. **读多写少**
   - 90% 文章列表/详情读取
   - 10% 点赞、留言
2. **热点文章**
   - 单篇文章详情占 70% 请求
3. **标签筛选**
   - 热门标签与冷门标签混合
4. **缓存失效瞬间**
   - 更新文章后并发读取
5. **故障场景**
   - Redis 停止
   - RabbitMQ 停止
   - backend-1 停止

### 7.4 指标记录模板

| 指标 | 优化前 | 优化后 | 变化 |
|---|---:|---:|---:|
| 平均响应时间 | 待测 | 待测 | 待测 |
| P95 | 待测 | 待测 | 待测 |
| P99 | 待测 | 待测 | 待测 |
| 最大 QPS | 待测 | 待测 | 待测 |
| 错误率 | 待测 | 待测 | 待测 |
| MySQL 读 QPS | 待测 | 待测 | 待测 |
| Redis 命中率 | 待测 | 待测 | 待测 |
| JVM GC 次数 | 待测 | 待测 | 待测 |
| MQ 消费积压 | 待测 | 待测 | 待测 |

> 所有数字必须来自真实压测，不允许预先填写或编造。

---

## 8. 面试官可能追问的问题

### 性能

- 为什么先做可观测性，而不是先加缓存？
- 缓存 Key 怎么设计？TTL 多长？
- 缓存雪崩、穿透、击穿分别怎么处理？
- 为什么不用 Caffeine + Redis 两级缓存？
- 为什么点赞不用每次 COUNT？
- 浏览量丢失怎么办？
- 如何校准 Redis 与 MySQL 的计数差异？

### 数据库

- `JOIN FETCH + Page` 为什么有问题？
- 两段式分页是否会有数据漂移？
- FULLTEXT 与 Elasticsearch 的取舍是什么？
- 索引为什么没有命中？
- 如何判断慢 SQL？

### MQ

- 为什么这里需要 MQ，而不是 `@Async`？
- 为什么选 RabbitMQ，不选 Kafka？
- 消息重复消费怎么办？
- 消息丢失可能发生在哪里？
- 消费者挂了怎么办？
- DLQ 中的消息如何重放？
- 队列积压如何监控和限流？

### 分布式

- 为什么保持单体而不是微服务？
- 两个实例下定时任务如何防止重复？
- 本地文件上传为什么要改 MinIO？
- 单实例宕机时如何保证请求不丢失？
- JWT 无状态在水平扩展下有什么注意点？

---

## 9. 代码热点清单

| 热点 | 位置 | 建议 |
|---|---|---|
| 文章集合分页 | `src/main/java/com/aston/blog/repository/PostRepository.java` | 改为两段式分页 |
| 文章搜索 | `PostRepository.search()` | MySQL FULLTEXT |
| 笔记 N+1 | `src/main/java/com/aston/blog/Service/impl/NoteServiceImpl.java` | 批量查询评论 |
| 标签计数 N+1 | `src/main/java/com/aston/blog/Service/impl/TagServiceImpl.java` | 一次 GROUP BY |
| 访客日志异步 | `src/main/java/com/aston/blog/Service/impl/VisitLogServiceImpl.java` | 专用线程池，后续迁 RabbitMQ |
| 浏览量刷库 | `src/main/java/com/aston/blog/task/ViewCountFlushTask.java` | 指标、幂等、多实例锁 |
| 点赞查询 | `src/main/java/com/aston/blog/Service/impl/PostLikeServiceImpl.java` | 唯一约束 + 原子计数 |
| 缓存配置 | `src/main/java/com/aston/blog/config/CacheConfig.java` | TTL 抖动、指标、失效策略 |
| 上传文件 | `src/main/java/com/aston/blog/config/UploadPaths.java` | 多实例时迁 MinIO |
| 安全与限流 | `src/main/java/com/aston/blog/config/SecurityInterceptor.java` | 指标、误报评估、统一限流 |

---

## 10. 时间方案

### 10.1 六周完整方案

| 周 | 目标 | 产出 |
|---|---|---|
| 第 1 周 | Actuator、Micrometer、Prometheus、Grafana、k6 | 基线报告 |
| 第 2 周 | SQL、索引、分页、N+1、FULLTEXT | 查询优化报告 |
| 第 3 周 | Redis 缓存、浏览量、点赞、连接池 | 缓存与热点写报告 |
| 第 4 周 | RabbitMQ 访问日志、重试、DLQ、幂等 | 可靠异步链路 |
| 第 5 周 | 可选多实例、Nginx、MinIO、故障演练 | 故障转移报告 |
| 第 6 周 | README、架构图、ADR、Runbook、简历 | 完整项目包装 |

### 10.2 两周压缩方案

只做：

1. Actuator + Micrometer + k6 基线。
2. 两段式分页。
3. N+1 修复。
4. FULLTEXT 搜索。
5. Redis 缓存策略和指标。
6. Benchmark 文档和 README 改写。

明确不做：

- RabbitMQ
- 多实例
- MinIO
- 分布式锁

两周方案的目标是“一个扎实、有数据的单体项目”，而不是半成品分布式项目。

---

## 11. 立即执行清单

按顺序执行，不跳步：

- [x] 停止新增业务功能，转入性能与可靠性改造。
- [x] 增加 Actuator 和 Micrometer。
- [x] 建立 Prometheus 抓取配置。
- [x] 导入 Grafana Dashboard（当前 14 个面板）。
- [x] 编写 k6 基线脚本（文章列表、详情、标签、搜索、登录、点赞、留言）。
- [x] 压测并记录 P95/P99、QPS、错误率。
- [x] 开启慢查询日志并采集慢 SQL。
- [x] 记录 Hikari 和 Redis 指标（Hikari 采样见 `docs/HIKARI_POOL_SAMPLING.md`）。
- [x] 修复文章分页查询（两段式分页）。
- [x] 修复笔记 N+1。
- [x] 修复标签统计 N+1。
- [x] 增加 FULLTEXT 搜索。
- [x] 做索引前后 `EXPLAIN` 对比（MySQL 8.0.12 不支持 `EXPLAIN ANALYZE`，使用 `EXPLAIN FORMAT=JSON`）。
- [x] 补 Testcontainers 集成测试（本机无 Docker，自动跳过；CI 需执行）。
- [x] 整理 `docs/BENCHMARK_QUERY.md` 查询优化汇总。
- [x] 在线人数 Redis 故障指标与返回 0 降级（`docs/REDIS_FAILURE_POLICIES.md`）。
- [x] 留言限流 Redis 故障 fail-open 指标。
- [x] 登录失败计数与 IP 封禁 Redis 故障 fail-open 指标。
- [x] 分布式锁获取/释放失败指标与持锁跳过指标。
- [ ] 完善缓存失效策略（TTL 抖动、精确失效、避免 `allEntries=true`）。 ← 当前 P0
- [x] 增加 Redis 不可用时降级查 MySQL（`docs/CACHE_RESILIENCE.md`）。
- [ ] 增加热点 Key 互斥回源，防止缓存击穿。 ← 下一步 P0
- [x] 显式配置 Hikari：`minimum-idle=10`、`maximum-pool-size=20`，并完成压测验证。
- [ ] 点赞计数原子化与周期性校准。
- [x] 输出 Benchmark 报告。
- [ ] 完成阶段 2 后再决定是否进入 RabbitMQ 阶段。

---

## 12. 完成标准

整个路线完成时，项目应该能回答下面这些问题：

### 性能

- [x] 有优化前后的压测数据（`BENCHMARK_BASELINE.md`、`BENCHMARK_PHASE1.md`、`BENCHMARK_N1_2026-11-04.md`）。
- [x] 能解释 P95/P99 的主要瓶颈（Hikari pending、索引缺失、缓存掩盖数据库压力）。
- [x] 能证明缓存真正降低了数据库压力（`BENCHMARK_PHASE1.md` 缓存开/关对比）。
- [x] 能展示慢 SQL 改善前后的执行计划（FULLTEXT、笔记评论索引、`EXPLAIN FORMAT=JSON`）。

### 可靠性

- [x] Redis 不可用时核心读接口能降级（文章列表、标签接口真实故障验证通过）。
- [ ] RabbitMQ 不可用时业务请求不失败。
- [ ] 消息重复消费不会产生重复数据。
- [ ] 失败消息有 DLQ 和重放方案。
- [x] 定时任务在多实例下不会重复执行（Redis 分布式锁已接入浏览量刷库、日志聚合、缓存预热）。

### 测试

- [x] 单元测试覆盖权限、分页、幂等、异常（当前 62 个通过，排除受沙箱临时目录影响的 `LocalFileStorageTest`）。
- [ ] Testcontainers 覆盖 MySQL、Redis、RabbitMQ。
- [x] k6 脚本可重复运行（`loadtest/k6/`）。
- [x] CI 能执行编译、测试和基础构建（GitHub Actions 已配置）。

### 文档

- [ ] 有架构图。
- [ ] 有 ADR 记录关键取舍（路线文档已有决策表，但独立 `ADR.md` 尚未整理）。
- [x] 有 Benchmark 报告。
- [ ] 有 Runbook。
- [x] 有故障演练记录（`PHASE2_RELIABILITY_REPORT.md` 中的双实例故障转移演练）。
- [ ] README 不再只是功能列表。

### 简历

- [ ] 每条亮点都有问题、方案、数据和取舍。
- [ ] 不写“精通高并发”。
- [ ] 不写没有测过的 QPS。
- [ ] 不把单体包装成微服务。
- [ ] 能解释为什么没有上某些技术。

---

## 13. 简历表述模板

> 以下数字必须压测后填写。

**性能优化**

> 针对文章列表分页、标签统计和笔记列表 N+1 查询问题，完成两段式分页、批量查询、索引与 MySQL FULLTEXT 改造；通过 `EXPLAIN FORMAT=JSON` 查询计划和 k6 将核心读接口 P95 从 ____ ms 降至 ____ ms，数据库读 QPS 降低 ____%。

**缓存与热点写**

> 设计 Redis 缓存和浏览量批量落库方案，增加合理 TTL、缓存失效与降级策略，使缓存命中率达到 ____%，高峰期 MySQL 写压力降低 ____%。

**消息队列**

> 使用 RabbitMQ 解耦访问日志写入，实现 Publisher Confirm、手动 ACK、有限重试、DLQ 和幂等消费，支持批量落库与积压监控；消息队列故障期间业务请求错误率保持在 ____% 以下。

**多实例部署**

> 使用 Nginx、Redis、MinIO、RabbitMQ 完成双实例单体部署，验证单实例宕机自动切换、文件共享和定时任务防重复执行，故障恢复时间小于 ____ 秒。

**测试与工程化**

> 使用 Testcontainers 构建 MySQL、Redis、RabbitMQ 集成测试，结合 JUnit、Mockito 和 k6 覆盖权限、分页、幂等、缓存降级和故障恢复场景。

---

## 14. 最终建议

优先级从高到低：

1. 可观测性和压测基线
2. SQL、分页、N+1、索引
3. 缓存和热点写
4. RabbitMQ 可靠异步
5. 多实例与故障演练
6. 文档和简历包装

不要从第 4 步开始。

**先证明问题，再优化；先有数据，再写简历。**
