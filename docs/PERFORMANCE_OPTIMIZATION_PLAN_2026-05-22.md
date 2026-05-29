# 性能优化改进方案

检查时间：2026-05-22  
项目：Aston's Blog  
范围：MySQL、Spring Boot、Redis、Next.js、FastAPI、Docker 部署

## 总体结论

这个项目现在功能比较丰富，性能瓶颈主要不会出现在“Java 算法慢”，而会出现在这些地方：

- MySQL 查询缺少针对业务查询的组合索引。
- 访问日志、攻击日志会越来越大，聚合统计会越来越慢。
- 文章列表、标签、归档、站点设置、首页统计属于高频读，适合缓存。
- 浏览量、在线人数、点赞数属于高频写/计数，适合 Redis 承接再异步落库。
- 笔记列表存在明显 N+1 查询风险。
- 前端全局组件较多，首页首屏 JS 和轮询可以继续收敛。
- Docker Compose 没有 Redis、Nginx/CDN、慢查询观测和连接池参数。

建议先做“低风险高收益”的优化：加索引、加 Redis 缓存、修 N+1、访问日志异步队列、前端动态加载重组件。

---

## 一、数据库索引优化

### 1. 建议新增索引清单

建议用 Flyway/Liquibase 管理下面 SQL，不建议手工在生产库直接改完就忘。

