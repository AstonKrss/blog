package com.aston.blog.config;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.Callable;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 热点 Key 回源保护。
 *
 * 同一实例内按 key hash 使用固定数量的本地锁，避免每个查询都创建锁对象；
 * 跨实例时再尝试 Redis 分布式锁。Redis 故障时退化为本地锁，不阻断回源。
 */
@Component
public class CacheStampedeGuard {

    private static final int LOCK_COUNT = 256;
    private static final Duration REDIS_LOCK_TTL = Duration.ofSeconds(10);

    private final ReentrantLock[] localLocks;
    private final RedisDistributedLock distributedLock;

    public CacheStampedeGuard(RedisDistributedLock distributedLock) {
        this.distributedLock = distributedLock;
        this.localLocks = new ReentrantLock[LOCK_COUNT];
        for (int i = 0; i < LOCK_COUNT; i++) {
            localLocks[i] = new ReentrantLock();
        }
    }

    public <T> T load(String cacheName, Object key, Callable<T> loader) throws Exception {
        String lockKey = cacheName + ":" + String.valueOf(key);
        ReentrantLock localLock = localLocks[Math.floorMod(lockKey.hashCode(), LOCK_COUNT)];
        localLock.lock();
        String token = null;
        try {
            token = distributedLock.tryLock("cache-load:" + lockKey, REDIS_LOCK_TTL);
            return loader.call();
        } finally {
            if (token != null) {
                distributedLock.unlock("cache-load:" + lockKey, token);
            }
            localLock.unlock();
        }
    }
}
