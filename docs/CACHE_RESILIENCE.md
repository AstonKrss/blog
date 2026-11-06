# Redis 缓存故障降级

> 日期：2026-11-05  
> 范围：Spring Cache / RedisCacheManager 全局降级  
> 实现方式：方案 B，包装 CacheManager 和 Cache

---

## 1. 问题

原来 `@Cacheable` 直接依赖 `RedisCacheManager`。

Redis 正常但 key 不存在时：

```text
Redis 返回 miss -> 执行方法 -> 查 MySQL -> 写回 Redis
```

Redis 本身不可用时：

```text
Redis 连接异常 -> @Cacheable 在方法执行前抛错 -> 请求失败
```

也就是说：

- **缓存未命中**：正常回源。
- **Redis 不可用**：默认不会回源，而是抛异常。

---

## 2. 实现

新增：

- `ResilientCache`
- `ResilientCacheManager`

`CacheConfig` 创建 RedisCacheManager 后，统一包装：

```java
RedisCacheManager redisCacheManager = RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(config)
        .initialCacheNames(cacheNames)
        .enableStatistics()
        .build();

return new ResilientCacheManager(redisCacheManager, meterRegistry);
```

`ResilientCacheManager` 会包装所有缓存，不只 `publicPosts`：

```text
publicPosts
postDetail
search
tags
archive
stats
siteSettings
guestbook
allPhotos
approvedFriends
project
publicFootprints
publicProjects
```

因此所有走 Spring Cache 的 Redis 缓存共享同一套降级行为。

---

## 3. 降级行为

| 操作 | Redis 正常 | Redis 异常 |
|---|---|---|
| `get` | 命中返回缓存，未命中返回 null | 记录失败和回源指标，返回 null，让方法查 MySQL |
| `get(key, Callable)` | 按 Spring Cache 语义加载 | 捕获 Redis 异常，执行 `Callable` 回源 MySQL；写回失败也不影响返回 |
| `put` | 写入缓存 | 记录指标，不让业务请求失败 |
| `evict` | 删除缓存 | 记录指标；旧缓存等待 TTL 自然过期 |
| `clear` | 清空缓存 | 记录指标，不让业务请求失败 |

核心效果：

```text
Redis 挂了
-> ResilientCache.get 捕获异常
-> 返回 null（等价于缓存未命中）
-> @Cacheable 原方法执行
-> 查询 MySQL
-> 返回业务结果
```

---

## 4. 指标

新增 Micrometer 指标：

```text
cache_redis_failures_total{cache,operation}
cache_redis_fallbacks_total{cache}
```

含义：

- `failures`：某个缓存执行 get/put/evict/clear 时 Redis 操作失败次数。
- `fallbacks`：某个缓存因为 Redis get 失败而回源数据库的次数。

PromQL 示例：

```promql
sum by (cache, operation) (
  rate(cache_redis_failures_total{application="blog"}[1m])
)
```

```promql
sum by (cache) (
  rate(cache_redis_fallbacks_total{application="blog"}[1m])
)
```

---

## 5. 日志

Redis 故障时输出 warn，但每个缓存实例最多每 30 秒打印一次，避免 Redis 故障时日志被每个请求刷爆。

示例：

```text
Redis 缓存不可用，降级为无缓存 cache=publicPosts operation=get key=p:1:l:10:t:all reason=...
```

---

## 6. 实际故障验证

验证步骤：

1. 停止 Redis。
2. 启动使用新代码的 8080。
3. 调用核心接口。

结果：

| 接口 | Redis 状态 | HTTP | 结果 |
|---|---|---:|---|
| `GET /api/public/posts?page=1&limit=5` | DOWN | 200 | 5 条，total 17 |
| `GET /api/public/tags` | DOWN | 200 | 9 个标签 |

Prometheus 指标：

```text
cache_redis_failures_total{cache="publicPosts",operation="get"} 1
cache_redis_failures_total{cache="tags",operation="get"} 1
cache_redis_fallbacks_total{cache="publicPosts"} 1
cache_redis_fallbacks_total{cache="tags"} 1
```

说明：

- 文章列表和标签接口都回源 MySQL 成功。
- 不是只对 `publicPosts` 生效，`tags` 等其他缓存也被统一包装。
- 整体 `/actuator/health` 仍会显示 DOWN，因为 Redis 是外部依赖；`liveness/readiness` 仍为 UP。
- 业务接口不会因为 Redis 不可用而直接失败。

测试结束后已恢复 Redis，`/actuator/health` 回到 UP。

---

## 7. 测试

新增 `ResilientCacheTest`，覆盖：

- get 失败返回 null。
- `get(key, Callable)` 在 Redis 失败时执行回源加载器。
- 写回 Redis 失败不影响返回结果。
- put 失败不抛给业务。
- evict 失败不抛给业务。
- CacheManager 包装所有缓存并复用包装对象。

完整测试：

```text
71 个测试，0 失败，0 错误
4 个 Testcontainers 用例因本机无 Docker 跳过
```

---

## 8. 已知限制

1. Redis 失效操作失败时，旧缓存可能保留到 TTL 到期。
2. 当前只降级 Spring Cache，不自动降级所有直接使用 `StringRedisTemplate` 的业务，例如浏览量和在线人数。
3. Redis 故障时 `/actuator/health` 仍为 DOWN；如果希望负载均衡继续转发，应使用 liveness/readiness 或调整 Redis health 策略。
4. 后续阶段还需要补 TTL 抖动、精确缓存失效和热点 Key 互斥回源。
---

## 9. 浏览量 Redis 增量降级

浏览量采用方案 A：**允许少计，优先保证文章详情可访问。**

实现位置：

- `PostServiceImpl.incrementViewInRedis`

行为：

```text
Redis 正常：
  INCR post:view:delta:<postId>

Redis 异常：
  捕获异常
  -> post_view_redis_failures_total + 1
  -> 记录 warn 日志
  -> 不抛给 Controller
  -> 文章详情正常返回
```

指标：

```text
post.view.redis.failures
```

Prometheus：

```text
post_view_redis_failures_total{application="blog"} 1
```

真实故障验证：

```text
停止 Redis
GET /api/public/posts/请问
HTTP 200
title=请问
post_view_redis_failures_total=1
cache_redis_failures_total{cache="postDetail",operation="get"}=1
cache_redis_fallbacks_total{cache="postDetail"}=1
```

说明：

- 文章详情没有因为浏览量 Redis 失败而 500。
- Redis 故障期间浏览量会少计。
- 不增加 MySQL 写压力，不做本地缓冲。
- 浏览量定时刷库和 pending 幂等逻辑不变。

