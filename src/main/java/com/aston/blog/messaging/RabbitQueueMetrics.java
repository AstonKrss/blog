package com.aston.blog.messaging;

import com.aston.blog.config.RabbitMqConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/** 通过 RabbitMQ Management HTTP API 采集队列状态；失败只记录指标，不影响业务。 */
@Component
public class RabbitQueueMetrics {

    private static final Logger log = LoggerFactory.getLogger(RabbitQueueMetrics.class);
    private final MeterRegistry meterRegistry;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    private final Map<String, AtomicLong> gauges = new ConcurrentHashMap<>();

    @Value("${blog.rabbitmq.metrics.enabled:true}")
    private boolean enabled;

    @Value("${blog.rabbitmq.management.url:http://localhost:15672}")
    private String managementUrl;

    @Value("${blog.rabbitmq.management.username:guest}")
    private String username;

    @Value("${blog.rabbitmq.management.password:guest}")
    private String password;

    public RabbitQueueMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Scheduled(fixedDelayString = "${blog.rabbitmq.metrics.interval-ms:10000}",
            initialDelayString = "${blog.rabbitmq.metrics.initial-delay-ms:10000}")
    public void poll() {
        if (!enabled) {
            return;
        }
        pollQueue(RabbitMqConfig.VISIT_LOG_QUEUE);
        pollQueue(RabbitMqConfig.VISIT_LOG_DLQ);
    }

    private void pollQueue(String queue) {
        try {
            String encodedQueue = URLEncoder.encode(queue, StandardCharsets.UTF_8);
            String base = managementUrl.endsWith("/")
                    ? managementUrl.substring(0, managementUrl.length() - 1)
                    : managementUrl;
            URI uri = URI.create(base + "/api/queues/%2F/" + encodedQueue);
            String auth = Base64.getEncoder().encodeToString(
                    (username + ":" + password).getBytes(StandardCharsets.UTF_8));
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(3))
                    .header("Authorization", "Basic " + auth)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() / 100 != 2) {
                throw new IllegalStateException("management status=" + response.statusCode());
            }
            JsonNode body = objectMapper.readTree(response.body());
            setGauge("rabbit.queue.messages", queue, body.path("messages").asLong());
            setGauge("rabbit.queue.ready", queue, body.path("messages_ready").asLong());
            setGauge("rabbit.queue.unacked", queue, body.path("messages_unacknowledged").asLong());
            setGauge("rabbit.queue.consumers", queue, body.path("consumers").asLong());
        } catch (Exception ex) {
            meterRegistry.counter("rabbit.queue.metrics.failures", "queue", queue).increment();
            log.warn("RabbitMQ 队列指标采集失败 queue={} reason={}", queue, ex.getMessage());
        }
    }

    private void setGauge(String name, String queue, long value) {
        String key = name + "|" + queue;
        AtomicLong holder = gauges.computeIfAbsent(key, ignored -> {
            AtomicLong gaugeValue = new AtomicLong();
            Gauge.builder(name, gaugeValue, AtomicLong::get)
                    .description("RabbitMQ queue metric")
                    .tag("queue", queue)
                    .register(meterRegistry);
            return gaugeValue;
        });
        holder.set(value);
    }
}