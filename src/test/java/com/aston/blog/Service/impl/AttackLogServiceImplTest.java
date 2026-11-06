package com.aston.blog.Service.impl;

import com.aston.blog.Service.ThreatSignatureService;
import com.aston.blog.repository.AttackLogRepository;
import com.aston.blog.repository.LoginAttemptRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttackLogServiceImplTest {

    @Mock
    private AttackLogRepository attackLogRepository;
    @Mock
    private LoginAttemptRepository loginAttemptRepository;
    @Mock
    private ThreatSignatureService threatSignatureService;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private SimpleMeterRegistry registry;
    private AttackLogServiceImpl service;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        service = new AttackLogServiceImpl(attackLogRepository, loginAttemptRepository,
                threatSignatureService, redisTemplate, registry);
    }

    @Test
    void blockedIpCheckFailsOpenWhenRedisIsDown() {
        when(redisTemplate.hasKey(anyString())).thenThrow(new RuntimeException("redis down"));

        assertThat(service.isIpBlocked("203.0.113.10")).isFalse();
        assertThat(registry.counter("redis.login_guard.failures",
                "operation", "blocked_check").count()).isEqualTo(1);
        assertThat(registry.counter("redis.login_guard.fail_open",
                "operation", "blocked_check").count()).isEqualTo(1);
    }

    @Test
    void bruteForceCheckFailsOpenWhenRedisIsDown() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenThrow(new RuntimeException("redis down"));

        assertThat(service.isBruteForce("203.0.113.10", "admin")).isFalse();
        assertThat(registry.counter("redis.login_guard.failures",
                "operation", "check").count()).isEqualTo(1);
    }

    @Test
    void recordingLoginAttemptKeepsDatabaseLogAndDoesNotFailWhenRedisIsDown() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("redis down"));

        assertThatCode(() -> service.recordLoginAttempt("203.0.113.10", "admin", false, "k6"))
                .doesNotThrowAnyException();

        verify(loginAttemptRepository).save(any());
        assertThat(registry.counter("redis.login_guard.failures",
                "operation", "record").count()).isEqualTo(1);
    }

    @Test
    void blockingIpFailsOpenWhenRedisIsDown() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        doThrow(new RuntimeException("redis down")).when(valueOperations)
                .set(anyString(), anyString(), any(java.time.Duration.class));

        assertThatCode(() -> service.blockIp("203.0.113.10")).doesNotThrowAnyException();
        assertThat(registry.counter("redis.login_guard.failures",
                "operation", "block").count()).isEqualTo(1);
    }
}
