# RabbitMQ 访问日志异步链路

> 完成日期：2026-11-07
> 阶段：3
> 状态：核心链路已实现，真实 RabbitMQ 联调、积压监控和 DLQ 重放演练待完成

---

## 1. 目标与边界

本阶段只处理一条链路：

```text
HTTP 请求完成
  -> VisitLoggingInterceptor 采集访问信息
  -> VisitLogEventProducer 发送事件
  -> RabbitMQ
  -> VisitLogEventConsumer 消费
  -> MySQL visit_logs
```

在线人数标记仍使用 Redis；浏览量和访问日志不要混进同一条 MQ 链路。

生产端采用 **fail-open**：

- RabbitMQ 不可用时，只记录失败指标和日志；
- 不把异常返回给用户；
- 当前事件允许丢失；
- 这是可用性优先，不是可靠 Outbox 投递。

如果后续要求“RabbitMQ 停机期间的事件也必须最终落库”，应增加 MySQL Outbox 和后台补发任务。

---

## 2. RabbitMQ 拓扑

```text
Exchange: blog.events (direct, durable)
Binding key: visit.recorded
Queue: visit.log.write (durable)
DLX: blog.dlx (direct, durable)
Dead-letter routing key: visit.log.write.dead
DLQ: visit.log.write.dlq (durable)
```

正常路径：

```text
blog.events --visit.recorded--> visit.log.write
```

失败路径：

```text
visit.log.write --x-dead-letter-exchange--> blog.dlx
                             --visit.log.write.dead--> visit.log.write.dlq
```

选择 `direct` 的原因：

- 当前只有一个明确的 `visit.recorded` 事件；
- Routing Key 精确匹配，配置简单；
- 等出现多种访问事件后，再评估是否改成 `topic`。

---

## 3. 代码结构

| 文件 | 职责 |
|---|---|
| `src/main/java/com/aston/blog/config/RabbitMqConfig.java` | 声明 Exchange、Queue、Binding、DLX、DLQ 和 JSON 转换器 |
| `src/main/java/com/aston/blog/event/VisitLogRecordedEvent.java` | 访问日志事件结构 |
| `src/main/java/com/aston/blog/messaging/VisitLogEventProducer.java` | 生成 eventId、发送消息、处理 Publisher Confirm |
| `src/main/java/com/aston/blog/messaging/VisitLogEventConsumer.java` | 消费、有限重试、提交后 ACK、失败 NACK |
| `src/main/java/com/aston/blog/config/VisitLoggingInterceptor.java` | 从 HTTP 请求采集 ip/path/UA/referer |
| `src/main/java/com/aston/blog/Service/impl/VisitLogServiceImpl.java` | 在线人数标记和幂等落库 |
| `src/main/java/com/aston/blog/repository/VisitLogRepository.java` | 基于 event_id 的 MySQL 幂等插入 |
| `src/main/resources/db/migration/V5__visit_log_event_id.sql` | 增加并回填 event_id 唯一键 |

---

## 4. 事件结构

```java
public record VisitLogRecordedEvent(
        String eventId,
        LocalDateTime occurredAt,
        String ip,
        String path,
        String userAgent,
        String referer
) {
}
```

`eventId` 在 Producer 中生成一次。消费者重复收到同一条消息时，不能重新生成 eventId，否则数据库唯一键无法防重。

---

## 5. 生产端

### 5.1 请求入口

`VisitLoggingInterceptor.afterCompletion()`：

```java
visitLogService.markOnline(ip);
visitLogEventProducer.publish(ip, userAgent, referer, path);
```

职责拆分：

- Interceptor 只负责从 HTTP 请求采集数据；
- `markOnline` 仍然是 Redis 低价值状态，失败允许少计；
- Producer 负责 eventId、消息内容和发送确认。

### 5.2 Publisher Confirm

Producer 使用 `CorrelationData` 观察 Broker 确认：