```sql
-- posts：公开文章列表、详情、后台文章列表、搜索基础过滤
CREATE UNIQUE INDEX uk_posts_slug ON posts (slug);
CREATE INDEX idx_posts_status_published_at ON posts (status, published_at DESC);
CREATE INDEX idx_posts_author_status_created_at ON posts (author_id, status, created_at DESC);
CREATE INDEX idx_posts_author_created_at ON posts (author_id, created_at DESC);
CREATE INDEX idx_posts_status_slug ON posts (status, slug);

-- 如果 MySQL 8 且文章搜索量增长，建议改 FULLTEXT，而不是 LIKE '%keyword%'
CREATE FULLTEXT INDEX ft_posts_title_content ON posts (title, content);

-- post_tags：标签筛选文章
CREATE INDEX idx_post_tags_tag_post ON post_tags (tag_id, post_id);
CREATE INDEX idx_post_tags_post_tag ON post_tags (post_id, tag_id);

-- tags：按 name/slug 查找
CREATE UNIQUE INDEX uk_tags_name ON tags (name);
CREATE UNIQUE INDEX uk_tags_slug ON tags (slug);

-- comments：文章评论列表
CREATE INDEX idx_comments_post_created_at ON comments (post_id, created_at ASC);
CREATE INDEX idx_comments_user_created_at ON comments (user_id, created_at DESC);

-- post_likes：点赞状态、点赞计数、防重复点赞
CREATE UNIQUE INDEX uk_post_likes_post_user ON post_likes (post_id, user_id);
CREATE INDEX idx_post_likes_post ON post_likes (post_id);
CREATE INDEX idx_post_likes_user ON post_likes (user_id);

-- notes：笔记流、我的笔记
CREATE INDEX idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX idx_notes_author_created_at ON notes (author_id, created_at DESC);

-- note_comments：笔记评论树
CREATE INDEX idx_note_comments_note_created_at ON note_comments (note_id, created_at ASC);
CREATE INDEX idx_note_comments_parent ON note_comments (parent_id);

-- note_likes：笔记点赞状态、防重复点赞
CREATE UNIQUE INDEX uk_note_likes_note_user ON note_likes (note_id, user_id);
CREATE INDEX idx_note_likes_user ON note_likes (user_id);

-- photos：相册排序与文件同步
CREATE INDEX idx_photos_sort_order ON photos (sort_order ASC);
CREATE UNIQUE INDEX uk_photos_filename ON photos (filename);

-- projects：公开项目列表和后台排序
CREATE INDEX idx_projects_status_sort_order ON projects (status, sort_order ASC);
CREATE INDEX idx_projects_sort_order ON projects (sort_order ASC);

-- friend_links：审核列表
CREATE INDEX idx_friend_links_status_created_at ON friend_links (status, created_at DESC);

-- user_footprint：旅行足迹
CREATE INDEX idx_user_footprint_user_created_at ON user_footprint (user_id, created_at DESC);
CREATE UNIQUE INDEX uk_user_footprint_user_province_city ON user_footprint (user_id, province, city);

-- guestbook：留言板倒序
CREATE INDEX idx_guestbook_created_at ON guestbook (created_at DESC);

-- site_settings：配置按 key 查询
CREATE UNIQUE INDEX uk_site_settings_key ON site_settings (setting_key);

-- email_codes：验证码查询与清理
CREATE INDEX idx_email_codes_email_type_used_created_at ON email_codes (email, type, used, created_at DESC);
CREATE INDEX idx_email_codes_expire_at ON email_codes (expire_at);

-- login_attempts：暴力破解判断
CREATE INDEX idx_login_attempts_ip_success_created_at ON login_attempts (ip, success, created_at DESC);
CREATE INDEX idx_login_attempts_username_success_created_at ON login_attempts (username, success, created_at DESC);

-- visit_logs：访问统计、在线人数、后台日志
CREATE INDEX idx_visit_logs_created_at ON visit_logs (created_at DESC);
CREATE INDEX idx_visit_logs_ip_created_at ON visit_logs (ip_address, created_at DESC);
CREATE INDEX idx_visit_logs_path_created_at ON visit_logs (path, created_at DESC);
CREATE INDEX idx_visit_logs_country_created_at ON visit_logs (country, created_at DESC);
CREATE INDEX idx_visit_logs_isp_created_at ON visit_logs (isp, created_at DESC);

-- attack_logs：安全面板统计与筛选
CREATE INDEX idx_attack_logs_created_at ON attack_logs (created_at DESC);
CREATE INDEX idx_attack_logs_attack_type_created_at ON attack_logs (attack_type, created_at DESC);
CREATE INDEX idx_attack_logs_ip_created_at ON attack_logs (ip, created_at DESC);
CREATE INDEX idx_attack_logs_ip_attack_type_created_at ON attack_logs (ip, attack_type, created_at DESC);
CREATE INDEX idx_attack_logs_path_created_at ON attack_logs (path, created_at DESC);

-- threat_signatures：未审核威胁排序
CREATE INDEX idx_threat_signatures_reviewed_attack_count ON threat_signatures (reviewed, attack_count DESC);
CREATE INDEX idx_threat_signatures_ip_reviewed ON threat_signatures (ip, reviewed);
```

### 2. 为什么这些索引有用

对应代码热点：

- `PostRepository.findPublishedWithAuthorAndTags()` 需要 `posts(status, published_at)`。
- `PostRepository.findByStatusAndTags()` 需要 `post_tags(tag_id, post_id)`、`posts(status)`、`tags(slug)`。
- `PostRepository.search()` 当前 `LIKE '%keyword%'` 普通索引几乎无效，建议用 FULLTEXT 或搜索引擎。
- `VisitLogRepository` 里大量 `WHERE created_at >= ? GROUP BY ...`，访问日志一多会扫大表。
- `AttackLogRepository` 里大量 `countByAttackType`、`findTop50ByIp...`，需要组合索引。
- `PostLikeRepository.existsByPostIdAndUserId()` 没唯一索引会慢，也可能重复点赞。
- `NoteServiceImpl.enrichNotes()` 对每条 note 查评论，评论表需要 `note_id + created_at`。

### 3. 怎么验证索引有效

每个核心 SQL 上线前后都跑 `EXPLAIN ANALYZE`。

例子：

```sql
EXPLAIN ANALYZE
SELECT *
FROM posts
WHERE status = 'PUBLISHED'
ORDER BY published_at DESC
LIMIT 10 OFFSET 0;
```

