# RabbitMQ 访问日志链路完整代码导读

> 目标：从 HTTP 请求完成，一直看到消息进入 RabbitMQ、再写入 MySQL。
> 代码基于当前项目的 RabbitMQ 访问日志实现。

## 0. 一眼看完整链路

```text
HTTP 请求完成
  -> VisitLoggingInterceptor.afterCompletion()
  -> VisitLogService.markOnline(ip)                 # Redis 在线人数，异步、允许失败
  -> VisitLogEventProducer.publish(...)              # 生成 eventId
  -> RabbitTemplate.convertAndSend(...)
  -> blog.events (direct exchange)
  -> routing key: visit.recorded
  -> visit.log.write (queue)
  -> VisitLogEventConsumer.consume(...)
  -> VisitLogServiceImpl.persistVisit(...)
  -> VisitLogRepository.insertIfAbsent(...)
  -> MySQL visit_logs
  -> basicAck(...)

失败重试耗尽
  -> basicNack(requeue=false)
  -> blog.dlx
  -> visit.log.write.dlq
```

## 1. 类与职责

| 顺序 | 类/文件 | 职责 |
|---:|---|---|
| 1 | `VisitLoggingInterceptor` | 采集 HTTP 请求信息，触发在线标记和消息发送 |
| 2 | `VisitLogRecordedEvent` | 定义消息体 |
| 3 | `RabbitMqConfig` | 声明 Exchange、Queue、Binding、DLX、DLQ、JSON 转换器 |
| 4 | `VisitLogEventProducer` | 生成 eventId、发送消息、观察 Publisher Confirm、失败降级 |
| 5 | `VisitLogEventConsumer` | 监听 Queue、重试、手动 ACK、失败 NACK 到 DLQ |
| 6 | `VisitLogService` / `VisitLogServiceImpl` | 消费端落库入口；在线标记；访问统计 |
| 7 | `VisitLogRepository` | 以 event_id 做 MySQL 幂等插入 |
| 8 | `V5__visit_log_event_id.sql` | 给旧表增加 event_id 唯一索引 |

## 2. HTTP 入口：VisitLoggingInterceptor

路径：`src/main/java/com/aston/blog/config/VisitLoggingInterceptor.java`

```java
package com.aston.blog.config;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.messaging.VisitLogEventProducer;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class VisitLoggingInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(VisitLoggingInterceptor.class);

    private final VisitLogService visitLogService;
    private final VisitLogEventProducer visitLogEventProducer;
    private final MeterRegistry meterRegistry;

    @Value("${blog.visit-log.enabled:true}")
    private boolean visitLogEnabled;

    public VisitLoggingInterceptor(VisitLogService visitLogService,
            VisitLogEventProducer visitLogEventProducer,
            MeterRegistry meterRegistry) {
        this.visitLogService = visitLogService;
        this.visitLogEventProducer = visitLogEventProducer;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        if (!visitLogEnabled) {
            return;
        }
        try {
            String path = request.getRequestURI();
            if (path.startsWith("/api/") && !path.equals("/api/auth/login")
                    && !path.equals("/api/auth/register")) {
                String ip = getClientIp(request);
                String userAgent = request.getHeader("User-Agent");
                String referer = request.getHeader("Referer");

                visitLogService.markOnline(ip);
                visitLogEventProducer.publish(ip, userAgent, referer, path);
            }
        } catch (Exception e) {
            meterRegistry.counter("visit.log.interceptor.failures").increment();
            log.warn("访问日志采集失败，不影响业务请求 path={} reason={}",
                    request.getRequestURI(), e.getMessage());
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
```

重点看 `afterCompletion()`：它不直接写 MySQL，只做两件事：`markOnline` 和 `publish`。

## 3. 消息体：VisitLogRecordedEvent

路径：`src/main/java/com/aston/blog/event/VisitLogRecordedEvent.java`

```java
package com.aston.blog.event;

import java.time.LocalDateTime;

/**
 * 访问日志事件。
 *
 * eventId 在生产者发送前生成一次，消费端用它做幂等键；重复投递时不能重新生成。
 */
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

`eventId` 是生产者生成的稳定 ID。消费者重复收到同一条消息时，不能重新生成它。

## 4. RabbitMQ 拓扑：RabbitMqConfig

路径：`src/main/java/com/aston/blog/config/RabbitMqConfig.java`

```java
package com.aston.blog.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;