```java
CorrelationData correlationData = new CorrelationData(eventId);
correlationData.getFuture().whenComplete((confirm, error) -> {
    if (error != null || confirm == null || !confirm.isAck()) {
        meterRegistry.counter("rabbit.visit.publish.confirm.failures").increment();
    }
});
```

要明确：

- Publisher Confirm 只代表 RabbitMQ 接收了消息；
- 不代表 Consumer 已经把数据写进 MySQL；
- 对于重要业务，还需要 Consumer ACK 和数据库幂等。

### 5.3 fail-open 语义

```java
try {
    rabbitTemplate.convertAndSend(...);
} catch (RuntimeException ex) {
    meterRegistry.counter("rabbit.visit.publish.failures").increment();
    log.warn(...);
}
```

RabbitMQ 停机时事件会丢失，但 HTTP 请求不失败。

---

## 6. 消费端

### 6.1 手动 ACK

消费者使用手动 ACK：

```java
@RabbitListener(queues = RabbitMqConfig.VISIT_LOG_QUEUE, ackMode = "MANUAL")
public void consume(VisitLogRecordedEvent event, Channel channel,
        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {
    processWithRetry(event);
    channel.basicAck(deliveryTag, false);
}
```

顺序必须是：

```text
数据库事务提交
  -> ACK
```

不能先 ACK 再写库。否则消费者在写库前崩溃，消息已经删除，日志永久丢失。

### 6.2 有限重试

当前每次投递最多尝试 3 次：

```text
第 1 次失败 -> 等待约 1 秒
第 2 次失败 -> 等待约 2 秒
第 3 次失败 -> NACK(requeue=false)
```

相关配置：

```yaml
blog:
  visit-log:
    mq:
      max-attempts: 3
      backoff-ms: 1000
```

这是进程内重试，优点是实现简单；缺点是消费者进程崩溃会丢失当前重试状态，但消息尚未 ACK，RabbitMQ 仍会重新投递。

### 6.3 DLQ

重试耗尽后：

```java
channel.basicNack(deliveryTag, false, false);
```

- 第二个参数 `false`：不批量拒绝；
- 第三个参数 `false`：不重新入原队列；
- 队列参数将消息路由到 `blog.dlx`，最终进入 `visit.log.write.dlq`。

---

## 7. 幂等落库

### 7.1 数据库约束

`V5__visit_log_event_id.sql`：

```sql
ALTER TABLE visit_logs ADD COLUMN event_id varchar(36) NULL AFTER id;
UPDATE visit_logs SET event_id = id WHERE event_id IS NULL;
ALTER TABLE visit_logs MODIFY COLUMN event_id varchar(36) NOT NULL;
CREATE UNIQUE INDEX uk_visit_log_event ON visit_logs(event_id);
```

旧数据用原 `id` 回填，避免新增非空列时失败。

### 7.2 幂等插入

Repository 使用：

```sql
INSERT INTO visit_logs (...)
VALUES (...)
ON DUPLICATE KEY UPDATE event_id = :eventId
```

并配套唯一索引：

```text
uk_visit_log_event(event_id)
```

重复消息到达时：

```text
event_id 已存在
  -> 不插入第二行
  -> 不抛业务错误
  -> 消费者正常 ACK
```

真正的防重边界是数据库唯一索引，不能只依赖“先查再插”。

---

## 8. 配置与部署

### 8.1 后端配置

```yaml
spring:
  rabbitmq:
    host: ${SPRING_RABBITMQ_HOST:localhost}
    port: ${SPRING_RABBITMQ_PORT:5672}
    username: ${SPRING_RABBITMQ_USERNAME:guest}
    password: ${SPRING_RABBITMQ_PASSWORD:guest}
    connection-timeout: 2s
    publisher-confirm-type: correlated
    publisher-returns: true
    template:
      mandatory: true
    listener:
      simple:
        acknowledge-mode: manual
        prefetch: 10
        default-requeue-rejected: false
```

