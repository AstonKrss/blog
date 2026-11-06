# Hikari 连接池等待采样报告

> 日期：2026-11-04  
> 测试库：`myblog_bench`  
> 接口：`GET /api/public/notes?page=0&limit=20`  
> 后端：Spring Boot 4.0.5 / Java 23 / 端口 8081  
> 数据库：MySQL 8.0.12  
> 采样脚本：`ops/observability/hikari-sampling.ps1`

---

## 1. 采样目标

Hikari 的 `pending` 是一个瞬时 gauge。Prometheus 默认 5 秒抓取一次，短时间的连接池排队可能被漏掉。

本轮用独立脚本直接轮询 `/actuator/prometheus`，采集：

| 指标 | 含义 |
|---|---|
| `hikaricp_connections_active` | 当前正在被业务使用的连接数 |
| `hikaricp_connections_pending` | 当前等待获取连接的线程数 |
| `hikaricp_connections_idle` | 当前空闲连接数 |
| `hikaricp_connections_max` | 连接池上限 |
| `hikaricp_connections_acquire_seconds_count/sum/max` | 获取连接耗时 |
| `hikaricp_connections_timeout_total` | 获取连接超时累计数 |
| `hikaricp_connections_usage_seconds_count/sum/max` | 连接被业务持有的时长 |

采样目标间隔是 50ms，但每次抓取 actuator 本身有开销，实际采样间隔约 185～238ms。

---

## 2. 测试方法

每次正式采样前：

1. 重启 8081，清空 Hikari 累计 `_max` 指标。
2. 用 10 VU 预热 5 秒。
3. 启动 k6 压测，同时每 50ms 轮询一次指标。
4. 记录 CSV 和 JSON 汇总。

脚本：

```powershell
pwsh -File ops/observability/hikari-sampling.ps1 `
  -BaseUrl http://localhost:8081 `
  -Vus 100 `
  -Duration 20s `
  -IntervalMs 50 `
  -OutputCsv build-bench/hikari-100vu-pool10-samples.csv `
  -OutputJson build-bench/hikari-100vu-pool10-summary.json `
  -K6Summary build-bench/hikari-100vu-pool10-k6-summary.json
```

---

## 3. 结果总览

### 3.1 连接池 10：50 VU

| 指标 | 结果 |
|---|---:|
| 请求数 | 9,112 |
| 吞吐 | 453.17 req/s |
| HTTP 平均延迟 | 9.21 ms |
| HTTP P95 | 15.67 ms |
| HTTP P99 | 28.97 ms |
| 最大活跃连接 | 10 / 10 |
| 最大 pending | 0 |
| 获取连接平均耗时 | 0.04 ms |
| 获取连接最大耗时 | 24.914 ms |
| 获取连接超时 | 0 |

结论：50 VU 下连接池会打满，但没有形成可观测的等待队列。

### 3.2 连接池 10：100 VU

| 指标 | 结果 |
|---|---:|
| 请求数 | 16,322 |
| 吞吐 | 811.78 req/s |
| HTTP 平均延迟 | 20.34 ms |
| HTTP P95 | 71.45 ms |
| HTTP P99 | 124.10 ms |
| HTTP 最大延迟 | 261.91 ms |
| 最大活跃连接 | 10 / 10 |
| 最大 pending | 23 |
| 有 pending 的采样比例 | 22.68% |
| 获取连接平均耗时 | 1.611 ms |
| 获取连接最大耗时 | 149.636 ms |
| 获取连接超时 | 0 |

结论：100 VU 下连接池 10 明显饱和，出现 23 个线程同时等待连接；获取连接最大耗时约 150ms。

### 3.3 连接池 20：100 VU

| 指标 | 结果 |
|---|---:|
| 请求数 | 17,232 |
| 吞吐 | 857.11 req/s |
| HTTP 平均延迟 | 14.35 ms |
| HTTP P95 | 40.64 ms |
| HTTP P99 | 66.61 ms |
| HTTP 最大延迟 | 135.46 ms |
| 最大活跃连接 | 20 / 20 |
| 最大 pending | 0 |
| 获取连接平均耗时 | 0.061 ms |
| 获取连接最大耗时 | 74.730 ms |
| 获取连接超时 | 0 |

结论：连接池从 10 调到 20 后，100 VU 下 pending 从 23 降到 0，P95 从 71.45ms 降到 40.64ms，P99 从 124.10ms 降到 66.61ms。

### 3.4 连接池 20：150 VU

| 指标 | 结果 |
|---|---:|
| 请求数 | 26,885 |
| 吞吐 | 1,337.07 req/s |
| HTTP 平均延迟 | 10.46 ms |
| HTTP P95 | 23.13 ms |
| HTTP P99 | 49.33 ms |
| HTTP 最大延迟 | 159.29 ms |
| 最大活跃连接 | 18 / 20 |
| 最大 pending | 0 |
| 获取连接平均耗时 | 0.047 ms |
| 获取连接最大耗时 | 74.730 ms |
| 获取连接超时 | 0 |

结论：连接池 20 在 150 VU 下仍有余量，没有重新出现 pending。该轮在 100 VU 之后运行，JVM 已充分预热，因此延迟低于 100 VU 轮次，不能把它当成严格线性容量结论。

---

## 4. 对比

