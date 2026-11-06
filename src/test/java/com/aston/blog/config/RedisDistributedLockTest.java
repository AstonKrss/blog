package com.aston.blog.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisDistributedLockTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private SimpleMeterRegistry registry;
    private RedisDistributedLock lock;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        lock = new RedisDistributedLock(redisTemplate, registry);
    }

    @Test
    void acquireFailureReturnsNullAndRecordsMetric() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenThrow(new RuntimeException("redis down"));

        assertThat(lock.tryLock("task:test", Duration.ofMinutes(1))).isNull();
        assertThat(registry.counter("redis.lock.failures",
                "operation", "acquire", "lock", "task:test").count()).isEqualTo(1);
    }

    @Test
    void heldLockIsSkippedAndRecordsMetric() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenReturn(false);

        assertThat(lock.tryLock("task:test", Duration.ofMinutes(1))).isNull();
        assertThat(registry.counter("redis.lock.skipped",
                "lock", "task:test", "reason", "held").count()).isEqualTo(1);
    }

    @Test
    void releaseFailureDoesNotThrowAndRecordsMetric() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any()))
                .thenThrow(new RuntimeException("redis down"));

        assertThatCode(() -> lock.unlock("task:test", "token")).doesNotThrowAnyException();
        assertThat(registry.counter("redis.lock.failures",
                "operation", "release", "lock", "task:test").count()).isEqualTo(1);
    }
}
