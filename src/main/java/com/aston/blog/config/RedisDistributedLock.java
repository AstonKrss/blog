package com.aston.blog.config;

import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * 基于 Redis 的轻量分布式锁，用于保证多实例下定时任务只执行一次。
 *
 * 只适用于短任务：锁 TTL 到期会自动释放。任务必须远小于 TTL，
 * 否则可能出现两个实例同时执行。
 */
@Component
public class RedisDistributedLock {

    private static final Logger log = LoggerFactory.getLogger(RedisDistributedLock.class);

    private static final String PREFIX = "blog:lock:";
    private static final DefaultRedisScript<Long> RELEASE_SCRIPT = new DefaultRedisScript<>(
            "if redis.call('GET', KEYS[1]) == ARGV[1] then " +
                    "return redis.call('DEL', KEYS[1]) end; return 0",
            Long.class);

    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;

    public RedisDistributedLock(StringRedisTemplate redisTemplate, MeterRegistry meterRegistry) {
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    /**
     * @return 获取成功返回 token，失败返回 null
     */
    public String tryLock(String name, Duration ttl) {
        String token = UUID.randomUUID().toString();
        try {
            Boolean acquired = redisTemplate.opsForValue()
                    .setIfAbsent(PREFIX + name, token, ttl);
            if (Boolean.TRUE.equals(acquired)) {
                return token;
            }
            meterRegistry.counter("redis.lock.skipped", "lock", name, "reason", "held").increment();
            return null;
        } catch (RuntimeException ex) {
            meterRegistry.counter("redis.lock.failures", "operation", "acquire", "lock", name).increment();
            log.warn("分布式锁获取失败，跳过本轮任务 lock={} reason={}", name, ex.getMessage());
            return null;
        }
    }

    public void unlock(String name, String token) {
        if (token == null) {
            return;
        }
        try {
            redisTemplate.execute(RELEASE_SCRIPT, List.of(PREFIX + name), token);
        } catch (RuntimeException ex) {
            meterRegistry.counter("redis.lock.failures", "operation", "release", "lock", name).increment();
            log.warn("分布式锁释放失败，等待 TTL 自动释放 lock={} reason={}", name, ex.getMessage());
        }
    }
}
