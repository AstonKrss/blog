# 阶段 0 性能基线报告

> 项目：Aston's Blog  
> 日期：2026-11-02  
> 环境：Windows 本地开发机，Spring Boot 4.0.5，Java 23，MySQL 8.0.12，Redis 7，k6 v2.3.0  
> 结论：系统在小数据量、热缓存下读路径很快；当前真正的风险不是“Java 慢”，而是数据量、连接池、缓存命中和异步日志链路。

---

## 1. 基线目的

本阶段只做三件事：

1. 建立可观测性：能看见 HTTP、JVM、Hikari、Redis、缓存和定时任务指标。
2. 建立压测基线：知道当前每个接口的真实延迟和吞吐。
3. 找出至少一个真实瓶颈，而不是凭感觉加 MQ 或分布式。

本报告中的数字全部来自本机实测，不代表生产容量。

---

## 2. 测试数据规模

| 数据 | 数量 |
|---|---:|
| 已发布文章 | 17 |
| 草稿 | 4 |
| 标签 | 9 |
| 文章-标签关联 | 1 |
| visit_logs | 3716 |
| attack_logs | 23 |

> 重点：文章只有 17 篇，标签关联只有 1 条。因此当前读接口的延迟主要反映“空库/小库 + 热缓存”，不能证明大数据量下的性能。

---

## 3. 压测场景与结果

### 3.1 读路径主基线

脚本：`loadtest/k6/baseline-read.js`

场景：首页文章列表、文章详情、标签列表、搜索、站点统计混合读，5→10→25→50 VU 阶梯，持续 4 分钟，每轮 `sleep(0.1)`。

| 指标 | 结果 |
|---|---:|
| 总请求数 | 44,117 |
| 平均 RPS | 183.78 |
| 平均延迟 | 1.66 ms |
| P90 | 2.60 ms |
| P95 | 3.05 ms |
| P99 | 4.22 ms |
| 最大延迟 | 130.02 ms |
| 错误率 | 0.00% |

> 这是“固定节奏 + 热缓存”的结果，不是最大吞吐。`iteration_duration` 约 102ms，说明每轮请求后 sleep 0.1s，50 VU 并没有把服务打满。

### 3.2 标签筛选

脚本：`loadtest/k6/tag-filter.js`

| 指标 | 结果 |
|---|---:|
| 总请求数 | 7,262 |
| 平均 RPS | 90.70 |
| 平均延迟 | 1.66 ms |
| P95 | 2.36 ms |
| P99 | 3.47 ms |
| 错误率 | 0.00% |

> 第一次运行时该接口 100% 返回 400，根因是 `getPublicPosts` 在 Session 关闭后访问 `post.tags`，触发 `LazyInitializationException`。已通过 `@Transactional(readOnly = true)` 修复，修复后重跑得到上表。

### 3.3 点赞状态读取

脚本：`loadtest/k6/like-read.js`

| 指标 | 结果 |
|---|---:|
| 总请求数 | 3,673 |
| 平均 RPS | 45.87 |
| 平均延迟 | 1.64 ms |
| P95 | 2.23 ms |
| P99 | 3.27 ms |
| 错误率 | 0.00% |

### 3.4 登录

脚本：`loadtest/k6/login.js`

使用临时测试账号，BCrypt 强度 10，压测后已删除账号和登录审计记录。

| 指标 | 结果 |
|---|---:|
| 总请求数 | 523 |
| 平均 RPS | 8.63 |
| 平均延迟 | 76.20 ms |
| P95 | 81.77 ms |
| 错误率 | 0.00% |

> 登录延迟显著高于读接口，符合 BCrypt 的设计目标：故意让单次校验变慢，增加暴力破解成本。这不是“性能 bug”，不能为了压测把 BCrypt 降级。

### 3.5 留言写路径

脚本：`loadtest/k6/guestbook-write.js`

| 指标 | 结果 |
|---|---:|
| 总请求数 | 60 |
| 平均 RPS | 1.99 |
| 成功写入 | 5 |
| 被限流 429 | 55 |
| P95 | 9.79 ms |

> 留言接口限流为 5 次/10 分钟/IP，因此 55 次 429 是预期行为。该场景测的是“限流后的响应耗时”，不是留言写入吞吐。测试留言已清理。

---

## 4. 服务端指标

以下数据来自 Prometheus，在修复后 1 分钟确认性压测中采集，用于补充分接口服务端视角。

| 指标 | 结果 |
|---|---:|
| `/api/public/posts` P95 | 1.72 ms |
| `/api/public/posts` P99 | 3.52 ms |
| 文章详情 P95 | 2.02 ms |
| 搜索 P95 | 3.45 ms |
| 标签列表 P95 | 1.54 ms |
| 站点统计 P95 | 1.56 ms |
| `publicPosts` 缓存命中率 | 99.83% |
| Hikari 活跃连接最大值 | 10 / 10 |
| Hikari 等待连接最大值 | 7 |
| Hikari 获取连接平均耗时 | 26.6 µs |
| JVM GC 暂停次数 | 7.83 次/分钟 |
| GC 平均暂停 | 2.4 ms |
| JVM 堆已用 | 179 MB |
| JVM 堆上限 | 3916 MB |
| JVM 线程数 | 50 |
| 5xx 比例 | 0% |

