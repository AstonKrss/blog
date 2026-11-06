# 可观测性缺口补齐记录

> 日期：2026-11-04  
> 范围：MySQL 慢查询、定时任务耗时、Redis 命令耗时面板

---

## 1. MySQL 慢查询

### 1.1 配置方式

本次采用 `SET PERSIST` 持久化配置，不修改 `my.ini`，也不需要重启 MySQL：

```sql
SET PERSIST slow_query_log = ON;
SET PERSIST long_query_time = 0.7;
SET PERSIST log_queries_not_using_indexes = OFF;
```

配置会写入 MySQL 数据目录下的 `mysqld-auto.cnf`，重启后仍会加载。

验证：

```text
slow_query_log                = ON
long_query_time               = 0.700000
slow_query_log_file           = D:\php_study\phpstudy_pro\Extensions\MySQL8.0.12\data\fang-slow.log
log_queries_not_using_indexes = OFF
```

> 验证持久化结果：

```text
log_queries_not_using_indexes = OFF
long_query_time               = 0.700000
slow_query_log                = ON
```

> 当前配置由 `mysqld-auto.cnf` 管理；如果以后要统一由 `my.ini` 管理，需要先清理对应 persisted 变量，再写入 `my.ini` 并重启 MySQL。

### 1.2 日志验证

执行：

```sql
SELECT SLEEP(1);
```

结果：

```text
Slow_queries = 1
```

慢查询日志出现：

```text
# Query_time: 1.009362  Lock_time: 0.000000 Rows_sent: 1 Rows_examined: 0
SELECT SLEEP(1);
```

说明日志和阈值都生效。

### 1.3 Prometheus 指标

MySQL 不会主动推送指标，新增 `MySqlSlowQueryMetrics` 定时读取：

| 指标 | 含义 |
|---|---|
| `mysql_slow_queries` | `Slow_queries` 累计值 |
| `mysql_slow_query_log_enabled` | 慢查询日志是否开启（1/0） |
| `mysql_slow_query_threshold_seconds` | 当前阈值（秒） |

实测输出：

```text
mysql_slow_queries{application="blog"} 1.0
mysql_slow_query_log_enabled{application="blog"} 1.0
mysql_slow_query_threshold_seconds{application="blog"} 0.7
```

采集间隔：

```yaml
blog:
  mysql:
    slow-query:
      refresh-ms: 30000
```

### 1.4 注意

- `Slow_queries` 是 MySQL 启动以来的累计值，不是当前窗口增量。
- 指标每 30 秒刷新一次，不是实时。
- 采集失败只记录 `warn`，不影响业务。

---

## 2. 定时任务执行耗时

### 2.1 实现方式

项目没有引入 AspectJ/AOP，`@Timed` 不会生效，因此使用显式 Micrometer `Timer`：

```java
Timer.Sample sample = taskMetrics.start();
try {
    // 任务逻辑
} finally {
    taskMetrics.stop(sample, "task-name");
}
```

指标：

```text
blog_task_duration_seconds
```

标签：

```text
task=view-count-flush
task=view-count-batch-cleanup
task=visit-log-backfill
task=visit-log-aggregate
task=post-cache-warmup
```

### 2.2 已接入任务

| 任务 | task 标签 |
|---|---|
| 浏览量刷库 | `view-count-flush` |
| 浏览量批次清理 | `view-count-batch-cleanup` |
| 访问日志启动回填 | `visit-log-backfill` |
| 访问日志增量聚合 | `visit-log-aggregate` |
| 热门文章缓存预热 | `post-cache-warmup` |

### 2.3 验证

实测输出：

```text
blog_task_duration_seconds_count{task="post-cache-warmup"} 1
blog_task_duration_seconds_sum{task="post-cache-warmup"} 0.1232306
blog_task_duration_seconds_max{task="post-cache-warmup"} 0.1232306
```

PromQL：

```promql
histogram_quantile(0.95,
  sum by (le, task) (
    rate(blog_task_duration_seconds_bucket{application="blog"}[5m])
  )
)
```

> 没有执行过的任务会显示 `NaN` 或没有数据，这是正常的。

---

## 3. Redis 命令耗时面板

### 3.1 原问题

原面板查询：

```promql
histogram_quantile(0.95,
  sum by (le) (
    rate(lettuce_command_completion_seconds_bucket{application="blog"}[1m])
  )
)
```

实际指标不存在。Spring Boot 4 的 Lettuce 指标是 summary：

```text
lettuce_seconds_count
lettuce_seconds_sum
lettuce_seconds_max
```

标签包含：

```text
db_operation=GET/SET/EVAL/EVALSHA/HDEL/HGETALL/SCAN/PING...
db_system=redis
```

所以 `histogram_quantile` 永远算不出来。

### 3.2 修正后的查询

平均耗时：

```promql
sum by (db_operation) (
  rate(lettuce_seconds_sum{application="blog"}[1m])
)
/
sum by (db_operation) (
  rate(lettuce_seconds_count{application="blog"}[1m])
)
```

最大耗时：

```promql
max by (db_operation) (
  lettuce_seconds_max{application="blog"}
)
```

实测有数据：

```text
GET=0.0004786
SET=0.0004786
HGETALL=0.0002932
SCAN=0.0003382
EVALSHA=0.0002974
```

> summary 只能算平均值和最大值，不能算 P95。要 P95 需要把 Lettuce 指标改成直方图，当前版本没有提供该开关。

---

## 4. Grafana 面板

`ops/observability/grafana/dashboards/blog-baseline.json` 现有 14 个面板，新增/修正：

| 面板 | 内容 |
|---|---|
| 10 | Redis 命令耗时（Lettuce summary） |
| 11 | 定时任务执行耗时 P95 |
| 12 | MySQL 慢查询与阈值 |
| 13 | Hikari 获取连接超时（5m） |
| 14 | Hikari 连接使用时长（平均 / 最大） |

Grafana 已加载：

```text
panels=14
id=10 title=Redis 命令耗时（Lettuce summary）
id=11 title=定时任务执行耗时 P95
id=12 title=MySQL 慢查询与阈值
id=13 title=Hikari 获取连接超时（5m）
id=14 title=Hikari 连接使用时长（平均 / 最大）
```

---

## 5. 验证汇总

| 项目 | 结果 |
|---|---|
| 慢查询日志开启 | ON |
| 慢查询阈值 | 0.7s |
| `SELECT SLEEP(1)` 被记录 | 是 |
| `mysql_slow_queries` | 1 |
| 任务耗时指标 | 有数据 |
| Redis 平均耗时查询 | 有数据 |
| Grafana 面板 | 14 个已加载 |
| 后端测试 | 62 个通过（排除受临时目录权限影响的 LocalFileStorageTest） |

---

## 6. 已知限制

1. **慢查询配置已通过 `SET PERSIST` 持久化**：写入 `mysqld-auto.cnf`，MySQL 重启后仍生效；该文件在 MySQL 数据目录，不随项目提交。
2. **慢查询指标是累计值**：适合看总量和增长趋势，不适合看“最近 5 分钟新增”。
3. **Redis 是 summary 不是 histogram**：只能算平均/最大，不能算 P95。
4. **任务耗时只有执行过才有数据**：未执行的任务显示 `NaN` 或无数据。
5. **慢查询日志文件在 MySQL 数据目录**：不在仓库内，不随项目提交。



