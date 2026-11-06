# 阶段 2：缓存与热点写优化验收报告

> 项目：Aston's Blog
> 完成日期：2026-11-06
> 范围：TTL 随机抖动、精确缓存失效、热点 Key 互斥回源、点赞原子计数与周期校准
> 结论：阶段 2 的四项收尾任务已完成，相关单元测试通过，核心接口烟测通过。

---

## 1. 本轮完成内容

| 项目 | 实现结果 | 主要位置 |
|---|---|---|
| TTL 随机抖动 | 每个缓存条目写入时在 8～12 分钟之间随机生成 TTL | `JitterTtlFunction.java`、`CacheConfig.java` |
| 精确缓存失效 | 详情/标签/归档/统计精确删除；列表/搜索用版本号逻辑失效 | `CacheInvalidationService.java`、`CacheVersionService.java`、`PostServiceImpl.java` |
| 热点 Key 互斥回源 | 单实例固定分段本地锁 + Redis 分布式锁尝试；Redis 锁不可用时可用性优先降级 | `CacheStampedeGuard.java`、`ResilientCache.java` |
| 点赞计数 | `INSERT IGNORE` / `DELETE` 与实际行数驱动原子加减；定时校准不一致计数 | `PostLikeServiceImpl.java`、`PostRepository.java`、`PostLikeCountCalibrationTask.java` |

对应本地提交：

```text
c39ffec perf: add per-entry cache ttl jitter
22cb89e perf: invalidate caches precisely with versioned list keys
4e76ae4 perf: guard hot cache keys against stampedes
b2dbb96 perf: make post like counts atomic and calibrate periodically
```

---

## 2. TTL 随机抖动

### 2.1 方案

缓存基础 TTL 仍是 10 分钟，但每个稳定对象写入 Redis 时，实际 TTL 在 **8～12 分钟**内随机取值。

```java
.entryTtl(new JitterTtlFunction(Duration.ofMinutes(8), Duration.ofMinutes(12)))
```

### 2.2 为什么

如果一批缓存 key 在同一时间被写入，固定 TTL 会让它们在 10 分钟后同时过期，形成缓存雪崩窗口。随机抖动把过期时间打散，降低同一瞬间大量请求回源 MySQL 的概率。

### 2.3 参数与边界

| 参数 | 值 | 理由 |
|---|---:|---|
| 最小 TTL | 8 分钟 | 比基础值少 2 分钟，仍保留足够缓存时长 |
| 最大 TTL | 12 分钟 | 比基础值多 2 分钟，抖动幅度约 ±20% |
| 随机粒度 | 秒 | 避免大量 key 落在同一毫秒级时间点 |

边界：

- TTL 只作用于 Spring Cache 的 Redis 条目，不影响浏览量等直接使用 `StringRedisTemplate` 的 key。
- Redis 不可用时不会写入缓存，仍由 `ResilientCache` 回源 MySQL。

---

## 3. 精确缓存失效

### 3.1 缓存 Key 设计

| 缓存 | Key / 失效方式 | 更新文章后的动作 |
|---|---|---|
| `postDetail` | 文章 slug | 精确删除旧 slug 和新 slug |
| `archive` | 无参缓存 key（`SimpleKey.EMPTY`） | 精确删除该 key |
| `tags` | 无参缓存 key（`SimpleKey.EMPTY`） | 精确删除该 key |
| `stats` | `summary` | 精确删除 `summary` |
| `publicPosts` | `v:<version>:p:<page>:l:<limit>:t:<tag>` | 递增 Redis 版本号，旧 key 逻辑失效 |
| `search` | `q:<version>:<query>:p:<page>:l:<limit>` | 递增 Redis 版本号，旧 key 逻辑失效 |

文章列表和搜索的 key 带版本号，因此不需要枚举所有分页、标签和搜索词，也不需要执行 `allEntries=true` 清空整个 cache。

### 3.2 事务边界

缓存失效注册在数据库事务提交之后执行：

```text
更新数据库
-> 事务提交
-> 删除精确 key / 递增列表版本号
```

这样不会出现“数据库事务回滚，但缓存已经被删除或版本被推进”的情况。

