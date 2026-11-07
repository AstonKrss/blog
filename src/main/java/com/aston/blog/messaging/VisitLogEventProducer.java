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