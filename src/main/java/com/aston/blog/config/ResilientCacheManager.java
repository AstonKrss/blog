package com.aston.blog.config;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.lang.Nullable;

import java.util.Collection;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 统一包装所有 Redis Cache。
 *
 * 因此 publicPosts、postDetail、search、tags、archive、stats 等所有缓存
 * 都共享同一套 Redis 故障降级行为，不需要逐个 Service 修改。
 */
public class ResilientCacheManager implements CacheManager {

    private final CacheManager delegate;
    private final MeterRegistry meterRegistry;
    private final CacheStampedeGuard stampedeGuard;
    private final ConcurrentMap<String, Cache> cacheWrappers = new ConcurrentHashMap<>();

    public ResilientCacheManager(CacheManager delegate, MeterRegistry meterRegistry,
            CacheStampedeGuard stampedeGuard) {
        this.delegate = delegate;
        this.meterRegistry = meterRegistry;
        this.stampedeGuard = stampedeGuard;
    }

    @Override
    @Nullable
    public Cache getCache(String name) {
        Cache cache = delegate.getCache(name);
        if (cache == null) {
            return null;
        }
        return cacheWrappers.computeIfAbsent(name, ignored -> new ResilientCache(cache, meterRegistry, stampedeGuard));
    }

    @Override
    public Collection<String> getCacheNames() {
        return delegate.getCacheNames();
    }
}