@Configuration
public class RabbitMqConfig {

    public static final String BLOG_EVENTS_EXCHANGE = "blog.events";
    public static final String VISIT_RECORDED_ROUTING_KEY = "visit.recorded";
    public static final String VISIT_LOG_QUEUE = "visit.log.write";
    public static final String BLOG_DLX = "blog.dlx";
    public static final String VISIT_LOG_DEAD_ROUTING_KEY = "visit.log.write.dead";
    public static final String VISIT_LOG_DLQ = "visit.log.write.dlq";

    private static final Logger log = LoggerFactory.getLogger(RabbitMqConfig.class);

    @Bean
    public DirectExchange blogEventsExchange() {
        return new DirectExchange(BLOG_EVENTS_EXCHANGE, true, false);
    }

    @Bean
    public Queue visitLogWriteQueue() {
        return QueueBuilder.durable(VISIT_LOG_QUEUE)
                .deadLetterExchange(BLOG_DLX)
                .deadLetterRoutingKey(VISIT_LOG_DEAD_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding visitLogWriteBinding(@Qualifier("visitLogWriteQueue") Queue visitLogWriteQueue, @Qualifier("blogEventsExchange") DirectExchange blogEventsExchange) {
        return BindingBuilder.bind(visitLogWriteQueue)
                .to(blogEventsExchange)
                .with(VISIT_RECORDED_ROUTING_KEY);
    }

    @Bean
    public DirectExchange blogDlx() {
        return new DirectExchange(BLOG_DLX, true, false);
    }

    @Bean
    public Queue visitLogDlq() {
        return QueueBuilder.durable(VISIT_LOG_DLQ).build();
    }

    @Bean
    public Binding visitLogDlqBinding(@Qualifier("visitLogDlq") Queue visitLogDlq, @Qualifier("blogDlx") DirectExchange blogDlx) {
        return BindingBuilder.bind(visitLogDlq)
                .to(blogDlx)
                .with(VISIT_LOG_DEAD_ROUTING_KEY);
    }

    @Bean
    public MessageConverter rabbitMessageConverter() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
            MessageConverter rabbitMessageConverter,
            MeterRegistry meterRegistry) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(rabbitMessageConverter);
        template.setMandatory(true);
        template.setReturnsCallback(returned -> {
            meterRegistry.counter("rabbit.visit.publish.unroutable").increment();
            log.warn("访问日志消息无法路由 exchange={} routingKey={} reply={}",
                    returned.getExchange(), returned.getRoutingKey(), returned.getReplyText());
        });
        return template;
    }
}
```

对应关系：

```text
blog.events --visit.recorded--> visit.log.write
visit.log.write --x-dead-letter-exchange--> blog.dlx
blog.dlx --visit.log.write.dead--> visit.log.write.dlq
```

`blog.dlx` 和 `visit.log.write.dlq` 不是多余的交换机/队列，而是为了把失败消息隔离出来。

## 5. 生产者：VisitLogEventProducer

路径：`src/main/java/com/aston/blog/messaging/VisitLogEventProducer.java`

```java
package com.aston.blog.messaging;

import com.aston.blog.config.RabbitMqConfig;
import com.aston.blog.event.VisitLogRecordedEvent;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 访问日志生产者。
 *
 * 这里是 fail-open：RabbitMQ 不可用时只记录失败指标，不让访问日志影响业务请求。
 * Publisher Confirm 的失败通过 CorrelationData 异步回调观察，不阻塞请求线程。
 */
@Component
public class VisitLogEventProducer {

    private static final Logger log = LoggerFactory.getLogger(VisitLogEventProducer.class);
    private final RabbitTemplate rabbitTemplate;
    private final MeterRegistry meterRegistry;

    public VisitLogEventProducer(RabbitTemplate rabbitTemplate, MeterRegistry meterRegistry) {
        this.rabbitTemplate = rabbitTemplate;
        this.meterRegistry = meterRegistry;
    }

