package com.aston.blog.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RabbitMqConfigTest {

    @Test
    void visitQueueIsDurableAndDeadLettersToConfiguredExchange() {
        RabbitMqConfig config = new RabbitMqConfig();
        var queue = config.visitLogWriteQueue();

        assertThat(queue.isDurable()).isTrue();
        assertThat(queue.getArguments())
                .containsEntry("x-dead-letter-exchange", RabbitMqConfig.BLOG_DLX)
                .containsEntry("x-dead-letter-routing-key", RabbitMqConfig.VISIT_LOG_DEAD_ROUTING_KEY);
        assertThat(config.visitLogDlq().getName()).isEqualTo(RabbitMqConfig.VISIT_LOG_DLQ);
    }
}