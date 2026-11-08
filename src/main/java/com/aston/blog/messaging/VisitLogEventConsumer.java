package com.aston.blog.messaging;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.config.RabbitMqConfig;
import com.aston.blog.event.VisitLogRecordedEvent;
import com.rabbitmq.client.Channel;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 访问日志批量消费者。
 *
 * 方案二：一批消息整体写入；失败后二分拆批，成功的子批继续提交，
 * 最终无法写入的单条消息 NACK 到 DLQ。数据库事务提交后才 ACK。
 */
@Component
public class VisitLogEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(VisitLogEventConsumer.class);
    private static final long MAX_BACKOFF_MS = 5_000L;

    private final VisitLogService visitLogService;
    private final MessageConverter messageConverter;
    private final MeterRegistry meterRegistry;
    private final Timer consumeTimer;
    private final DistributionSummary batchSizeSummary;

    @Value("${blog.visit-log.mq.max-attempts:3}")
    private int maxAttempts;

    @Value("${blog.visit-log.mq.backoff-ms:1000}")
    private long backoffMs;

    public VisitLogEventConsumer(VisitLogService visitLogService,
            MessageConverter messageConverter,
            MeterRegistry meterRegistry) {
        this.visitLogService = visitLogService;
        this.messageConverter = messageConverter;
        this.meterRegistry = meterRegistry;
        this.consumeTimer = Timer.builder("rabbit.visit.consume.duration")
                .publishPercentileHistogram()
                .register(meterRegistry);
        this.batchSizeSummary = DistributionSummary.builder("rabbit.visit.batch.size")
                .publishPercentileHistogram()
                .register(meterRegistry);
    }

    @RabbitListener(
            containerFactory = "visitLogBatchListenerContainerFactory",
            queues = RabbitMqConfig.VISIT_LOG_QUEUE,
            ackMode = "MANUAL")
    public void consumeBatch(List<Message> messages, Channel channel) throws IOException {
        if (messages == null || messages.isEmpty()) {
            return;
        }
        Timer.Sample sample = Timer.start(meterRegistry);
        batchSizeSummary.record(messages.size());
        List<DeliveryItem> items = new ArrayList<>(messages.size());
        for (Message message : messages) {
            try {
                Object payload = messageConverter.fromMessage(message);
                if (payload instanceof VisitLogRecordedEvent event) {
                    items.add(new DeliveryItem(message, event, false));
                } else {
                    items.add(new DeliveryItem(message, null, true));
                    meterRegistry.counter("rabbit.visit.consume.conversion.failures").increment();
                }
            } catch (Exception ex) {
                items.add(new DeliveryItem(message, null, true));
                meterRegistry.counter("rabbit.visit.consume.conversion.failures").increment();
                log.warn("访问日志消息转换失败，将进入 DLQ", ex);
            }
        }

        List<Integer> failedIndexes = new ArrayList<>();
        processRange(items, 0, items.size(), failedIndexes);
        Set<Integer> failed = new HashSet<>(failedIndexes);
        for (int i = 0; i < items.size(); i++) {
            long deliveryTag = items.get(i).message().getMessageProperties().getDeliveryTag();
            if (failed.contains(i)) {
                channel.basicNack(deliveryTag, false, false);
                meterRegistry.counter("rabbit.visit.consume.dlq").increment();
            } else {
                channel.basicAck(deliveryTag, false);
                meterRegistry.counter("rabbit.visit.consume.success").increment();
            }
        }
        sample.stop(consumeTimer);
    }

    private void processRange(List<DeliveryItem> items, int from, int to, List<Integer> failedIndexes) {
        if (from >= to) {
            return;
        }
        for (int i = from; i < to; i++) {
            if (items.get(i).invalid()) {
                splitOrFail(items, from, to, failedIndexes);
                return;
            }
        }

        List<VisitLogRecordedEvent> events = items.subList(from, to).stream()
                .map(DeliveryItem::event)
                .toList();
        try {
            persistWithRetry(events);
        } catch (Exception ex) {
            if (to - from == 1) {
                failedIndexes.add(from);
                meterRegistry.counter("rabbit.visit.consume.poison").increment();
                log.error("访问日志单条消息处理失败，进入 DLQ eventId={}",
                        items.get(from).event().eventId(), ex);
            } else {
                meterRegistry.counter("rabbit.visit.batch.splits").increment();
                int mid = (from + to) / 2;
                log.warn("访问日志批次处理失败，二分拆批 from={} to={} size={} reason={}",
                        from, to, to - from, ex.getMessage());
                processRange(items, from, mid, failedIndexes);
                processRange(items, mid, to, failedIndexes);
            }
        }
    }

    private void splitOrFail(List<DeliveryItem> items, int from, int to, List<Integer> failedIndexes) {
        if (to - from == 1) {
            failedIndexes.add(from);
            meterRegistry.counter("rabbit.visit.consume.poison").increment();
            log.error("访问日志单条消息格式非法，进入 DLQ deliveryTag={}",
                    items.get(from).message().getMessageProperties().getDeliveryTag());
            return;
        }
        meterRegistry.counter("rabbit.visit.batch.splits").increment();
        int mid = (from + to) / 2;
        processRange(items, from, mid, failedIndexes);
        processRange(items, mid, to, failedIndexes);
    }

    private void persistWithRetry(List<VisitLogRecordedEvent> events) throws Exception {
        Exception lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                visitLogService.persistVisits(events);
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
        throw lastError == null ? new IllegalStateException("访问日志批量落库失败") : lastError;
    }

    private void sleepBackoff(int attempt) throws InterruptedException {
        long delay = Math.min(MAX_BACKOFF_MS, backoffMs * (1L << Math.min(attempt - 1, 10)));
        if (delay > 0) {
            Thread.sleep(delay);
        }
    }

    private record DeliveryItem(Message message, VisitLogRecordedEvent event, boolean invalid) {
    }
}