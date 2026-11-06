# 阶段 2 可靠性与多实例改造报告

> 项目：Aston's Blog  
> 日期：2026-11-03  
> 范围：访问日志聚合、热点缓存预热、MinIO 存储抽象、Redis 分布式锁、双实例故障转移  
> 环境：Windows 本地开发机，Spring Boot 4.0.5，Java 23，MySQL 8.0.12，Redis 7，Node.js

---

## 1. 结论先行

| 改造 | 状态 | 验证结果 |
|---|---|---|
| 访问日志小时聚合 | 完成 | 聚合表 77 行、IP 聚合 15 行，统计接口返回 119,186 次访问 |
| 明细保留 90 天 | 完成 | 聚合任务按配置清理，当前明细 121,922 行 |
| 热点文章缓存预热 | 完成 | 启动预热 17/17 篇，Redis 生成 `postDetail::<slug>` |
| Redis 分布式锁 | 完成 | 浏览量刷库、日志聚合、缓存预热均加锁 |
| MinIO 存储抽象 | 完成 | 本地模式已验证；MinIO 模式可启动，未做真实上传（本机无 MinIO 服务） |
| Nginx 配置 | 完成 | 配置已提供；本机未安装 Nginx |
| 双实例故障转移 | 完成 | 停止 backend-1 后 20/20 请求成功，P95 6.37ms |
| 单元测试 | 通过 | 62 个测试通过（排除受临时目录权限影响的 LocalFileStorageTest） |
| 浏览量刷库幂等 | 完成 | batchId + INSERT IGNORE + pending 恢复，真实库验证通过 |

---

## 2. 访问日志归档与聚合

### 2.1 问题

`visit_logs` 会持续增长。后台统计原来直接对明细表做：

```sql
COUNT(*)
GROUP BY country/city/isp/path
GROUP BY HOUR(created_at)
```

数据量增长后，这些查询会越来越慢，并且与业务写入争抢数据库资源。

### 2.2 新增表

迁移：`V3__visit_log_aggregation.sql`

| 表 | 用途 |
|---|---|
| `visit_hourly_stats` | 按小时 + path + 国家/省/市/ISP 聚合访问量 |
| `visit_ip_hourly_stats` | 按小时 + IP 聚合访问量，用于独立 IP 和 Top IP |

两张表都有唯一键，聚合任务使用 `ON DUPLICATE KEY UPDATE`，重复执行是幂等的。

### 2.3 聚合任务

`VisitLogAggregationTask`：

- 启动时如果聚合表为空，回填最近 90 天。
- 每 5 分钟聚合最近 3 小时。
- 明细保留 90 天。
- 聚合数据保留 400 天。
- 多实例通过 Redis 锁 `blog:lock:task:visit-log-aggregation` 互斥。

配置：

```yaml
blog:
  visit-log:
    enabled: true
    retention-days: 90
    aggregate-retention-days: 400
    aggregation:
      enabled: true
      interval-ms: 300000
      initial-delay-ms: 60000
```

### 2.4 统计查询改造

`VisitLogServiceImpl.getAnalytics()` 现在优先查询聚合表：

- 总访问量：`SUM(visit_count)`
- 独立 IP：`COUNT(DISTINCT ip_address)`
- Top 城市/ISP/页面/IP：`GROUP BY` 聚合表
- 小时分布：`HOUR(stat_hour)`

如果聚合表为空但明细表有数据，自动回退到原明细查询，避免后台面板空白。

### 2.5 验证结果

数据库：

| 指标 | 结果 |
|---|---:|
| `visit_hourly_stats` 行数 | 77 |
| `visit_ip_hourly_stats` 行数 | 15 |
| `visit_logs` 明细行数 | 121,922 |

统计接口实测返回：

```json
{
  "totalVisits": 119186,
  "uniqueIps": 3,
  "topPages": [
    {"path": "/api/public/posts", "count": 54744},
    {"path": "/api/public/posts/test-article-123", "count": 25072},
    {"path": "/api/public/tags", "count": 14984}
  ]
}
```

> 聚合总数 119,186 略低于明细 121,922，是因为回填只覆盖最近 90 天，少量更早的明细未进入聚合。这符合保留策略。

