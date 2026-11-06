package com.aston.blog.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.util.List;
import java.util.concurrent.Callable;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResilientCacheTest {

    @Mock
    private Cache delegate;

    private SimpleMeterRegistry registry;
    private ResilientCache cache;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        lenient().when(delegate.getName()).thenReturn("publicPosts");
        cache = new ResilientCache(delegate, registry);
    }

    @Test
    void getFailureFallsBackToCacheMiss() {
        when(delegate.get("key")).thenThrow(new RuntimeException("redis down"));

        assertThat(cache.get("key")).isNull();
        assertThat(registry.counter("cache.redis.failures",
                "cache", "publicPosts", "operation", "get").count()).isEqualTo(1);
        assertThat(registry.counter("cache.redis.fallbacks", "cache", "publicPosts").count()).isEqualTo(1);
    }

    @Test
    void callableGetLoadsFromDatabaseWhenRedisFails() {
        when(delegate.get(eq("key"), any(Callable.class))).thenThrow(new RuntimeException("redis down"));
        doThrow(new RuntimeException("redis still down")).when(delegate).put("key", "db-value");

        String value = cache.get("key", () -> "db-value");

        assertThat(value).isEqualTo("db-value");
        verify(delegate).put("key", "db-value");
        assertThat(registry.counter("cache.redis.failures",
                "cache", "publicPosts", "operation", "get").count()).isEqualTo(1);
        assertThat(registry.counter("cache.redis.failures",
                "cache", "publicPosts", "operation", "put").count()).isEqualTo(1);
    }

    @Test
    void putFailureDoesNotFailBusinessCall() {
        doThrow(new RuntimeException("redis down")).when(delegate).put("key", "value");

        assertThatCode(() -> cache.put("key", "value")).doesNotThrowAnyException();
        assertThat(registry.counter("cache.redis.failures",
                "cache", "publicPosts", "operation", "put").count()).isEqualTo(1);
    }

    @Test
    void evictFailureDoesNotFailBusinessCall() {
        doThrow(new RuntimeException("redis down")).when(delegate).evict("key");

        assertThatCode(() -> cache.evict("key")).doesNotThrowAnyException();
        assertThat(registry.counter("cache.redis.failures",
                "cache", "publicPosts", "operation", "evict").count()).isEqualTo(1);
    }

    @Test
    void managerWrapsEveryCacheAndReusesWrapper() {
        CacheManager delegateManager = mock(CacheManager.class);
        Cache redisCache = mock(Cache.class);
        when(delegateManager.getCache("postDetail")).thenReturn(redisCache);
        when(delegateManager.getCacheNames()).thenReturn(List.of("postDetail"));

        ResilientCacheManager manager = new ResilientCacheManager(delegateManager, registry);

        Cache first = manager.getCache("postDetail");
        Cache second = manager.getCache("postDetail");

        assertThat(first).isInstanceOf(ResilientCache.class);
        assertThat(second).isSameAs(first);
        assertThat(manager.getCacheNames()).containsExactly("postDetail");
    }
}