### 3.3 为什么不用 `allEntries=true`

`allEntries=true` 会把同一个 cache 下的所有分页与筛选组合一起清掉。文章一更新，所有列表请求都需要重新回源，热点流量高时会放大数据库压力。版本号方案只让旧版本 key 失效，成本更可控。

### 3.4 已知边界

- 如果版本号递增时 Redis 恰好故障，旧版本 key 可能保留到 TTL 到期；但 Redis 故障期间读路径本身会降级回源 MySQL。
- 如果 Redis 只发生短暂写入失败、随后恢复，旧的列表缓存仍可能在剩余 TTL 内被命中。该窗口最长约 12 分钟，属于当前方案的可用性优先取舍。
- `archive` 和 `tags` 是无参方法，因此使用 `SimpleKey.EMPTY`；如果以后改成带参数缓存，需要同步修改失效 key。

---

## 4. 热点 Key 互斥回源

### 4.1 请求路径

```text
@Cacheable get
  -> ResilientCache.get(key, loader)
  -> 先查缓存
  -> 未命中则进入 CacheStampedeGuard
  -> 单实例本地锁按 cache + key hash 分段
  -> 尝试获取 Redis 分布式锁（TTL 10 秒）
  -> 再次检查缓存
  -> 仍未命中才执行 loader
  -> 写回缓存并释放锁
```

### 4.2 单实例保护

使用 256 个固定 `ReentrantLock`，按 `cacheName + key` 的 hash 分配锁。这样不需要每次请求创建锁对象，也能让同一热点 key 在单实例内只有一个请求执行回源。

### 4.3 多实例保护与降级

跨实例会尝试 Redis 锁：

```text
cache-load:<cacheName>:<key>
```

锁 TTL 为 10 秒，释放时比较随机 token，避免误删其他实例持有的锁。

重要边界：

> 这不是严格的全局互斥。如果某个实例没有抢到 Redis 锁，当前实现会让它继续执行本地回源，而不是阻塞等待。这是“可用性优先”的降级：单实例内不会重复回源，但跨实例在锁竞争时仍可能发生少量重复查询。

如果未来要求严格跨实例只回源一次，需要增加“轮询等待锁 + 等待后再次查缓存 + 超时后降级”的协调逻辑，并接受请求延迟上升。

---

## 5. 点赞原子计数与周期校准

### 5.1 点赞流程

```text
尝试 INSERT IGNORE post_likes(post_id, user_id)
  -> 插入成功：posts.like_count + 1
  -> 插入失败：说明已经点赞，执行 DELETE
       -> 删除成功：posts.like_count - 1
       -> 删除失败：说明已被并发请求取消，不再递减
```

关键点：

- `post_likes(post_id, user_id)` 唯一约束负责防止重复点赞记录。
- 只有实际插入/删除行数大于 0 才修改计数，避免并发请求重复加减。
- 点赞记录和计数的修改在同一个 `@Transactional` 方法中执行。
- 读取点赞状态和计数时不再对每次请求执行 `COUNT(*)`。

### 5.2 周期校准

`PostLikeCountCalibrationTask` 默认每小时执行一次，启动后延迟 5 分钟执行首次校准：

```text
posts.like_count
  vs
COUNT(post_likes GROUP BY post_id)
```

只更新不一致的文章，不扫描结果去逐篇更新。

配置项：

| 配置 | 默认值 | 说明 |
|---|---:|---|
| `blog.post-like.calibration.enabled` | `true` | 是否启用校准 |
| `blog.post-like.calibration.interval-ms` | `3600000` | 每小时执行一次 |
| `blog.post-like.calibration.initial-delay-ms` | `300000` | 启动后 5 分钟首次执行 |

任务使用 Redis 分布式锁 `task:post-like-count-calibration`，锁 TTL 为 10 分钟，避免多实例重复执行；任务耗时通过 `blog.task.duration{task="post-like-count-calibration"}` 记录。

### 5.3 已知边界