目标：

- `type` 至少是 `range` / `ref`，不要是全表 `ALL`。
- `key` 命中新建索引。
- `rows` 显著下降。
- `Using filesort` 尽量减少，尤其是首页、列表页。

---

## 二、Redis 接入方案

### 1. Redis 适合放什么

适合缓存：

- 首页文章列表：`home:posts:page1:limit6`
- 首页统计：`home:stats`
- 站点设置：`site:settings`
- 标签列表：`tags:all`
- 归档列表：`archive:all`
- 文章详情：`post:slug:{slug}`
- 文章目录：`post:toc:{slug}`
- 项目列表：`projects:published`
- 相册列表：`photos:public`
- 在线人数：`online:ip:{ip}` 或 HyperLogLog
- 浏览量：`post:view:{postId}`
- 点赞计数：`post:like:{postId}`、`note:like:{noteId}`
- 安全统计：`security:stats`
- 访问统计面板：`analytics:{since}`

不建议缓存：

- 密码、验证码明文、JWT token。
- 管理后台敏感列表的完整结果，除非严格按用户/角色隔离 key。
- 经常变化且一致性要求强的写入结果。

### 2. Docker Compose 增加 Redis

```yaml
redis:
  image: redis:7-alpine
  container_name: blog-redis
  restart: always
  command: ["redis-server", "--appendonly", "yes", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  networks:
    - blog-network

backend:
  environment:
    SPRING_DATA_REDIS_HOST: redis
    SPRING_DATA_REDIS_PORT: 6379
  depends_on:
    - redis

volumes:
  redis_data:
```

### 3. Spring Boot 增加 Redis 依赖

`pom.xml`：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

`BlogApplication.java`：

```java
@EnableCaching
@SpringBootApplication
public class BlogApplication {
    public static void main(String[] args) {
        SpringApplication.run(BlogApplication.class, args);
    }
}
```

`application.yml`：

```yaml
spring:
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:localhost}
      port: ${SPRING_DATA_REDIS_PORT:6379}
      timeout: 2s
  cache:
    type: redis
    redis:
      time-to-live: 10m
      cache-null-values: false
```

### 4. 用 Spring Cache 缓存公共读接口

适合先改这些 Service：

- `PostServiceImpl.getPublicPosts`
- `PostServiceImpl.getPostBySlug`
- `PostServiceImpl.getStats`
- `PostServiceImpl.getArchive`
- `TagServiceImpl.getAllTags`
- `ProjectServiceImpl.getPublicProjects`
- `PhotoServiceImpl.getAllPhotos`
- `SiteSettingServiceImpl.getAllSettings`

示例：

```java
@Cacheable(value = "publicPosts", key = "#page + ':' + #limit + ':' + (#tag == null ? '' : #tag)")
public PostListVO getPublicPosts(int page, int limit, String tag) {
    ...
}

@CacheEvict(value = {"publicPosts", "postDetail", "stats", "archive", "tags"}, allEntries = true)
public PostDetailVO createPost(CreatePostDTO dto, String authorId) {
    ...
}
```

文章更新、删除、发布、标签变化时必须清缓存：

```java
@Caching(evict = {
    @CacheEvict(value = "publicPosts", allEntries = true),
    @CacheEvict(value = "postDetail", key = "#dto.slug"),
    @CacheEvict(value = "stats", allEntries = true),
    @CacheEvict(value = "archive", allEntries = true)
})
public PostDetailVO updatePost(...) {
    ...
}
```

### 5. 浏览量不要每次阅读都写 MySQL

当前 `getPostBySlug()` 会每次访问都：

```java
post.setViewCount(post.getViewCount() + 1);
postRepository.save(post);
```

这会让热门文章变成高频写热点。

建议：

1. 读文章时只 `Redis INCR`。
2. 定时任务每 1 分钟或 5 分钟批量刷回 MySQL。

