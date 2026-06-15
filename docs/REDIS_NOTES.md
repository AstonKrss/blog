# Redis 学习笔记(从今天这个博客项目学到的)

> 日期:2026-06-15
> 适用:Spring Boot 4.0 + spring-boot-starter-data-redis + spring-boot-starter-cache

## 1. Redis 在项目里干什么(一句话)

把"读多写少"的数据缓存在内存里,避免每次请求都打 MySQL。

能缓存的:首页文章列表、文章详情、标签、归档、统计、相册、配置项。
不能缓存的:密码、验证码、JWT、变化频繁且强一致性的数据。

## 2. 两个核心概念(必懂)

### (1) 序列化器(Serializer)

Redis 只存字节,**怎么把 Java 对象转字节**就是序列化器干的活。

Spring Boot 默认用 `JdkSerializationRedisSerializer`(JDK 自带):
- 把对象按 Java 序列化协议写成二进制
- **要求对象实现 `Serializable`**
- 字节不可读,Redis Desktop Manager 看是乱码

我换成 `GenericJackson2JsonRedisSerializer`(Jackson):
- 把对象按 JSON 协议写成字符串
- **不要求实现 `Serializable`**
- 可读,Redis Desktop Manager 看就是 JSON
- 加 `@class` 字段做多态,反序列化时知道还原成哪个类

### (2) 缓存 key 拼装

`@Cacheable` 的 `key` 是 SpEL 表达式:

```java
// 没入参(只查一次的)
@Cacheable(value = "tags")
public List<TagVO> getAllTags() { ... }
// Redis key: blog::tags::SimpleKey []

// 简单入参
@Cacheable(value = "project", key = "#id")
public ProjectVO getProject(String id) { ... }
// Redis key: blog::project::<id>

// 多个入参,拼字符串
@Cacheable(value = "publicProjects", key = "'p:' + #page + ':l:' + #limit")
// SpEL 里字符串字面量必须单引号
```

**禁止**:
- 把 `Pageable` / 复杂对象塞 key(序列化失败、key 过长)
- 把 null 直接当 key(关掉 `cache-null-values` 即可)

## 3. 三个核心注解(必懂)

### `@Cacheable` — 读时缓存

```java
@Cacheable(value = "stats")    // 没 key 走默认 SimpleKey
public StatsVO getStats() { ... }
```

执行流程(以第 2 次访问为例):
```
Controller → 代理拦截
  ↓
  GET blog::stats::SimpleKey []
  ↓
  ┌─ 命中 → 直接返回(方法体不执行)
  └─ 未命中 → 执行方法体查 DB → SET blog::stats::SimpleKey [] <json> EX 600 → 返回
```

**坑**:`@Cacheable` 不能放 `private` 方法(AOP 代理对 private 无效)。

### `@CacheEvict` — 写时清缓存

```java
@CacheEvict(value = "stats", allEntries = true)
public PostDetailVO createPost(...) { ... }
```

执行流程:
```
请求进来 → 执行 createPost 方法体
  ↓
  方法体 return 后,代理触发 @CacheEvict
  ↓
  DEL blog::stats::SimpleKey []   (allEntries=true 清掉整个 cacheName)
```

属性:
- `allEntries = true` 清整个 cacheName 下的所有 key
- `allEntries = false`(默认)按 `key` 精清
- `beforeInvocation = false`(默认)方法 return 后才清
- `beforeInvocation = true` 方法执行**前**就清(适合"哪怕失败也要清")

**坑**:同一个注解不能重复声明(Java 编译就报 Duplicate annotation)。

### `@Caching` — 包多个 @CacheEvict

```java
@Caching(evict = {
    @CacheEvict(value = "archive", allEntries = true),
    @CacheEvict(value = "stats", allEntries = true),
    @CacheEvict(value = "tags", allEntries = true)
})
public PostDetailVO createPost(...) { ... }
```