- 计数校准是最终一致性，不是强实时；极端崩溃后可能有一个校准周期内的短暂偏差。
- 点赞业务仍依赖数据库事务，若数据库写入失败，整个点赞事务回滚。
- 当前只对文章点赞做原子计数；其他计数型业务如留言点赞未在本轮范围内。

---

## 6. 验证结果

### 6.1 本轮相关测试

使用 JDK 23 执行：

```powershell
mvn -q -o -f pom-bench.xml "-Dtest=JitterTtlFunctionTest,CacheInvalidationServiceTest,PostServiceCacheInvalidationTest,CacheStampedeGuardTest,ResilientCacheTest,PostLikeServiceImplTest,PostLikeCountCalibrationTaskTest" test
```

结果：

```text
7 个测试类，17 个测试，0 失败，0 错误
```

完整回归（排除受当前 Windows 临时目录权限影响的 `LocalFileStorageTest`）：

```text
22 个测试类，89 个测试，0 失败，0 错误，4 个 Testcontainers 用例跳过
```

覆盖点：

- TTL 始终落在 8～12 分钟范围内；
- 非法 TTL 范围被拒绝；
- 文章变更后精确 key 删除和版本号递增；
- 文章写操作不再使用大范围 `allEntries` 清理；
- 热点 key 本地锁与 Redis 锁释放；
- Redis 锁不可用时仍能回源；
- Redis 读取、写入、删除失败不阻断业务；
- 点赞插入/删除与实际计数变更；
- 校准任务持锁执行并记录耗时。

### 6.2 接口烟测

当前 8080 实例健康检查：

```json
{"groups":["liveness","readiness"],"status":"UP"}
```

接口结果：

| 接口 | 状态 | 结果 |
|---|---|---|
| `GET /api/public/posts?page=1&limit=5` | 200 | 返回 5 条文章 |
| `GET /api/public/search?q=test&page=1&limit=5` | 200 | 返回 3 条搜索结果 |

> 本轮烟测用于确认改动后核心读路径仍可用；未把短时间请求当作正式高并发性能结论。正式压测数据见 `docs/BENCHMARK_BASELINE.md`、`docs/BENCHMARK_PHASE1.md` 和 `docs/HIKARI_POOL_SAMPLING.md`。

---

## 7. 决策回填

| 决策点 | 选择 | 落点 |
|---|---|---|
| TTL 抖动区间 | 8～12 分钟 | `CacheConfig.java` |
| 随机粒度 | 秒级 | `JitterTtlFunction.java` |
| 列表缓存失效 | Redis 版本号逻辑失效 | `CacheVersionService.java` |
| 详情缓存失效 | 旧/新 slug 精确删除 | `CacheInvalidationService.java` |
| 无参缓存失效 | `SimpleKey.EMPTY` | `CacheInvalidationService.java` |
| 单实例防击穿 | 256 个分段本地锁 | `CacheStampedeGuard.java` |
| 多实例锁 | Redis token + TTL 10 秒 | `CacheStampedeGuard.java`、`RedisDistributedLock.java` |
| 点赞幂等 | 数据库唯一键 + 实际影响行数 | `PostLikeRepository.java` |
| 点赞计数 | SQL 原子加减 | `PostRepository.java` |
| 点赞校准 | 每小时、首次延迟 5 分钟、分布式锁 | `PostLikeCountCalibrationTask.java` |

---

## 8. 阶段 2 完成结论

阶段 2 已完成以下闭环：

- 缓存不再使用固定 TTL，具备基础雪崩缓解能力；
- 文章更新不再清空整个列表缓存，改为精确删除或版本号失效；
- 热点 key 在单实例内有明确回源保护，多实例有 Redis 锁尝试和可用性降级；
- 点赞计数从“每次 COUNT(*)”改为原子计数，并具备周期校准兜底；
- Redis 故障、缓存回源、点赞事务和校准任务都有测试或接口验证。

剩余工作不属于阶段 2：

- 在 Docker/CI 环境实际运行 Testcontainers；
- 如进入阶段 3，只选择“访问日志异步写入”这一条 RabbitMQ 链路；
- 若要求严格跨实例热点回源互斥，需要单独决定是否增加等待与超时策略。
