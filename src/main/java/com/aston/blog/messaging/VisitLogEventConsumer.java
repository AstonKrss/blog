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