Redis key：

```text
post:view:delta:{postId}
```

示例逻辑：

```java
redisTemplate.opsForValue().increment("post:view:delta:" + post.getId());
```

定时刷库：

```java
@Scheduled(fixedDelay = 60000)
@Transactional
public void flushPostViews() {
    // SCAN post:view:delta:*，取 delta，UPDATE posts SET view_count = view_count + ?
}
```

对应 SQL 最好用原子更新：

```sql
UPDATE posts SET view_count = view_count + ? WHERE id = ?;
```

### 6. 在线人数用 Redis TTL 替代查 visit_logs

当前 `LiveVisitor` 每 30 秒请求 `/api/public/online`，后端执行：

```java
COUNT(DISTINCT ip_address) WHERE created_at >= fiveMinutesAgo
```

日志表越大越慢。

建议：

访问时写：

```text
SETEX online:ip:{ip} 300 1
```

在线人数：

```text
SCAN online:ip:* 计数
```

更进一步用 HyperLogLog：

```text
PFADD online:5min:{bucket} {ip}
PFCOUNT online:5min:{bucket1} online:5min:{bucket2}
```

简单版本先用 `SETEX` 就够。

### 7. 登录暴力破解计数用 Redis

当前登录失败会落库再统计，建议 Redis 先做限流：

```text
login:fail:ip:{ip}
login:fail:user:{username}
```

操作：

```text
INCR login:fail:ip:1.2.3.4
EXPIRE login:fail:ip:1.2.3.4 900
```

超过阈值直接拒绝，再异步记录数据库审计日志。

---

## 三、后端代码层优化

### 1. 修复笔记列表 N+1 查询

位置：

- `src/main/java/com/aston/blog/Service/impl/NoteServiceImpl.java`

当前 `enrichNotes()`：

```java
for (Note note : notes) {
    List<NoteComment> flat = noteCommentRepository.findByNoteIdOrderByCreatedAtAsc(note.getId());
    note.setComments(buildCommentTree(flat).stream().limit(3).toList());
}
```

如果一页 20 条 note，就会额外查 20 次评论。

建议新增批量查询：

```java
List<NoteComment> findByNoteIdInOrderByCreatedAtAsc(Collection<String> noteIds);
```

然后一次查出并按 `noteId` 分组：

```java
List<String> noteIds = notes.stream().map(Note::getId).toList();
Map<String, List<NoteComment>> commentsByNoteId =
    noteCommentRepository.findByNoteIdInOrderByCreatedAtAsc(noteIds)
        .stream()
        .collect(Collectors.groupingBy(NoteComment::getNoteId));
```

### 2. 文章列表避免 JOIN FETCH + Page 的坑

位置：

- `src/main/java/com/aston/blog/repository/PostRepository.java:38`

当前：

```java
@Query("SELECT p FROM Post p LEFT JOIN FETCH p.author LEFT JOIN FETCH p.tags WHERE p.status = 'PUBLISHED'")
Page<Post> findPublishedWithAuthorAndTags(Pageable pageable);
```

`Page` 配合 `JOIN FETCH` 多集合时容易导致：

- count 查询异常或低效。
- 多对多 tags 造成重复行。
- 分页在数据库层和内存层混杂。

建议改成两段式：

1. 先分页查 post id。
2. 再用 `WHERE id IN (...)` fetch author/tags。

示例：

```java
@Query("SELECT p.id FROM Post p WHERE p.status = 'PUBLISHED' ORDER BY p.publishedAt DESC")
Page<String> findPublishedIds(Pageable pageable);

@Query("SELECT DISTINCT p FROM Post p LEFT JOIN FETCH p.author LEFT JOIN FETCH p.tags WHERE p.id IN :ids")
List<Post> findByIdInWithAuthorAndTags(@Param("ids") List<String> ids);
```

### 3. 搜索从 LIKE 改成 FULLTEXT 或独立搜索服务

