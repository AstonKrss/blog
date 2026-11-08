package com.aston.blog.messaging;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.event.VisitLogRecordedEvent;
import com.rabbitmq.client.Channel;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisitLogEventConsumerTest {

    @Mock
    private VisitLogService visitLogService;
    @Mock
    private MessageConverter messageConverter;
    @Mock
    private Channel channel;

    private VisitLogEventConsumer consumer;

    @BeforeEach
    void setUp() {
        consumer = new VisitLogEventConsumer(visitLogService, messageConverter, new SimpleMeterRegistry());
        ReflectionTestUtils.setField(consumer, "maxAttempts", 1);
        ReflectionTestUtils.setField(consumer, "backoffMs", 0L);
    }

    @Test
    void successfulBatchIsAckedAfterPersistence() throws Exception {
        VisitLogRecordedEvent first = event("event-1");
        VisitLogRecordedEvent second = event("event-2");
        Message firstMessage = message(11L);
        Message secondMessage = message(12L);
        when(messageConverter.fromMessage(firstMessage)).thenReturn(first);
        when(messageConverter.fromMessage(secondMessage)).thenReturn(second);
        doNothing().when(visitLogService).persistVisits(anyList());

        consumer.consumeBatch(List.of(firstMessage, secondMessage), channel);

        verify(visitLogService).persistVisits(List.of(first, second));
        verify(channel).basicAck(11L, false);
        verify(channel).basicAck(12L, false);
    }

    @Test
    void failedSingleMessageIsIsolatedAndNackedToDlq() throws Exception {
        VisitLogRecordedEvent good = event("good");
        VisitLogRecordedEvent bad = event("bad");
        Message goodMessage = message(21L);
        Message badMessage = message(22L);
        when(messageConverter.fromMessage(goodMessage)).thenReturn(good);
        when(messageConverter.fromMessage(badMessage)).thenReturn(bad);
        doAnswer(invocation -> {
            List<VisitLogRecordedEvent> events = invocation.getArgument(0);
            if (events.stream().anyMatch(event -> "bad".equals(event.eventId()))) {
                throw new RuntimeException("poison");
            }
            return null;
        }).when(visitLogService).persistVisits(anyList());

        consumer.consumeBatch(List.of(goodMessage, badMessage), channel);

        verify(channel).basicAck(21L, false);
        verify(channel).basicNack(22L, false, false);
    }

    @Test
    void conversionFailureIsNackedWithoutDatabaseWrite() throws Exception {
        Message badMessage = message(31L);
        when(messageConverter.fromMessage(badMessage)).thenThrow(new RuntimeException("bad json"));

        consumer.consumeBatch(List.of(badMessage), channel);

        verify(channel).basicNack(31L, false, false);
        verify(visitLogService, org.mockito.Mockito.never()).persistVisits(anyList());
    }

    private VisitLogRecordedEvent event(String eventId) {
        return new VisitLogRecordedEvent(eventId, LocalDateTime.now(), "127.0.0.1",
                "/api/public/posts", "ua", "ref");
    }

    private Message message(long deliveryTag) {
        MessageProperties properties = new MessageProperties();
        properties.setDeliveryTag(deliveryTag);
        return new Message(new byte[0], properties);
    }
}