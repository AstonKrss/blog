package com.aston.blog.config;

import org.springframework.data.redis.cache.RedisCacheWriter;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 每个缓存条目写入时随机生成 TTL，避免大量 key 同时过期。
 * 默认范围：8～12 分钟（基础 10 分钟，抖动 ±2 分钟）。
 */
public class JitterTtlFunction implements RedisCacheWriter.TtlFunction {

    private final long minSeconds;
    private final long maxSeconds;

    public JitterTtlFunction(Duration minTtl, Duration maxTtl) {
        if (minTtl.isNegative() || maxTtl.compareTo(minTtl) < 0) {
            throw new IllegalArgumentException("TTL 范围非法");
        }
        this.minSeconds = minTtl.toSeconds();
        this.maxSeconds = maxTtl.toSeconds();
    }

    @Override
    public Duration getTimeToLive(Object key, Object value) {
        long seconds = ThreadLocalRandom.current().nextLong(minSeconds, maxSeconds + 1);
        return Duration.ofSeconds(seconds);
    }
}
