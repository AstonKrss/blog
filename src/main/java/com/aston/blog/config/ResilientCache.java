package com.aston.blog.config;

import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.lang.Nullable;

import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Redis 缓存降级包装。
 *
 * Redis 命中/未命中仍然遵循 Spring Cache 语义；只有 Redis 操作抛异常时，
 * 才退化为“当前没有缓存”：get 返回 null，让 @Cacheable 方法回源数据库。
 *
 * 注意：evict/clear 失败时无法立刻删除旧缓存，只记录失败指标并等待 TTL 过期。
 */
public class ResilientCache implements Cache {

    private static final Logger log = LoggerFactory.getLogger(ResilientCache.class);
    private static final long FAILURE_LOG_INTERVAL_MS = 30_000L;

    private final Cache delegate;
    private final MeterRegistry meterRegistry;
    private final AtomicLong lastFailureLogAt = new AtomicLong();

    public ResilientCache(Cache delegate, MeterRegistry meterRegistry) {
        this.delegate = delegate;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public String getName() {
        return delegate.getName();
    }

    @Override
    public Object getNativeCache() {
        return delegate.getNativeCache();
    }

    @Override
    @Nullable
    public ValueWrapper get(Object key) {
        try {
            return delegate.get(key);
        } catch (RuntimeException ex) {
            onFailure("get", key, ex);
            return null;
        }
    }

    @Override
    @Nullable
    public <T> T get(Object key, @Nullable Class<T> type) {
        try {
            return delegate.get(key, type);
        } catch (RuntimeException ex) {
            onFailure("get", key, ex);
            return null;
        }
    }

    @Override
    @Nullable
    public <T> T get(Object key, Callable<T> valueLoader) {
        try {
            return delegate.get(key, valueLoader);
        } catch (RuntimeException ex) {
            // 值加载器本身失败时不要重复执行 loader。
            if (ex instanceof ValueRetrievalException) {
                throw ex;
            }
            onFailure("get", key, ex);
            try {
                T value = valueLoader.call();
                if (value != null) {
                    try {
                        delegate.put(key, value);
                    } catch (RuntimeException putEx) {
                        onFailure("put", key, putEx);
                    }
                }
                return value;
            } catch (Exception loaderEx) {
                throw new ValueRetrievalException(key, valueLoader, loaderEx);
            }
        }
    }

    @Override
    public void put(Object key, @Nullable Object value) {
        try {
            delegate.put(key, value);
        } catch (RuntimeException ex) {
            onFailure("put", key, ex);
        }
    }

    @Override
    @Nullable
    public ValueWrapper putIfAbsent(Object key, @Nullable Object value) {
        try {
            return delegate.putIfAbsent(key, value);
        } catch (RuntimeException ex) {
            onFailure("putIfAbsent", key, ex);
            return null;
        }
    }

    @Override
    public void evict(Object key) {
        try {
            delegate.evict(key);
        } catch (RuntimeException ex) {
            onFailure("evict", key, ex);
        }
    }

    @Override
    public boolean evictIfPresent(Object key) {
        try {
            return delegate.evictIfPresent(key);
        } catch (RuntimeException ex) {
            onFailure("evictIfPresent", key, ex);
            return false;
        }
    }

    @Override
    public void clear() {
        try {
            delegate.clear();
        } catch (RuntimeException ex) {
            onFailure("clear", null, ex);
        }
    }

    @Override
    public boolean invalidate() {
        try {
            return delegate.invalidate();
        } catch (RuntimeException ex) {
            onFailure("invalidate", null, ex);
            return false;
        }
    }

    private void onFailure(String operation, Object key, RuntimeException ex) {
        meterRegistry.counter("cache.redis.failures",
                "cache", getName(),
                "operation", operation).increment();
        if ("get".equals(operation)) {
            meterRegistry.counter("cache.redis.fallbacks", "cache", getName()).increment();
        }

        long now = System.currentTimeMillis();
        long last = lastFailureLogAt.get();
        if (now - last >= FAILURE_LOG_INTERVAL_MS && lastFailureLogAt.compareAndSet(last, now)) {
            log.warn("Redis 缓存不可用，降级为无缓存 cache={} operation={} key={} reason={}",
                    getName(), operation, key, ex.getMessage());
        }
    }
}