位置：

- `src/main/java/com/aston/blog/repository/PostRepository.java:56`

当前：

```sql
title LIKE '%keyword%' OR content LIKE '%keyword%'
```

这个模式无法有效使用普通 BTree 索引，数据一多会慢。

短期用 MySQL FULLTEXT：

```sql
CREATE FULLTEXT INDEX ft_posts_title_content ON posts (title, content);
```

Repository 改 native query：

```java
@Query(
  value = """
      SELECT * FROM posts
      WHERE status = 'PUBLISHED'
        AND MATCH(title, content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
      ORDER BY published_at DESC
      """,
  countQuery = """
      SELECT COUNT(*) FROM posts
      WHERE status = 'PUBLISHED'
        AND MATCH(title, content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
      """,
  nativeQuery = true
)
Page<Post> searchFullText(@Param("keyword") String keyword, Pageable pageable);
```

长期可以用 Meilisearch / Elasticsearch / OpenSearch。

### 4. 访问日志写入不要阻塞请求

位置：

- `src/main/java/com/aston/blog/Service/impl/VisitLogServiceImpl.java:23`

虽然方法标了 `@Async`，但需要确认项目是否启用了 `@EnableAsync`。如果没有启用，`@Async` 不生效。

建议：

```java
@EnableAsync
@EnableScheduling
@SpringBootApplication
public class BlogApplication { ... }
```

再加线程池：

```java
@Bean(name = "visitLogExecutor")
public Executor visitLogExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(8);
    executor.setQueueCapacity(1000);
    executor.setThreadNamePrefix("visit-log-");
    executor.initialize();
    return executor;
}
```

更稳的方案：

- 请求只写 Redis Stream / List。
- 后台消费者批量写 MySQL。
- IP 归属地查询结果按 IP 缓存 7 天。

### 5. 统计接口加缓存和预聚合

位置：

- `VisitLogRepository`
- `AttackLogRepository`
- `VisitLogServiceImpl.getAnalytics`
- `AttackLogServiceImpl.getSecurityStats`

问题：

这些接口会做大量 `GROUP BY`、`COUNT`、`ORDER BY COUNT(*)`。日志表增长后会越来越慢。

建议两阶段：

第一阶段：Redis 缓存 1-5 分钟。

```java
@Cacheable(value = "visitAnalytics", key = "#since.toString()", unless = "#result == null")
public VisitAnalyticsVO getAnalytics(LocalDateTime since) { ... }
```

第二阶段：做日/小时聚合表。

```sql
CREATE TABLE visit_log_hourly_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  stat_hour DATETIME NOT NULL,
  path VARCHAR(255),
  country VARCHAR(50),
  province VARCHAR(50),
  city VARCHAR(50),
  isp VARCHAR(50),
  visit_count BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_visit_hour_dim (stat_hour, path, country, province, city, isp)
);
```

定时任务每 5 分钟聚合最近数据，后台面板优先查聚合表。

### 6. 点赞接口减少重复查询

位置：

- `src/main/java/com/aston/blog/Service/impl/PostLikeServiceImpl.java`

当前一次 toggle 可能执行：

- exists
- delete/save
- exists
- count

建议：

- `post_likes(post_id, user_id)` 加唯一索引。
- 点赞计数直接维护在 `posts.like_count`。
- toggle 后用原子 SQL 更新计数。

示例：

```sql
UPDATE posts SET like_count = like_count + 1 WHERE id = ?;
UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?;
```

返回 count 时读 `posts.like_count` 或 Redis 计数，不要每次 `COUNT(*)`。

---

## 四、MySQL 配置优化

### 1. 开启慢查询日志

Docker MySQL 可挂配置：

```ini
[mysqld]
slow_query_log=1
long_query_time=0.5
log_queries_not_using_indexes=1
```

排查命令：