| 场景 | 最大活跃 | 最大 pending | 获取连接平均 | 获取连接最大 | HTTP P95 | HTTP P99 | 吞吐 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 10 连接 / 50 VU | 10/10 | 0 | 0.04 ms | 24.9 ms | 15.67 ms | 28.97 ms | 453 req/s |
| 10 连接 / 100 VU | 10/10 | 23 | 1.611 ms | 149.6 ms | 71.45 ms | 124.10 ms | 812 req/s |
| 20 连接 / 100 VU | 20/20 | 0 | 0.061 ms | 74.7 ms | 40.64 ms | 66.61 ms | 857 req/s |
| 20 连接 / 150 VU | 18/20 | 0 | 0.047 ms | 74.7 ms | 23.13 ms | 49.33 ms | 1,337 req/s |

---

## 5. 解释

### 5.1 pending 是什么

`pending` 表示已经有线程想借数据库连接，但池子里没有空闲连接，只能排队等待。

- `pending = 0`：没有线程排队。
- `pending = 23`：有 23 个线程在等连接。
- `active = 10/10` 且 `pending > 0`：连接池已经饱和。

### 5.2 为什么 50 VU 打满但没有 pending

连接池被打满不等于一定排队。只要每个请求持有连接的时间很短，连接释放得快，后来的请求可能刚好拿到刚释放的连接。

50 VU 时 `active` 到过 10/10，但 `pending` 仍为 0，说明连接周转速度还跟得上。

### 5.3 为什么 100 VU 开始排队

100 VU 时并发请求更多，连接池只有 10 个连接，部分线程必须等待。采样中 22.68% 的样本出现 pending，最大到 23。

### 5.4 为什么连接池 20 有效

100 VU 下连接池 20 消除了 pending，P95/P99 明显下降。说明在这个测试场景里，瓶颈首先是连接池并发度，而不是单条 SQL 太慢。

但这不表示连接池越大越好：

- 连接数增加会占用更多 MySQL 连接和内存。
- 如果数据库 CPU 或慢 SQL 是瓶颈，继续加连接不会提升吞吐。
- 多实例部署时，每个实例的池大小要乘以实例数。

---

## 6. 已落地配置

已将 `src/main/resources/application.yml` 调整为：

```yaml
spring:
  datasource:
    hikari:
      minimum-idle: ${BLOG_DB_POOL_MIN_IDLE:10}
      maximum-pool-size: ${BLOG_DB_POOL_MAX_SIZE:20}
```

启动后实测：

```text
hikaricp_connections_min{application="blog"}  10.0
hikaricp_connections_max{application="blog"}  20.0
hikaricp_connections_idle{application="blog"} 10.0
```

### 6.1 min10/max20 回归结果

| 场景 | 最大活跃 | 最大 pending | 获取连接平均 | 获取连接最大 | HTTP P95 | HTTP P99 | 吞吐 |
|---|---:|---:|---:|---:|---:|---:|---:|
| min10/max20，100 VU | 18/20 | 0 | 0.128 ms | 104.986 ms | 55.71 ms | 97.59 ms | 830 req/s |
| min10/max20，150 VU | 20/20 | 5 | 0.106 ms | 104.986 ms | 49.30 ms | 81.68 ms | 1,211 req/s |

结论：

- 100 VU 下没有 pending，连接池 20 足够。
- 150 VU 下连接池扩到 20 后开始出现少量 pending，最大 5，9.76% 的采样点有等待。
- 获取连接超时仍为 0。
- 如果目标长期超过 150 VU，需要继续评估数据库查询能力，而不是盲目继续加连接。

### 6.2 与固定 20 的差异

之前测试的固定 20（min20/max20）在 150 VU 下没有 pending；min10/max20 在 150 VU 下出现少量 pending。差异主要来自：

- 固定 20 启动后就有 20 个连接，突发时无需创建新连接。
- min10/max20 在流量上升时需要动态创建连接，存在短暂扩容窗口。
- 两轮测试的 JVM 预热状态不同，不能做严格线性对比。

### 6.3 配置语义

`minimum-idle=10` 不是线程池的“核心线程数”。它的含义是：

- 池中至少保留 10 个空闲连接。
- 并发升高时，连接总数可以增长到 `maximum-pool-size=20`。
- 并发下降后，超过 10 个的空闲连接会在 Hikari 默认 `idleTimeout`（10 分钟）后被回收。
- 如果 20 个连接都被占用，新的借用线程会等待，最多等待 Hikari `connectionTimeout`（默认 30 秒），而不是进入任务队列。

---

## 7. 产物

| 文件 | 内容 |
|---|---|
| `ops/observability/hikari-sampling.ps1` | 可重复运行的 Hikari 采样脚本 |
| `build-bench/hikari-50vu-50ms-samples.csv` | 10 连接 / 50 VU 原始样本 |
| `build-bench/hikari-100vu-50ms-samples.csv` | 10 连接 / 100 VU 原始样本 |
| `build-bench/hikari-100vu-pool20-samples.csv` | 20 连接 / 100 VU 原始样本 |
| `build-bench/hikari-150vu-pool20-samples.csv` | 固定 20 连接 / 150 VU 原始样本 |
| `build-bench/hikari-100vu-min10-max20-samples.csv` | min10/max20 / 100 VU 原始样本 |
| `build-bench/hikari-150vu-min10-max20-samples.csv` | min10/max20 / 150 VU 原始样本 |
| `ops/observability/grafana/dashboards/blog-baseline.json` | 新增 pending 5m 峰值、超时、连接使用时长面板 |

---

## 8. 限制

- 本地单机测试，不是生产网络和生产硬件。
- 采样间隔目标 50ms，但实际约 185～238ms，极短峰值仍可能漏采。
- `hikaricp_connections_acquire_seconds_max` 是应用启动以来的最大值，每轮测试前已重启实例。
- 150 VU 轮次在 100 VU 之后运行，JVM 已预热，不能与首轮直接做严格线性对比。
- 本轮只测笔记列表接口，不代表所有接口的连接池行为。