## 4. 致命陷阱:self-call 不走 AOP

```java
@Service
public class PostServiceImpl {
    @Cacheable("xxx")
    public PostDetailVO getBySlug(String s) { ... }

    public PostDetailVO getDetailWithView(String s) {
        PostDetailVO vo = this.getBySlug(s);  // ❌ self-call,不经过代理
        // ↑ 这里 @Cacheable 失效!每次都打 DB
    }
}
```

**解决**:跨 Bean 调用。Controller → Service 这种"注入进来再调用"是走代理的,缓存生效。Service 内部 `this.xxx()` 不走代理。

## 5. 反序列化报错:requires a Serializable payload

报错:
```
java.lang.IllegalArgumentException: DefaultSerializer requires a Serializable payload
Caused by: java.io.NotSerializableException: com.aston.blog.vo.xxx
```

**原因**:Spring Boot 默认的缓存序列化器是 JDK 序列化,要求对象 `implements Serializable`。

**修法(我选的)**:换 Jackson,改 1 个 `CacheConfig` + 1 个 pom 依赖。

```java
// CacheConfig.java
GenericJackson2JsonRedisSerializer jsonSerializer =
        new GenericJackson2JsonRedisSerializer(mapper);
RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(10))
        .serializeValuesWith(SerializationPair.fromSerializer(jsonSerializer));
```

```xml
<!-- pom.xml -->
<dependency>
    <groupId>com.fasterxml.jackson.datatype</groupId>
    <artifactId>jackson-datatype-jsr310</artifactId>
</dependency>
```

`jackson-datatype-jsr310` 是为了 `LocalDateTime` 序列化成 ISO 字符串(默认是数组)。

## 6. Spring Boot 3+ 路径变了

| Spring Boot 2 | Spring Boot 3+ |
|---|---|
| `spring.redis.host` | `spring.data.redis.host` |
| 环境变量 `REDIS_HOST` | 环境变量 `SPRING_DATA_REDIS_HOST` |

`compose.yaml` 里的环境变量名跟着 application.yml 走,yml 写啥 compose 就写啥。

## 6.5 致命坑:Lettuce 共享连接 hang 死(已踩过)

**症状**:所有走 `@Cacheable` 的接口在跑一段时间后全部 hang 住,curl 超时 30s+,日志没异常,thread dump 显示 12+ 个 HTTP 线程 `WAITING` 在同一个 ReentrantLock 上。

**根因**:Spring Data Redis 默认用 Lettuce,**Lettuce 共享一个长连接**给所有阻塞操作(`getConnection` 内部 `getOrCreateSharedConnection` 用了 `ReentrantLock`)。一旦这个共享连接因为任何原因(网络抖动、Redis 重启、客户端异常)进入 `CLOSE_WAIT`/`FIN_WAIT_2` 半死状态,**所有**后续 `RedisCache.lookup` 都会卡在锁上,**没有超时**。

**复现 stack**:
```
http-nio-8080-exec-3 WAITING
  └─ LettuceConnectionFactory.getOrCreateSharedConnection()
       └─ doInLock(ReentrantLock.lock)  ← 卡在这里
  └─ DefaultRedisCacheWriter.get
  └─ RedisCache.lookup
```

**修法**:`application.yml` 加 Lettuce 连接池(`commons-pool2`),每个请求从池里借连接:

