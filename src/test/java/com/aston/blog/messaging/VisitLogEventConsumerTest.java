package com.aston.blog.messaging;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.event.VisitLogRecordedEvent;
import com.rabbitmq.client.Channel;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class VisitLogEventConsumerTest {

    @Mock
    private VisitLogService visitLogService;
    @Mock
    private Channel channel;

    private VisitLogEventConsumer consumer;
    private VisitLogRecordedEvent event;

    @BeforeEach
    void setUp() {
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        consumer = new VisitLogEventConsumer(visitLogService, meterRegistry);
        ReflectionTestUtils.setField(consumer, "maxAttempts", 3);
        ReflectionTestUtils.setField(consumer, "backoffMs", 0L);
        event = new VisitLogRecordedEvent("event-1", LocalDateTime.now(), "127.0.0.1",
                "/api/public/posts", "ua", "ref");
    }

    @Test
    void retriesThenAcksAfterSuccessfulPersistence() throws Exception {
        doThrow(new RuntimeException("db transient")).doNothing()
                .when(visitLogService).persistVisit(event);

        consumer.consume(event, channel, 7L);

        verify(visitLogService, times(2)).persistVisit(event);
        InOrder inOrder = inOrder(visitLogService, channel);
        inOrder.verify(visitLogService, times(2)).persistVisit(event);
        inOrder.verify(channel).basicAck(7L, false);
    }

    @Test
    void failedPersistenceIsNackedToDlqAfterAllAttempts() throws Exception {
        doThrow(new RuntimeException("db down"))
                .doThrow(new RuntimeException("db down"))
                .doThrow(new RuntimeException("db down"))
                .when(visitLogService).persistVisit(event);

        consumer.consume(event, channel, 9L);

        verify(visitLogService, times(3)).persistVisit(event);
        verify(channel).basicNack(9L, false, false);
    }
}