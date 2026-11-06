package com.aston.blog.config;

import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 列表/搜索类缓存使用版本号做逻辑失效：
 * 更新文章时只递增版本，旧 key 不再命中，并在 TTL 到期后自然删除。
 *
 * 这里不是业务数据，Redis 故障时返回版本 0，读路径仍由 ResilientCache 回源 MySQL。
 */
@Component
public class CacheVersionService {

    private static final Logger log = LoggerFactory.getLogger(CacheVersionService.class);
    private static final String PREFIX = "cache:version:";

    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;

    public CacheVersionService(StringRedisTemplate redisTemplate, MeterRegistry meterRegistry) {
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    public String current(String cacheName) {
        try {
            String value = redisTemplate.opsForValue().get(PREFIX + cacheName);
            return value == null ? "0" : value;
        } catch (RuntimeException ex) {
            onFailure("get", cacheName, ex);
            return "0";
        }
    }

    public void increment(String... cacheNames) {
        for (String cacheName : cacheNames) {
            try {
                redisTemplate.opsForValue().increment(PREFIX + cacheName);
            } catch (RuntimeException ex) {
                onFailure("increment", cacheName, ex);
            }
        }
    }

    private void onFailure(String operation, String cacheName, RuntimeException ex) {
        meterRegistry.counter("cache.version.failures",
                "cache", cacheName, "operation", operation).increment();
        log.warn("缓存版本操作失败，保留旧版本等待 TTL cache={} operation={} reason={}",
                cacheName, operation, ex.getMessage());
    }
}
