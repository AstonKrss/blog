# Aston's Blog

![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=fff)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-6DB33F?logo=springboot&logoColor=fff)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=fff)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=fff)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-4-FF6600?logo=rabbitmq&logoColor=fff)
![k6](https://img.shields.io/badge/k6-Load%20Test-7D64FF?logo=grafana&logoColor=fff)

**Aston's Blog** 是一个面向高读低写内容平台的全栈博客系统，同时也是一个 Java 后端性能与可靠性改造案例。项目保持**模块化单体**架构，不为了“分布式”而拆微服务，而是用可观测性、压测数据、SQL 优化、Redis 降级、RabbitMQ 可靠异步和多实例演练来证明每一项改造的价值。

前端为 **Next.js 15 App Router**，后端为 **Spring Boot 4 / Java 21**，数据层为 **MySQL 8 + Flyway + Redis 7**，异步链路使用 **RabbitMQ**，可选共享文件存储使用 **MinIO**。

---

## 目录

- [项目定位](#项目定位)
- [系统架构](#系统架构)
- [核心工程亮点](#核心工程亮点)
- [性能与可靠性数据](#性能与可靠性数据)
- [简历可写表述](#简历可写表述)
- [快速开始](#快速开始)
- [关键配置](#关键配置)
- [测试与验证](#测试与验证)
- [当前边界与后续计划](#当前边界与后续计划)
- [相关文档](#相关文档)

---

## 项目定位

这个项目不只是“功能叠加”，而是围绕一个明确目标改造：

> 在读多写少的博客场景下，建立可观测、可压测、可降级、可回放、可解释取舍的后端工程链路。

因此当前技术路线是：

```text
先观测和压测
  -> 修复 SQL / N+1 / 分页 / 索引
  -> 设计缓存边界、失效和降级
  -> 用一条 RabbitMQ 链路验证可靠异步
  -> 再进入双实例部署和故障演练
```

没有做以下事情，并且这是有意取舍：

- 不拆微服务；
- 不引入 Kubernetes；
- 不把所有业务都塞进 MQ；
- 不宣称“精通高并发”；
- 不使用没有压测数据的 QPS 结论。

---

## 系统架构

```text
                ┌──────────────┐
                │   Next.js    │
                │  App Router  │
                └──────┬───────┘
                       │ HTTP API
                       ▼
              ┌─────────────────┐
              │   Spring Boot   │
              │ Modular Monolith│
              └──┬───┬───┬───┬──┘
                 │   │   │   │
        MySQL ◄──┘   │   │   └──► RabbitMQ
        Redis  ◄─────┘   └────► MinIO（可选共享文件）
                       │
                 Prometheus / Grafana
```

### 访问日志异步链路

```text
HTTP afterCompletion
  -> VisitLoggingInterceptor
  -> VisitLogEventProducer
  -> blog.events (direct exchange)
       routing key: visit.recorded
  -> visit.log.write (durable queue)
  -> Batch Consumer
  -> MySQL visit_logs
  -> transaction commit
  -> manual ACK
```

失败路径：

```text
visit.log.write
  -> NACK(requeue=false)
  -> blog.dlx
       routing key: visit.log.write.dead
  -> visit.log.write.dlq
  -> 人工修复后重放
```

---

## 核心工程亮点

### 1. 可观测性与压测基线

已接入：

- Spring Boot Actuator
- Micrometer + Prometheus + Grafana
- HTTP 请求量、P50/P95/P99
- Hikari active / pending / acquire time / timeout
- Redis 命令与缓存命中率
- 定时任务耗时
- RabbitMQ Publisher / Consumer / queue 指标
- traceId 请求日志

压测工具：

- k6 覆盖文章列表、详情、标签、搜索、登录、点赞、留言等场景。
- 独立脚本采样 Hikari pending，避免 Prometheus 抓取间隔漏掉短峰值。

### 2. 数据库查询优化

在 50,000 篇文章、200,000 条文章标签关联、100,000 条笔记评论的数据集上完成：

- 文章列表从 `JOIN FETCH + Page` 改为两段式分页；
- 笔记列表 N+1 改为当前页批量查询；
- 标签统计从循环 `COUNT` 改为一次 `GROUP BY`；
- 搜索从 `LIKE '%keyword%'` 改为 MySQL FULLTEXT + UNION；
- 为笔记评论、标签、搜索等路径补充索引；
- 使用 `EXPLAIN FORMAT=JSON` 对比执行计划。

### 3. 缓存与热点写

缓存体系包含：

- 8～12 分钟 TTL 随机抖动，缓解同时过期；
- 文章详情、标签、归档、统计精确失效；
- 文章列表和搜索使用版本号逻辑失效，避免 `allEntries=true`；
- 单实例 256 个分段本地锁防止热点 Key 击穿；
- Redis 故障时 Spring Cache 统一回源 MySQL；
- 浏览量使用 Redis 增量 + batchId + MySQL 唯一键幂等落库；
- 点赞计数使用数据库原子更新 + 周期校准。

### 4. RabbitMQ 可靠异步

访问日志链路实现：

- Publisher Confirm；
- durable exchange / durable queue / persistent message；
- 手动 ACK；
- 最多 20 条批量消费；
- 批量失败后二分拆批，隔离坏消息；
- `event_id` 数据库唯一键幂等；
- 失败消息进入 DLQ；
- Management API 采集 queue messages / ready / unacked / consumers；
- Rabbit listener 与 Web 容器优雅停机。

### 5. 多实例基础

已具备：

- JWT 无状态认证，不依赖 Sticky Session；
- Redis 分布式锁保护定时任务；
- MinIO 存储抽象，为共享文件做准备；
- Nginx 双实例配置；
- 双实例启动与故障转移脚本；
- 后端和 Rabbit listener 优雅停机配置。

阶段 4 单机验证已完成：真实 Nginx、双实例分流、故障切换、CPU 资源隔离压测；真实 MinIO、双实例指标和完整故障矩阵延期。

---

## 性能与可靠性数据

以下数据来自本地压测和真实故障演练，具体条件见对应报告。

| 场景 | 优化前 | 优化后 / 验证结果 |
|---|---:|---:|
| 文章列表 P95（50k 文章数据集） | 6.78s | 3.14ms |
| 文章列表 P99 | 8.09s | 4.25ms |
| 笔记列表 SELECT 次数 | 约 42 次/请求 | 4 次/请求 |
| 搜索冷查询 | 约 6.19s | 0.3～0.6s |
| 搜索缓存后 P95 | - | 约 2.06ms |
| 笔记评论扫描行数 | 约 100,200 行/次 | 200 行/次 |
| `publicPosts` 缓存命中率 | - | 99.95% |
| `search` 缓存命中率 | - | 99.98% |
| Hikari 10 连接 / 100 VU P95 | 71.45ms，最大 pending 23 | - |
| Hikari 20 连接 / 100 VU P95 | - | 40.64ms，pending 0 |
| RabbitMQ 批量消费 | - | 一次 batch size 20，20 条全部落库 |
| RabbitMQ 停止 30 秒 | - | 10/10 业务请求 HTTP 200 |
| 重复 eventId | - | 数据库仍只有 1 行 |
| 坏消息 | - | 进入 DLQ，人工修复后重放成功 |
| 优雅停机 | - | Waiting for workers + graceful shutdown complete |

注意事项：

- 本地测试不能直接等同生产容量；
- 6.78s 到 3.14ms 的文章列表对比发生在缓存开启的大数据量实验中；
- 缓存关闭时数据库路径会明显饱和，这正是缓存成为当前系统容量边界的原因；
- RabbitMQ 访问日志生产端采用 fail-open，故障期间允许日志丢失；
- 单机资源隔离实验中，双实例在 1000/1500 RPS 两轮均无 dropped iterations，而单实例出现明显掉迭代。该结果证明应用层并行收益，但不等于两台独立服务器线性扩容，详见 docs/BENCHMARK_PHASE4_SCALING.md。

---

## 简历可写表述

以下表述可以直接改写进简历，建议选择 2～3 条，不要全部堆上。

### 数据库与查询优化

> 针对文章列表 `JOIN FETCH + Page`、笔记列表 N+1 和 `LIKE` 全表扫描问题，基于 5 万文章 / 20 万标签关联 / 10 万评论数据集完成两段式分页、批量加载、索引和 MySQL FULLTEXT 改造；使用 `EXPLAIN FORMAT=JSON` 与 k6 验证，文章列表 P95 从 6.78s 降至 3.14ms，笔记列表 SELECT 从约 42 次/请求降至 4 次/请求。

### 缓存与连接池

> 设计 Redis 缓存与热点写方案，实现 8～12 分钟 TTL 抖动、版本号精确失效、热点 Key 分段本地锁和 Redis 故障回源 MySQL；文章列表缓存命中率达 99.95%，搜索缓存命中率达 99.98%。通过 Hikari pending 采样将连接池从 10/100VU 的 P95 71.45ms、pending 23 调整为 20 连接下的 P95 40.64ms、pending 0。

### RabbitMQ 可靠异步

> 使用 RabbitMQ 解耦访问日志写入，设计 direct exchange、durable queue、Publisher Confirm、手动 ACK、批量消费、有限重试、DLQ 和 `event_id` 唯一键幂等；一批 20 条消息批量落库，坏消息二分拆批并进入 DLQ，人工修复后重放成功；RabbitMQ 停止 30 秒期间 10/10 业务请求返回 HTTP 200，恢复后消费者自动重连并继续落库。

### 工程化与测试

> 使用 Actuator、Micrometer、Prometheus、Grafana 和 k6 建立性能观测与压测基线，覆盖 HTTP、Hikari、Redis、RabbitMQ 和定时任务指标；后端 94 个测试通过，真实故障演练覆盖 Redis 降级、RabbitMQ 停服恢复、DLQ 重放和优雅停机。

### 面试时要能讲清的取舍

- 为什么保持模块化单体，而不是拆微服务；
- 为什么访问日志使用 fail-open，而不是 Outbox；
- 为什么 RabbitMQ Publisher Confirm 不等于业务处理完成；
- 为什么消费端必须 `event_id` 幂等；
- 为什么批量消费失败采用二分拆批；
- 为什么热点 Key 当前是单实例强保护、多实例可用性优先；
- 为什么没有引入 Elasticsearch、Kubernetes 或 Kafka。

---

## 快速开始

### 环境要求

| 组件 | 版本 / 说明 |
|---|---|
| Java | 21+ |
| Node.js | 22+ |
| MySQL | 8.0 |
| Redis | 7.x |
| RabbitMQ | 4.x / 3.13-management |
| Maven | 3.9+ |

### 启动后端

```bash
mvn spring-boot:run
```

默认端口：

```text
http://localhost:8080
```

健康检查：

```bash
curl http://localhost:8080/actuator/health
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问：

```text
http://localhost:3000
```

### 启动 RabbitMQ（WSL / Ubuntu）

```bash
sudo apt update
sudo apt install rabbitmq-server
sudo rabbitmq-plugins enable rabbitmq_management
sudo service rabbitmq-server start
```

管理页面：

```text
http://localhost:15672
```

### Docker Compose（如果本机有 Docker）

```bash
docker compose up -d --build
```

服务包括 MySQL、Redis、RabbitMQ、MinIO、backend、frontend。

---

## 关键配置

| 配置 | 默认值 | 说明 |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/myblog...` | MySQL 地址 |
| `SPRING_DATASOURCE_USERNAME` | `root` | 数据库用户 |
| `SPRING_DATASOURCE_PASSWORD` | `<通过环境变量注入>` | 数据库密码 |
| `SPRING_DATA_REDIS_HOST` | `localhost` | Redis 地址 |
| `SPRING_RABBITMQ_HOST` | `localhost` | RabbitMQ 地址 |
| `SPRING_RABBITMQ_USERNAME` | `guest` | RabbitMQ 用户 |
| `SPRING_RABBITMQ_PASSWORD` | `<通过环境变量注入>` | RabbitMQ 密码 |
| `SPRING_RABBITMQ_MANAGEMENT_URL` | `http://localhost:15672` | RabbitMQ Management API |
| `BLOG_CACHE_ENABLED` | `true` | 缓存开关 |
| `BLOG_VISIT_LOG_ENABLED` | `true` | 访问日志链路开关 |
| `BLOG_VISIT_LOG_MQ_BATCH_SIZE` | `20` | 消费批次大小 |
| `BLOG_STORAGE_TYPE` | `local` | `local` 或 `minio` |
| `BLOG_DB_POOL_MIN_IDLE` | `10` | Hikari 最小空闲连接 |
| `BLOG_DB_POOL_MAX_SIZE` | `20` | Hikari 最大连接数 |

---

## 测试与验证

后端测试：

```bash
mvn test
```

当前本机回归结果：

```text
25 个测试类
94 个测试
0 失败
0 错误
4 个 Testcontainers 用例因本机无 Docker 跳过
```

关键验证覆盖：

- 文章分页与 FULLTEXT 搜索；
- 缓存降级与 TTL；
- 点赞原子计数；
- 浏览量幂等落库；
- RabbitMQ 批量消费与 DLQ；
- RabbitMQ 停止 30 秒恢复；
- 优雅停机。

---

## 当前边界与后续计划

### 已知边界

1. RabbitMQ 生产端是 fail-open，故障期间访问日志可能丢失；若要求零丢失，需要 Outbox。
2. 批量消费重试是进程内重试，不是独立延迟重试队列。
3. 热点 Key 多实例回源是可用性优先，不保证严格全局只回源一次。
4. Testcontainers 在本机无 Docker 时自动跳过。
5. 真实 Nginx 双实例代理和单机资源隔离压测已完成；真实 MinIO 共享文件、独立多机扩容和完整双实例故障矩阵仍作为延期项。

### 当前路线状态

| 阶段 | 状态 |
|---|---|
| 阶段 0：可观测性与压测基线 | ✅ 100% |
| 阶段 1：数据库与查询优化 | ✅ 100% |
| 阶段 2：缓存与热点写优化 | ✅ 100% |
| 阶段 3：RabbitMQ 可靠异步链路 | ✅ 100% |
| 阶段 4：多实例部署与故障演练 | 🟡 约 75%，单机验收完成，生产级多机项延期 |
| 阶段 5：架构文档与简历包装 | 🟡 约 90%，文档与时序图已补齐 |

阶段 4 详细执行计划见：

- [docs/PHASE4_EXECUTION_PLAN.md](docs/PHASE4_EXECUTION_PLAN.md)
- [docs/BENCHMARK_PHASE4_SCALING.md](docs/BENCHMARK_PHASE4_SCALING.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/ADR.md](docs/ADR.md)
- [docs/RUNBOOK.md](docs/RUNBOOK.md)
- [docs/FAILOVER_DRILL.md](docs/FAILOVER_DRILL.md)

---

## 相关文档

| 文档 | 说明 |
|---|---|
| [docs/BENCHMARK_BASELINE.md](docs/BENCHMARK_BASELINE.md) | 初始压测基线 |
| [docs/BENCHMARK_QUERY.md](docs/BENCHMARK_QUERY.md) | SQL、N+1、索引和执行计划报告 |
| [docs/BENCHMARK_PHASE1.md](docs/BENCHMARK_PHASE1.md) | 大数据量压测与缓存对照 |
| [docs/CACHE_AND_HOT_WRITE_REPORT.md](docs/CACHE_AND_HOT_WRITE_REPORT.md) | 阶段 2 缓存与热点写正式报告 |
| [docs/RABBITMQ_VISIT_LOG.md](docs/RABBITMQ_VISIT_LOG.md) | 阶段 3 RabbitMQ 验收报告 |
| [docs/PHASE4_EXECUTION_PLAN.md](docs/PHASE4_EXECUTION_PLAN.md) | 阶段 4 多实例执行计划 |
| [docs/BENCHMARK_PHASE4_SCALING.md](docs/BENCHMARK_PHASE4_SCALING.md) | 单机资源隔离、缓存开关和双实例扩容验证 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 最终系统架构、核心数据流与故障边界 |
| [docs/ADR.md](docs/ADR.md) | 模块化单体、缓存、MQ、多实例等关键取舍 |
| [docs/BENCHMARK_RESULT.md](docs/BENCHMARK_RESULT.md) | 全阶段性能结果、限制和简历安全表述 |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | 启动、压测、日志、故障恢复和 DLQ 操作手册 |
| [docs/FAILOVER_DRILL.md](docs/FAILOVER_DRILL.md) | Redis、RabbitMQ、Nginx 和优雅停机演练结果 |`n| [docs/INTERVIEW_QA.md](docs/INTERVIEW_QA.md) | Java 后端面试问答和项目表达边界 |
| [docs/REDIS_FAILURE_POLICIES.md](docs/REDIS_FAILURE_POLICIES.md) | Redis 故障策略 |
| [docs/VIEW_COUNT_IDEMPOTENCY.md](docs/VIEW_COUNT_IDEMPOTENCY.md) | 浏览量幂等设计 |
| [docs/SECURITY.md](docs/SECURITY.md) | 安全架构说明 |
| [docs/SECURITY_TOOLS.md](docs/SECURITY_TOOLS.md) | 安全工具接口说明 |

---

## License

MIT