```yaml
spring:
  data:
    redis:
      timeout: 2000ms              # 命令超时(必须设,没它会无限等)
      lettuce:
        pool:
          enabled: true
          max-active: 16
          max-idle: 8
          min-idle: 1
          max-wait: 1000ms
        shutdown-timeout: 200ms
```

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-pool2</artifactId>
</dependency>
```

**关键点**:
- `timeout: 2000ms` 比连接池**更重要**——连接池只是让一个请求挂掉不影响其他请求,`timeout` 是让单个请求不会无限等
- 没加 `commons-pool2` 依赖就 `pool.enabled: true` 启动会报错 `ClassNotFoundException: org.apache.commons.pool2.impl.GenericObjectPool`

## 7. 实际用到的 4 种 Redis 操作模式

### (1) 通用缓存:`@Cacheable`

读多写少的"查询"接口。Spring 自动管 key 拼装 + 序列化 + 过期。

### (2) 计数器:`INCR` + 定时刷回 DB

**问题**:浏览量每次访问都 `UPDATE posts SET view_count = view_count + 1`,热门文章变成高频写热点。

**解法**:
```
访问文章: redisTemplate.opsForValue().increment("post:view:" + postId)
  ↓
定时任务(@Scheduled fixedDelay=60000):
  SCAN post:view:*
  拿到 delta,UPDATE posts SET view_count = view_count + delta
  然后 DEL post:view:<id>
```

**为什么不在每次访问时直接 INCR MySQL?**
- MySQL 写要落盘、要加行锁,慢
- Redis INCR 是内存原子操作,快
- 浏览量允许"延迟可见"(每分钟刷一次就够准了)

### (3) 在线人数:`SETEX` + `SCAN`

```
访问时: SETEX online:ip:1.2.3.4 300 1   # 5 分钟过期,重复访问自动续期
查在线: SCAN online:ip:* 计数
```

**为什么不用 HyperLogLog?**
- 简单场景 SETEX + SCAN 就够
- HyperLogLog 误差 0.81%,精确性差
- 上千 IP 时 SCAN 毫秒级,完全够用

### (4) 限流:`INCR` + `EXPIRE` + 首次设置

```
失败一次: INCR login:fail:ip:1.2.3.4
            if (count == 1) EXPIRE 900   # 15 分钟窗口
          INCR login:fail:user:admin
            if (count == 1) EXPIRE 900
查超限:   if (ipCount > 10 || userCount > 10) 拒绝
```

**关键点**:`EXPIRE` 只在 `count == 1`(第一次)时设,**不要每次 INCR 后都设** — 否则每次失败都把窗口延长,等于不限流。

**为什么不用进程内 Map?**
- 进程内 Map 只在单实例有效
- 多实例部署(2 个 backend 容器)就互相看不见,一个实例封了,另一个不封
- Redis 共享,所有实例都能看到

## 8. cacheName 命名(项目里的清单)

```
postDetail         文章详情,key=slug
archive            归档(年/月)
stats              首页统计
tags               标签列表
publicProjects     公开项目列表,key=page+limit
project            单个项目,key=id
allPhotos          相册列表(已改 VO)
siteSettings       站点配置
approvedFriends    已审核友链
publicFootprints   足迹,key=userId
guestbook          留言板
```

业务 key(不用 Spring Cache,直接用):
```
post:view:<postId>          浏览量 INCR 计数
online:ip:<ip>              在线标记 SETEX
login:fail:ip:<ip>          登录失败计数(15 分钟过期)
login:fail:user:<username>  同上,按用户
login:blocked:ip:<ip>       IP 封禁状态 SETEX
```

## 9. 写后失效清单(改了文章后清哪些缓存)

`createPost` / `updatePost` / `deletePost` 都要清:
```
postDetail  (allEntries=true,或按具体 slug)
archive     (allEntries=true)
stats       (allEntries=true)
tags        (allEntries=true,新增/删除了 tag 关联时)
```

新增相册 / 项目 / 友链 / 足迹 / 留言:
```
allPhotos / publicProjects+project / approvedFriends / publicFootprints / guestbook
```

## 10. 一句话回顾

> Redis 是个内存 KV 存储,放慢查询的"读"结果(`@Cacheable`)、高频累加的计数(`INCR` + 定时刷)、临时状态(`SETEX`)、限流计数(`INCR + EXPIRE`)。
> **核心是"避开 MySQL 写"和"避开重复查"**。