### 关键观察

1. **Hikari 连接池被打满过**：20 VU 时活跃连接达到 10/10，等待连接达到 7。获取连接平均耗时仍只有 26.6µs，说明等待时间短，但这是第一个需要关注的容量信号。
2. **缓存命中率极高**：`publicPosts` 达到 99.83%，说明压测主要打在 Redis 缓存上，数据库真实读压力被掩盖。
3. **GC 不是当前瓶颈**：G1 年轻代 GC 平均暂停 2.4ms，没有观察到 Old GC。
4. **登录是慢路径**：P95 81.77ms，主要成本是 BCrypt，不是数据库。
5. **数据量太小**：17 篇文章不能代表生产数据量，下一阶段必须补大数据量测试。

---

## 5. 本阶段发现并修复的真实缺陷

### BUG：标签筛选触发 LazyInitializationException

- 位置：`PostServiceImpl.getPublicPosts`
- 现象：`/api/public/posts?tag=test` 返回 400，日志为 `Cannot lazily initialize collection of role 'com.aston.blog.entity.Post.tags' ... (no session)`
- 原因：`findByStatusAndTags` 返回的 `Post` 没有 fetch tags/author，方法又不在事务内，转换 VO 时 Session 已关闭。
- 修复：给 `getPublicPosts` 增加 `@Transactional(readOnly = true)`。
- 验证：标签筛选从 100% 失败变为 100% 成功，P95 2.36ms。

---

## 6. 当前不能下的结论

以下结论**不能**从本基线得出：

- 不能说“系统支持 184 QPS”作为生产容量，因为测试是固定节奏且数据量极小。
- 不能说“数据库不是瓶颈”，因为缓存命中率 99.83%，数据库路径几乎没有被压到。
- 不能说“Hikari 配置足够”，因为已经出现 10/10 和 pending=7。
- 不能说“GC 不需要调”，因为堆只用了 179MB / 3916MB，尚未经历大堆压力。
- 不能说“MQ 能提升性能”，本阶段没有证明异步日志是当前主要瓶颈。

---

## 7. 下一阶段建议

按优先级：

1. **阶段 1：数据库与查询路径优化**
   - 两段式分页，避免 `JOIN FETCH + Page`。
   - 修笔记 N+1、标签统计 N+1。
   - 搜索改 FULLTEXT。
   - 用大数据量（例如 10 万篇文章、100 万访问日志）重跑基线。

2. **阶段 2：缓存与连接池**
   - 明确缓存 TTL 和失效策略。
   - 评估 Hikari `maximum-pool-size`，不要盲目调大。
   - 补缓存命中率面板和 Redis 命令耗时。

3. **阶段 3：RabbitMQ**
   - 只做访问日志异步链路。
   - 先证明 `@Async + 外部 IP 查询` 对请求延迟和可靠性有影响，再引入 MQ。

---

## 8. 复现命令

```powershell
# 1. 启动后端
mvn spring-boot:run

# 2. 启动 Prometheus
.\ops\observability\start-prometheus.ps1

# 3. 启动 Grafana
.\ops\observability\start-grafana.ps1

# 4. 读路径基线
k6 run -e BASE_URL=http://localhost:8080 loadtest/k6/baseline-read.js

# 5. 标签筛选
k6 run -e BASE_URL=http://localhost:8080 -e TAG=test loadtest/k6/tag-filter.js

# 6. 点赞读路径
k6 run -e BASE_URL=http://localhost:8080 -e POST_ID=<post-id> loadtest/k6/like-read.js

# 7. 登录（需要专用测试账号）
k6 run -e BASE_URL=http://localhost:8080 -e TEST_USER=<user> -e TEST_PASS=<pass> loadtest/k6/login.js

# 8. 留言写路径（会真实写入，默认关闭）
k6 run -e BASE_URL=http://localhost:8080 -e ENABLE_WRITE=1 loadtest/k6/guestbook-write.js
```

访问：

- 后端健康：`http://localhost:8080/actuator/health`
- Prometheus 指标：`http://localhost:8080/actuator/prometheus`
- Prometheus UI：`http://localhost:9090`
- Grafana：`http://localhost:3001`
- 基线看板：`Aston's Blog - 阶段0 性能基线`

---

## 9. 测试副作用

| 类型 | 处理 |
|---|---|
| 临时登录用户 `k6_login_test` | 已删除 |
| 该用户的 login_attempts | 已删除 |
| 留言测试数据 `k6-*` | 已删除 |
| 留言限流 Redis key | 已删除 |
| 文章 `test-article-123` 浏览量 | 被压测增加，未回滚（测试文章） |

> 如果希望基线完全不改变业务数据，后续应使用独立测试库或 Testcontainers。
