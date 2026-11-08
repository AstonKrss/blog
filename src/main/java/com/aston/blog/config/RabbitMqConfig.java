package com.aston.blog.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.AcknowledgeMode;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String BLOG_EVENTS_EXCHANGE = "blog.events";
    public static final String VISIT_RECORDED_ROUTING_KEY = "visit.recorded";
    public static final String VISIT_LOG_QUEUE = "visit.log.write";
    public static final String BLOG_DLX = "blog.dlx";
    public static final String VISIT_LOG_DEAD_ROUTING_KEY = "visit.log.write.dead";
    public static final String VISIT_LOG_DLQ = "visit.log.write.dlq";

    private static final Logger log = LoggerFactory.getLogger(RabbitMqConfig.class);

    @Value("${blog.visit-log.mq.batch-size:20}")
    private int batchSize;

    @Value("${blog.visit-log.mq.batch-receive-timeout-ms:500}")
    private long batchReceiveTimeoutMs;

    @Value("${blog.visit-log.mq.shutdown-timeout-ms:10000}")
    private long shutdownTimeoutMs;

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
    public Binding visitLogWriteBinding(
            @Qualifier("visitLogWriteQueue") Queue visitLogWriteQueue,
            @Qualifier("blogEventsExchange") DirectExchange blogEventsExchange) {
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
    public Binding visitLogDlqBinding(
            @Qualifier("visitLogDlq") Queue visitLogDlq,
            @Qualifier("blogDlx") DirectExchange blogDlx) {
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
    public SimpleRabbitListenerContainerFactory visitLogBatchListenerContainerFactory(
            ConnectionFactory connectionFactory,
            MessageConverter rabbitMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(rabbitMessageConverter);
        factory.setAcknowledgeMode(AcknowledgeMode.MANUAL);
        factory.setConsumerBatchEnabled(true);
        factory.setBatchListener(true);
        factory.setBatchSize(batchSize);
        factory.setBatchReceiveTimeout(batchReceiveTimeoutMs);
        factory.setPrefetchCount(batchSize);
        factory.setDefaultRequeueRejected(false);
        factory.setMissingQueuesFatal(false);
        factory.setContainerCustomizer(container -> container.setShutdownTimeout(shutdownTimeoutMs));
        return factory;
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