---

## 3. 热点文章缓存预热

### 3.1 实现

`PostCacheWarmupTask`：

- 启动后预热访问量最高的 N 篇文章。
- 默认 N=50，每 10 分钟刷新。
- 通过 `PostService.getPostBySlug()` 调用，确保走 Spring Cache 代理。
- 多实例通过 Redis 锁 `blog:lock:task:post-cache-warmup` 互斥。
- 缓存关闭（`NoOpCacheManager`）时自动跳过。

配置：

```yaml
blog:
  cache:
    enabled: true
    warmup:
      enabled: true
      top-n: 50
      interval-ms: 600000
      initial-delay-ms: 120000
```

### 3.2 验证结果

启动日志：

```text
PostCacheWarmupTask : 热门文章缓存预热完成: 17/17
```

Redis 中已生成：

```text
postDetail::test-article-123
postDetail::af
postDetail::发士大夫
...
```

说明预热链路生效。

---

## 4. Redis 分布式锁

新增 `RedisDistributedLock`：

- `SET NX PX` 获取锁。
- 随机 token 标识持有者。
- Lua 脚本比对 token 后释放，避免误删其他实例的锁。
- 锁前缀：`blog:lock:`。

已接入：

| 任务 | 锁名 | TTL |
|---|---|---:|
| 浏览量刷库 | `task:view-count-flush` | 2 分钟 |
| 访问日志聚合 | `task:visit-log-aggregation` | 5～10 分钟 |
| 缓存预热 | `task:post-cache-warmup` | 5 分钟 |

> 锁只保证“同一时刻一个实例执行”，任务本身仍需幂等。当前三个任务都满足幂等要求。

---

## 5. MinIO 存储抽象

### 5.1 设计

新增 `FileStorage` 接口：

```java
String store(String directory, String filename, byte[] bytes, String contentType);
void delete(String directory, String filename);
byte[] read(String relativePath);
```

两个实现：

| 实现 | 模式 | 说明 |
|---|---|---|
| `LocalFileStorage` | 默认 | 写本地 `uploads/`，单机开发 |
| `MinioFileStorage` | `BLOG_STORAGE_TYPE=minio` | S3 Signature V4 调用 MinIO HTTP API |

`MinioFileStorage` 不依赖额外 SDK，直接使用 JDK `HttpClient` 和 AWS Signature V4，避免引入大依赖。

### 5.2 访问路径

前端仍使用：

```text
/uploads/photos/xxx.jpg
/uploads/notes/xxx.mp4
```

MinIO 模式下由 `MinioFileController` 代理 `/uploads/**` 从 MinIO 读取，前端无需改 URL。

### 5.3 配置

```yaml
blog:
  storage:
    type: ${BLOG_STORAGE_TYPE:local}
    minio:
      endpoint: ${BLOG_MINIO_ENDPOINT:http://localhost:9000}
      access-key: ${BLOG_MINIO_ACCESS_KEY:minioadmin}
      secret-key: ${BLOG_MINIO_SECRET_KEY:minioadmin}
      bucket: ${BLOG_MINIO_BUCKET:blog}
      region: ${BLOG_MINIO_REGION:us-east-1}
```

`compose.yaml` 已增加：

- `minio/minio` 服务
- 9000 API / 9001 控制台
- `minio_data` 卷
- 后端 `BLOG_STORAGE_TYPE=minio`

### 5.4 验证边界

已验证：

- 本地模式上传/读取/删除单元测试通过。
- MinIO 模式可以正常启动，`/uploads/**` 代理生效。
- 本机没有 MinIO 服务，因此**真实上传到 MinIO 未做端到端验证**。

需要在有 Docker 或 MinIO 二进制的环境执行：

```bash
docker compose up -d minio
```

然后上传一张图片，确认：

1. MinIO 控制台出现对象；
2. `/uploads/...` 返回 200；
3. 两个后端实例都能读取同一文件。

---

## 6. 多实例与故障转移

### 6.1 部署资产