    public void publish(String ip, String userAgent, String referer, String path) {
        String eventId = UUID.randomUUID().toString();
        VisitLogRecordedEvent event = new VisitLogRecordedEvent(
                eventId, LocalDateTime.now(), ip, path, userAgent, referer);
        CorrelationData correlationData = new CorrelationData(eventId);
        correlationData.getFuture().whenComplete((confirm, error) -> {
            if (error != null || confirm == null || !confirm.isAck()) {
                meterRegistry.counter("rabbit.visit.publish.confirm.failures").increment();
                log.warn("访问日志消息 Publisher Confirm 失败 eventId={} reason={}",
                        eventId, error == null ? (confirm == null ? "no-confirm" : confirm.getReason()) : error.getMessage());
            }
        });

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.BLOG_EVENTS_EXCHANGE,
                    RabbitMqConfig.VISIT_RECORDED_ROUTING_KEY,
                    event,
                    message -> {
                        message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                        return message;
                    },
                    correlationData);
            meterRegistry.counter("rabbit.visit.publish.attempts").increment();
        } catch (RuntimeException ex) {
            // 生产端失败不影响客户端请求；该事件的丢失由 fail-open 策略接受。
            meterRegistry.counter("rabbit.visit.publish.failures").increment();
            log.warn("访问日志消息发送失败，允许丢失 eventId={} reason={}", eventId, ex.getMessage());
        }
    }
}
```

关键点：

1. `UUID.randomUUID()` 生成 eventId。
2. `CorrelationData` 用来接收 Publisher Confirm。
3. `PERSISTENT` 表示消息尽量持久化。
4. `catch` 中是 fail-open：RabbitMQ 失败不影响 HTTP 请求。

## 6. 消费者：VisitLogEventConsumer

路径：`src/main/java/com/aston/blog/messaging/VisitLogEventConsumer.java`

```java
package com.aston.blog.messaging;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.config.RabbitMqConfig;
import com.aston.blog.event.VisitLogRecordedEvent;
import com.rabbitmq.client.Channel;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 访问日志消费者。
 *
 * 消费端先让数据库事务提交，再 ACK；重复消息由 visit_logs.event_id 唯一键兜底。
 * 处理失败最多尝试 maxAttempts 次，仍失败则 NACK，消息由队列绑定进入 DLQ。
 */
@Component
public class VisitLogEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(VisitLogEventConsumer.class);
    private static final long MAX_BACKOFF_MS = 5_000L;

    private final VisitLogService visitLogService;
    private final MeterRegistry meterRegistry;
    private final Timer consumeTimer;

    @Value("${blog.visit-log.mq.max-attempts:3}")
    private int maxAttempts;

    @Value("${blog.visit-log.mq.backoff-ms:1000}")
    private long backoffMs;

    public VisitLogEventConsumer(VisitLogService visitLogService, MeterRegistry meterRegistry) {
        this.visitLogService = visitLogService;
        this.meterRegistry = meterRegistry;
        this.consumeTimer = Timer.builder("rabbit.visit.consume.duration")
                .publishPercentileHistogram()
                .register(meterRegistry);
    }

    @RabbitListener(queues = RabbitMqConfig.VISIT_LOG_QUEUE, ackMode = "MANUAL")
    public void consume(VisitLogRecordedEvent event, Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            processWithRetry(event);
            // 数据库事务已提交后才 ACK；ACK 前崩溃时 RabbitMQ 会重新投递。
            channel.basicAck(deliveryTag, false);
            meterRegistry.counter("rabbit.visit.consume.success").increment();
        } catch (Exception ex) {
            meterRegistry.counter("rabbit.visit.consume.dlq").increment();
            log.error("访问日志消费失败，消息进入 DLQ eventId={}",
                    event == null ? null : event.eventId(), ex);
            try {
                channel.basicNack(deliveryTag, false, false);
            } catch (IOException nackError) {
                log.error("访问日志消息 NACK 失败 eventId={}", event == null ? null : event.eventId(), nackError);
                throw nackError;
            }
        } finally {
            sample.stop(consumeTimer);
        }
    }

    private void processWithRetry(VisitLogRecordedEvent event) throws Exception {
        Exception lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                visitLogService.persistVisit(event);
                return;
            } catch (Exception ex) {
                lastError = ex;
                if (attempt >= maxAttempts) {
                    break;
                }
                meterRegistry.counter("rabbit.visit.consume.retries").increment();
                sleepBackoff(attempt);
            }
        }
        throw lastError == null ? new IllegalStateException("访问日志消费失败") : lastError;
    }

    private void sleepBackoff(int attempt) throws InterruptedException {
        long delay = Math.min(MAX_BACKOFF_MS, backoffMs * (1L << Math.min(attempt - 1, 10)));
        if (delay > 0) {
            Thread.sleep(delay);
        }
    }
}
```

最重要顺序：

```text
persistVisit() 完成并提交事务
  -> basicAck()
  -> RabbitMQ 删除消息