```sql
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

### 2. 连接池配置

`application.yml`：

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: ${DB_POOL_MAX_SIZE:20}
      minimum-idle: ${DB_POOL_MIN_IDLE:5}
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

经验值：

- 小型博客：`maximum-pool-size=10~20`。
- 不要盲目调大，MySQL 连接太多会更慢。

### 3. MySQL 容器参数

如果服务器内存足够，可加：

```ini
[mysqld]
innodb_buffer_pool_size=512M
innodb_log_file_size=128M
max_connections=200
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
```

`innodb_buffer_pool_size` 通常设置为数据库服务器可用内存的 50%-70%。如果 MySQL 和应用在同一台小机器上，要保守。

---

## 五、前端性能优化

### 1. 首屏减少全局重组件

位置：

- `frontend/app/layout.tsx`

当前所有页面都会挂：

- `MusicPlayer`
- `ClickEffects`
- `MusicVisualizer`
- `ConsoleEasterEgg`
- `CommandPalette`
- `LiveVisitor`

建议：

- `CommandPalette` 可以保留，但内部列表懒初始化。
- `MusicPlayer`、`MusicVisualizer`、`ClickEffects` 用 dynamic import，关闭 SSR。
- 对低优先级组件延迟到浏览器 idle 后加载。

示例：

```tsx
import dynamic from "next/dynamic";

