package com.aston.blog.messaging;

import com.aston.blog.config.RabbitMqConfig;
import com.aston.blog.event.VisitLogRecordedEvent;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.core.MessagePostProcessor;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class VisitLogEventProducerTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    private SimpleMeterRegistry meterRegistry;
    private VisitLogEventProducer producer;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        producer = new VisitLogEventProducer(rabbitTemplate, meterRegistry);
    }

    @Test
    void rabbitFailureIsFailOpenAndCounted() {
        doThrow(new RuntimeException("rabbit down")).when(rabbitTemplate).convertAndSend(
                eq(RabbitMqConfig.BLOG_EVENTS_EXCHANGE),
                eq(RabbitMqConfig.VISIT_RECORDED_ROUTING_KEY),
                any(VisitLogRecordedEvent.class),
                any(MessagePostProcessor.class),
                any(CorrelationData.class));

        assertThatCode(() -> producer.publish("127.0.0.1", "ua", "ref", "/api/public/posts"))
                .doesNotThrowAnyException();
        assertThat(meterRegistry.counter("rabbit.visit.publish.failures").count()).isEqualTo(1);
    }
}