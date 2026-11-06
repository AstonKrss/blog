package com.aston.blog.config;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.interceptor.SimpleKey;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 文章写入后的缓存失效。
 *
 * 精确删除文章详情、标签、归档、统计；列表和搜索通过版本号逻辑失效，
 * 避免每次写入都 clear 整个缓存。
 */
@Component
public class CacheInvalidationService {

    private final CacheManager cacheManager;
    private final CacheVersionService versionService;

    public CacheInvalidationService(CacheManager cacheManager, CacheVersionService versionService) {
        this.cacheManager = cacheManager;
        this.versionService = versionService;
    }

    public void postChanged(String oldSlug, String newSlug) {
        afterCommit(() -> {
            versionService.increment("publicPosts", "search");
            evict("archive", SimpleKey.EMPTY);
            evict("stats", "summary");
            evict("tags", SimpleKey.EMPTY);
            if (oldSlug != null) {
                evict("postDetail", oldSlug);
            }
            if (newSlug != null) {
                evict("postDetail", newSlug);
            }
        });
    }

    public void postCreated(String slug) {
        postChanged(null, slug);
    }

    public void postDeleted(String slug) {
        postChanged(slug, null);
    }

    private void evict(String cacheName, Object key) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.evict(key);
        }
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