const MusicPlayer = dynamic(() => import("@/components/music-player").then(m => m.MusicPlayer), {
  ssr: false,
});
```

### 2. ECharts / Leaflet / Three.js 按页面动态加载

当前依赖里有 `echarts`、`react-leaflet`、`three`，这些库比较重。

建议：

- 旅行地图页才加载 ECharts/Leaflet。
- 游戏页才加载 Three.js 或复杂 canvas。
- 首页不要 import 间接依赖这些库。

检查方式：

```bash
cd frontend
npm run build
```

观察 route size，如果某个普通页面 First Load JS 异常增大，就查是否误引重库。

### 3. 减少轮询

位置：

- `frontend/components/live-visitor.tsx`
- `frontend/components/games/music-visualizer.tsx`

当前：

- 在线人数 30 秒轮询。
- 音乐可视化 500ms 查 localStorage。

建议：

- 在线人数接口后端 Redis 化后，轮询可改 60 秒。
- 页面不可见时停止轮询：

```ts
if (document.visibilityState === "hidden") return;
```

- `music-player` 状态用 React Context 或自定义事件，不要 500ms 读 localStorage。

### 4. 图片优化

现在上传图片从 `/uploads/**` 直接走后端静态资源。

建议：

- 上传时生成缩略图：`thumb_`、`medium_`、原图。
- 列表页只用缩略图，详情页再用原图。
- 使用 Nginx 直接服务 `/uploads/`，不要让 Spring Boot 扛静态文件。
- 配置缓存头：

```nginx
location /uploads/ {
    alias /app/uploads/;
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
}
```

### 5. Next.js 缓存策略统一

当前部分页面用了：

```ts
next: { revalidate: 60 }
```

建议：

- 首页文章、统计、设置：`revalidate: 60`
- 标签、归档：`revalidate: 3600`
- 文章详情：`revalidate: 60~300`
- 后台接口：`cache: "no-store"`

后台页面不要被 Next 缓存：

```ts
await fetch(url, { cache: "no-store", headers: ... });
```

---

## 六、Python 安全工具服务优化

### 1. OSS 扫描任务持久化和限流

现在 FastAPI 有任务管理和 SSE，但需要注意：

- 内存 task manager 重启会丢任务。
- 扫描并发过高会拖垮服务。

建议：

- Redis 存任务状态：`security:task:{taskId}`。
- Redis Stream 或队列派发扫描任务。
- 每个用户并发限制，例如最多 2 个运行中任务。
- 扫描结果分页保存，不要一次性把超大结果 JSON 放在单字段里。

### 2. HTTP 客户端连接池

Web 扫描模块如果大量请求目标站，建议复用 `httpx.AsyncClient`，设置：

- connect timeout
- read timeout
- max connections
- max keepalive connections

示例：

```python
httpx.AsyncClient(
    timeout=httpx.Timeout(10.0, connect=3.0),
    limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
)
```

---

## 七、部署架构优化

### 1. 加 Nginx 反向代理

建议生产入口：

```text
Internet
  -> Nginx :80/:443
    -> frontend:3000
    -> backend:8080
    -> python:8000
    -> /uploads 静态目录
```

Nginx 可以做：

- gzip / brotli
- HTTP/2
- 静态资源缓存
- 上传大小限制
- 请求限流
- TLS 终止

### 2. Gzip / Brotli

Nginx：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
gzip_min_length 1024;
```

### 3. 后端 JVM 参数

Docker 启动可以加：

```bash
JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseG1GC -Duser.timezone=Asia/Shanghai"
```

Dockerfile：

```dockerfile
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

---

## 八、观测与压测

### 1. 增加 Actuator

`pom.xml`：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

`application.yml`：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
```

### 2. 关键指标

至少看：

- API P95/P99 响应时间
- MySQL 慢查询
- Hikari 连接池 active/idle/pending
- Redis hit rate
- JVM heap、GC pause
- Next.js route first load JS
- 访问日志写入队列长度
- Python 扫描任务耗时和失败率

### 3. 压测命令示例

用 `k6`：

```js
import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 50,
  duration: "2m",
};

export default function () {
  const res = http.get("http://localhost:8080/api/public/posts?page=1&limit=10");
  check(res, { "status is 200": r => r.status === 200 });
  sleep(1);
}
```

目标：

- 公共列表接口 P95 < 200ms。
- 文章详情 P95 < 200ms。
- 首页聚合接口 P95 < 300ms。
- 后台统计接口 P95 < 500ms，超过则必须缓存或预聚合。

---

## 九、推荐落地顺序

### 第 1 阶段：当天可做

1. 给核心表加索引。
2. 开启 MySQL 慢查询日志。
3. 修复 `NoteServiceImpl.enrichNotes()` 的 N+1 查询。
4. 给后台接口加 `cache: "no-store"`。
5. 把全局重组件改成 dynamic import。

### 第 2 阶段：1-2 天

1. 接入 Redis。
2. 缓存首页、文章列表、标签、归档、站点设置。
3. 在线人数改 Redis TTL。
4. 浏览量改 Redis INCR + 定时批量落库。
5. 攻击统计和访问统计加 Redis 短缓存。

### 第 3 阶段：3-5 天

1. 访问日志改 Redis Stream / 队列异步写库。
2. 统计接口做小时/天级预聚合表。
3. 搜索改 MySQL FULLTEXT 或接入 Meilisearch。
4. Nginx 接管 `/uploads` 静态资源。
5. 接入 Actuator + Prometheus/Grafana。

### 第 4 阶段：后续优化

1. 图片上传生成缩略图和 WebP。
2. OSS/CDN 承接静态资源。
3. Python 扫描任务队列化。
4. 数据库归档：`visit_logs`、`attack_logs` 按月归档或分区。

---

## 十、最小改动版本建议

如果只想先做一版收益最大的优化，建议只做这 6 件：

1. 加 `posts`、`post_tags`、`visit_logs`、`attack_logs`、`post_likes`、`note_comments` 的索引。
2. Redis 缓存 `getPublicPosts`、`getPostBySlug`、`getStats`、`getArchive`、`getAllTags`。
3. 浏览量从同步写 MySQL 改为 Redis INCR。
4. 在线人数从 `COUNT DISTINCT visit_logs` 改为 Redis TTL。
5. 修复 `NoteServiceImpl` 笔记评论 N+1。
6. 首页低优先级组件 dynamic import。

这 6 件做完，首页、博客列表、文章详情、在线人数、后台统计会明显稳很多。