```

如果 ACK 前消费者崩溃，RabbitMQ 会重新投递，所以落库必须幂等。

## 7. 服务接口：VisitLogService

路径：`src/main/java/com/aston/blog/Service/VisitLogService.java`

```java
package com.aston.blog.Service;

import com.aston.blog.event.VisitLogRecordedEvent;
import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;

public interface VisitLogService {
    /** 只更新在线人标记，失败不影响请求。 */
    void markOnline(String ipAddress);

    /** 消费端落库入口；实现必须保证 eventId 幂等。 */
    void persistVisit(VisitLogRecordedEvent event);

    Page<com.aston.blog.entity.VisitLog> getRecentLogs(int page, int size);

    VisitAnalyticsVO getAnalytics(LocalDateTime since);

    /** 过去5分钟内的唯一IP数（即在线人数估算） */
    long countOnlineVisitors();
}
```

本链路主要使用两个方法：`markOnline()` 和 `persistVisit()`。

## 8. 服务实现：VisitLogServiceImpl

路径：`src/main/java/com/aston/blog/Service/impl/VisitLogServiceImpl.java`

```java
package com.aston.blog.Service.impl;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.event.VisitLogRecordedEvent;
import com.aston.blog.entity.VisitLog;
import com.aston.blog.repository.VisitLogAnalyticsRepository;
import com.aston.blog.repository.VisitLogRepository;
import com.aston.blog.util.IpLocationUtil;
import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VisitLogServiceImpl implements VisitLogService {

    private static final Logger log = LoggerFactory.getLogger(VisitLogServiceImpl.class);

    private final VisitLogRepository visitLogRepository;
    private final VisitLogAnalyticsRepository analyticsRepository;
    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;

    public VisitLogServiceImpl(VisitLogRepository visitLogRepository,
            VisitLogAnalyticsRepository analyticsRepository,
            StringRedisTemplate redisTemplate,
            MeterRegistry meterRegistry) {
        this.visitLogRepository = visitLogRepository;
        this.analyticsRepository = analyticsRepository;
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    // 在线判定窗口:5 分钟内有活动算"在线"
    private static final Duration ONLINE_TTL = Duration.ofMinutes(5);
    private static final String ONLINE_KEY_PREFIX = "online:ip:";

    @Override
    @Async
    public void markOnline(String ipAddress) {
        try {
            // 在线状态是低价值瞬时数据，失败时允许少计，不影响业务请求。
            redisTemplate.opsForValue().set(ONLINE_KEY_PREFIX + ipAddress, "1", ONLINE_TTL);
        } catch (Exception e) {
            meterRegistry.counter("redis.online.mark.failures").increment();
            log.warn("在线人数标记失败，允许降级 ip={} reason={}", ipAddress, e.getMessage());
        }
    }

    @Override
    public void persistVisit(VisitLogRecordedEvent event) {
        IpLocationUtil.IpInfo ipInfo = IpLocationUtil.lookup(event.ip());
        LocalDateTime occurredAt = event.occurredAt() == null ? LocalDateTime.now() : event.occurredAt();

        // 唯一键由数据库兜底；重复消息会执行无副作用更新，消费端随后照常 ACK。
        visitLogRepository.insertIfAbsent(
                event.eventId(),
                truncate(event.ip(), 45),
                truncate(event.userAgent(), 500),
                truncate(event.referer(), 500),
                truncate(event.path(), 255),
                truncate(ipInfo.getCountry(), 50),
                truncate(ipInfo.getProvince(), 50),
                truncate(ipInfo.getCity(), 50),
                truncate(ipInfo.getIsp(), 50),
                occurredAt);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    @Override
    public Page<VisitLog> getRecentLogs(int page, int size) {
        return visitLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    @Override
    public VisitAnalyticsVO getAnalytics(LocalDateTime since) {
        if (since == null) {
            since = LocalDateTime.now().minusDays(7);
        }

        VisitAnalyticsVO vo = new VisitAnalyticsVO();

        // 优先查小时聚合表，避免 visit_logs 增长后全表扫描。
        long total = analyticsRepository.totalVisits(since);
        if (total == 0 && visitLogRepository.countSince(since) > 0) {
            // 聚合尚未完成时回退到明细，保证后台面板不空白。
            return legacyAnalytics(since);
        }

        vo.setTotalVisits(total);
        vo.setUniqueIps(analyticsRepository.uniqueIps(since));
        vo.setTopCountries(convertToMapList(analyticsRepository.topCities(since), "city", "count"));
        vo.setTopIsps(convertToMapList(analyticsRepository.topIsps(since), "isp", "count"));
        vo.setTopPages(convertToMapList(analyticsRepository.topPages(since), "path", "count"));
        vo.setTopIps(convertToMapList(analyticsRepository.topIps(since), "ip", "count"));

        List<Map<String, Object>> hourly = new ArrayList<>();
        for (Object[] h : analyticsRepository.hourlyDistribution(since)) {
            Map<String, Object> item = new HashMap<>();
            item.put("hour", h[0]);
            item.put("count", ((Number) h[1]).intValue());
            hourly.add(item);
        }
        vo.setHourlyDistribution(hourly);
        return vo;
    }

    private VisitAnalyticsVO legacyAnalytics(LocalDateTime since) {
        VisitAnalyticsVO vo = new VisitAnalyticsVO();
        long total = visitLogRepository.countSince(since);
        vo.setTotalVisits(total);

        List<Object[]> ips = visitLogRepository.topIpsSince(since);
        vo.setUniqueIps(ips.size());
        vo.setTopCountries(convertToMapList(visitLogRepository.countByCitySince(since), "city", "count"));
        vo.setTopIsps(convertToMapList(visitLogRepository.countByIspSince(since), "isp", "count"));
        vo.setTopPages(convertToMapList(visitLogRepository.countByPathSince(since), "path", "count"));
        vo.setTopIps(convertToMapList(ips, "ip", "count"));

        List<Map<String, Object>> hourly = new ArrayList<>();
        for (Object[] h : visitLogRepository.countByHourSince(since)) {
            Map<String, Object> item = new HashMap<>();
            item.put("hour", h[0]);
            item.put("count", ((Number) h[1]).intValue());
            hourly.add(item);
        }
        vo.setHourlyDistribution(hourly);
        return vo;
    }

    @Override
    public long countOnlineVisitors() {
        // 用 SCAN 遍历 online:ip:* 的 key 数量,5 分钟内没活动的 IP key 已自动过期
        // SCAN 是非阻塞游标,O(N) 但不会卡 Redis;几千 IP 毫秒级
        long count = 0;
        ScanOptions options = ScanOptions.scanOptions()
                .match(ONLINE_KEY_PREFIX + "*")
                .count(100)
                .build();
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            while (cursor.hasNext()) {
                cursor.next();
                count++;
            }
        } catch (Exception e) {
            // Redis 挂了,降级返回 0(不影响主流程)
            meterRegistry.counter("redis.online.count.failures").increment();
            log.warn("在线人数统计失败，降级返回 0 reason={}", e.getMessage());
            return 0;
        }
        return count;
    }

    private List<Map<String, Object>> convertToMapList(List<Object[]> data, String key1, String key2) {
        return data.stream().limit(10).map(obj -> {
            Map<String, Object> map = new HashMap<>();
            map.put(key1, obj[0]);
            map.put(key2, ((Long) obj[1]).intValue());
            return map;
        }).collect(Collectors.toList());
    }
}
```

`persistVisit()` 负责把消息字段转成数据库参数；`markOnline()` 负责 Redis 在线状态。

## 9. MySQL 幂等：VisitLogRepository

路径：`src/main/java/com/aston/blog/repository/VisitLogRepository.java`

```java
package com.aston.blog.repository;

import com.aston.blog.entity.VisitLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface VisitLogRepository extends JpaRepository<VisitLog, String> {

    Page<VisitLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1")
    long countSince(LocalDateTime since);

    @Query("SELECT v.country, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.country ORDER BY COUNT(v) DESC")
    List<Object[]> countByCountrySince(LocalDateTime since);

    @Query(value = "SELECT COALESCE(NULLIF(CONCAT(IFNULL(province,''), IFNULL(city,'')), ''), country, '未知地区') as location, COUNT(*) as cnt FROM visit_logs WHERE created_at >= ?1 GROUP BY COALESCE(NULLIF(CONCAT(IFNULL(province,''), IFNULL(city,'')), ''), country, '未知地区') ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> countByCitySince(LocalDateTime since);

    @Query("SELECT v.isp, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.isp ORDER BY COUNT(v) DESC")
    List<Object[]> countByIspSince(LocalDateTime since);

    @Query("SELECT HOUR(v.createdAt), COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY HOUR(v.createdAt) ORDER BY HOUR(v.createdAt)")
    List<Object[]> countByHourSince(LocalDateTime since);

    @Query("SELECT v.path, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.path ORDER BY COUNT(v) DESC")
    List<Object[]> countByPathSince(LocalDateTime since);

    @Query("SELECT v.ipAddress, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.ipAddress ORDER BY COUNT(v) DESC")
    List<Object[]> topIpsSince(LocalDateTime since);

    @Query("SELECT COUNT(DISTINCT v.ipAddress) FROM VisitLog v WHERE v.createdAt >= ?1")
    long countUniqueIpsSince(LocalDateTime since);

    /**
     * 以 event_id 唯一键做幂等插入；重复消息不会产生第二行。
     */
    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO visit_logs
                (id, event_id, ip_address, user_agent, referer, path, country, province, city, isp, created_at)
            VALUES
                (UUID(), :eventId, :ipAddress, :userAgent, :referer, :path,
                 :country, :province, :city, :isp, :createdAt)
            ON DUPLICATE KEY UPDATE event_id = :eventId
            """, nativeQuery = true)
    int insertIfAbsent(@Param("eventId") String eventId,
            @Param("ipAddress") String ipAddress,
            @Param("userAgent") String userAgent,
            @Param("referer") String referer,
            @Param("path") String path,
            @Param("country") String country,
            @Param("province") String province,
            @Param("city") String city,
            @Param("isp") String isp,
            @Param("createdAt") LocalDateTime createdAt);
}
```

`ON DUPLICATE KEY UPDATE event_id = :eventId` 保证同一条事件重复投递时不会产生第二行。

## 10. 数据库迁移：V5

路径：`src/main/resources/db/migration/V5__visit_log_event_id.sql`

```sql
-- 访问日志事件的幂等键；旧数据回填为原 id，保证迁移后仍可建立唯一索引。
ALTER TABLE visit_logs ADD COLUMN event_id varchar(36) NULL AFTER id;
UPDATE visit_logs SET event_id = id WHERE event_id IS NULL;
ALTER TABLE visit_logs MODIFY COLUMN event_id varchar(36) NOT NULL;
CREATE UNIQUE INDEX uk_visit_log_event ON visit_logs(event_id);
```

## 11. 配置：application.yml

路径：`src/main/resources/application.yml`

```yaml
  # RabbitMQ：Producer 失败降级，Consumer 手动 ACK
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
  cache:

# 健康检查中排除 RabbitMQ，避免访问日志故障摘除业务实例
management:
  health:
    rabbit:
      enabled: false
```

## 12. 一句话复盘

```text
Exchange 负责路由
Queue 负责存消息
Consumer 负责处理
ACK 负责确认处理完成
DLX/DLQ 负责接住失败消息
event_id 负责重复消息幂等
```