### 8.2 Compose

```text
rabbitmq:
  image: rabbitmq:3.13-management
  ports:
    - 5672:5672
    - 15672:15672
```

管理页面：`http://localhost:15672`

### 8.3 健康检查

因为访问日志允许 fail-open，RabbitMQ 不应让业务实例健康检查变 DOWN：

```yaml
management:
  health:
    rabbit:
      enabled: false
```

RabbitMQ 是否正常应通过 `rabbit.visit.publish.failures`、Publisher Confirm 失败和队列积压告警观察，而不是摘除整个业务实例。

---

## 9. 指标

| 指标 | 含义 |
|---|---|
| `rabbit.visit.publish.attempts` | 生产者尝试发送次数 |
| `rabbit.visit.publish.failures` | 连接/发送立即失败次数 |
| `rabbit.visit.publish.confirm.failures` | Broker Confirm 失败次数 |
| `rabbit.visit.publish.unroutable` | Mandatory 返回的不可路由消息数 |
| `rabbit.visit.consume.success` | 消费并 ACK 成功次数 |
| `rabbit.visit.consume.retries` | 消费重试次数 |
| `rabbit.visit.consume.dlq` | 重试耗尽、NACK 进 DLQ 次数 |
| `rabbit.visit.consume.duration` | 消费耗时 Timer |
| `visit.log.interceptor.failures` | 拦截器采集阶段异常次数 |

---

## 10. 验证结果

### 10.1 单元/上下文测试

```text
25 个测试类，93 个测试，0 失败，0 错误
4 个 Testcontainers 用例因本机无 Docker 跳过
```

新增测试覆盖：

- RabbitMQ 发送失败时 Producer 不向 HTTP 请求抛异常；
- 消费者失败后重试，成功时 ACK；
- 重试耗尽后 NACK 进入 DLQ；
- Queue 的 durable 和 dead-letter 参数；
- Spring 上下文在 RabbitMQ 不在线时仍能启动。

### 10.2 RabbitMQ 离线烟测

在 RabbitMQ 未启动的情况下启动 8081 临时实例：

```text
GET /actuator/health -> UP
```

请求文章列表 5 次：

```text
5/5 HTTP 200
响应时间约 9～70 ms
rabbit_visit_publish_failures_total = 5
```

说明：

- HTTP 业务请求没有被 RabbitMQ 故障阻断；
- Producer 记录失败指标；
- RabbitMQ 健康项未把整个业务实例标记为 DOWN；
- 该验证只证明 fail-open 生效，不代表消息在恢复后能补发。

---

## 11. 已知限制与下一步

当前未完成：

1. 真实 RabbitMQ 容器启动后的消息端到端验证；
2. RabbitMQ 停止 30 秒、恢复后新消息继续消费的演练；
3. 重复消息的真实 Broker 重投验证；
4. DLQ 消息查看与手动重放脚本；
5. 队列积压、unacked、consumer count 的 Grafana 面板；
6. 消费者批量写 MySQL。

当前明确取舍：

- 生产端是 fail-open，RabbitMQ 故障期间事件可能丢失；
- 消费者重试是进程内重试，不是独立的延迟重试队列；
- 未实现 Outbox；若要求访问日志绝对不丢，必须升级为 Outbox + 后台发布任务。

---

## 12. 启动与验证命令

```bash
# 只启动 RabbitMQ
docker compose up -d rabbitmq

# 查看容器健康状态
docker compose ps rabbitmq

# 管理页面
# http://localhost:15672

# 启动本地后端
mvn spring-boot:run
```

首次启动后可检查：

```text
Exchange: blog.events
Exchange: blog.dlx
Queue: visit.log.write
Queue: visit.log.write.dlq
```

停止 RabbitMQ 后，业务接口仍应返回 200；Prometheus 中应能看到：

```text
rabbit_visit_publish_failures_total
```