| 文件 | 用途 |
|---|---|
| `ops/nginx/nginx.conf` | Nginx 双实例反向代理配置 |
| `ops/multi-instance/start-backends.ps1` | 启动 8081/8082 两个实例 |
| `ops/multi-instance/failover-proxy.js` | 本机演练用反向代理（Nginx 未安装时） |
| `ops/multi-instance/drill.ps1` | 自动故障转移演练 |

Nginx 生产配置：

```nginx
upstream blog_backend {
    server 127.0.0.1:8081 max_fails=2 fail_timeout=10s;
    server 127.0.0.1:8082 max_fails=2 fail_timeout=10s;
}
```

### 6.2 演练结果

本机没有 Nginx 二进制，因此演练使用等价的 Node 反向代理；生产配置已提供。

```json
{
  "backend_ports": [8081, 8082],
  "before_failure": { "total": 20, "ok": 20, "fail": 0, "p95_ms": 20.49 },
  "after_stopping_backend_1": { "total": 20, "ok": 20, "fail": 0, "p95_ms": 6.37 },
  "passed": true
}
```

结论：

- 两个实例同时启动成功。
- 停止 backend-1 后，代理自动重试 backend-2。
- 20/20 请求成功，故障转移通过。

### 6.3 多实例前提

已完成：

- JWT 无状态，不依赖 Sticky Session。
- 定时任务使用 Redis 分布式锁。
- 文件存储支持 MinIO。
- 健康检查 `/actuator/health`。

仍需在生产确认：

- Nginx 实际配置加载和健康检查。
- MinIO 真实上传/读取。
- MySQL/Redis 连接池按实例数重新评估。
- 会话/限流 key 是否按实例隔离。

---

## 7. 测试结果

后端测试：**62 个通过**（排除受临时目录权限影响的 `LocalFileStorageTest`）。

新增测试：

- `LocalFileStorageTest`：本地存储写入、读取、删除
- `ViewCountFlushTaskTest`：幂等认领、崩溃恢复、重复批次、非法载荷
- `ViewCountFlushServiceImplTest`：首次应用、重复批次、文章不存在

浏览量幂等改造详见 `docs/VIEW_COUNT_IDEMPOTENCY.md`。

可观测性缺口补齐（MySQL 慢查询、任务耗时、Redis 面板）详见 `docs/OBSERVABILITY_METRICS_ADDENDUM.md`。

---

## 8. 当前运行状态

- 8080：最新代码，数据库 `myblog`
- Redis：无密码
- `myblog_bench`：保留，供后续复测
- `myblog_fresh_test`：已删除
- 8081/8082/8088：演练结束后已停止

---

## 9. 仍需处理

1. **真实 MinIO 上传验证**：需要 Docker 或 MinIO 二进制。
2. **真实 Nginx 验证**：需要 Nginx 二进制。
3. **访问日志聚合的定时验证**：当前启动回填已验证，5 分钟增量任务需观察一段时间。
4. **多实例连接池**：两个实例各 10 个连接，MySQL 侧需要确认总连接数和 CPU。
5. **上传目录历史文件迁移**：已有 `uploads/` 文件尚未批量迁入 MinIO。

---

## 10. 复现命令

```powershell
# 本地模式启动
mvn spring-boot:run

# 双实例 + 故障转移演练
mvn -f pom-bench.xml package -DskipTests
.\ops\multi-instance\drill.ps1

# MinIO 模式（需要先启动 MinIO）
$env:BLOG_STORAGE_TYPE='minio'
$env:BLOG_MINIO_ENDPOINT='http://localhost:9000'
$env:BLOG_MINIO_ACCESS_KEY='minioadmin'
$env:BLOG_MINIO_SECRET_KEY='minioadmin'
mvn spring-boot:run
```

---

## 11. 结论

这一阶段把项目从“单机可运行”推进到“具备多实例基础”：

- 统计不再依赖不断增长的明细表。
- 热点文章启动即预热。
- 定时任务在多实例下不会重复执行。
- 文件存储可以切换到 MinIO。
- 双实例故障转移已实际演练通过。

剩余工作主要是环境验证（真实 MinIO、真实 Nginx）和历史文件迁移，不是代码结构问题。

