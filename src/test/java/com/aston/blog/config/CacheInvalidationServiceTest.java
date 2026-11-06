package com.aston.blog.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.interceptor.SimpleKey;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CacheInvalidationServiceTest {

    @Mock
    private CacheManager cacheManager;
    @Mock
    private CacheVersionService versionService;
    @Mock
    private Cache cache;

    @Test
    void postChangedEvictsExactEntriesAndBumpsListSearchVersions() {
        when(cacheManager.getCache("archive")).thenReturn(cache);
        when(cacheManager.getCache("stats")).thenReturn(cache);
        when(cacheManager.getCache("tags")).thenReturn(cache);
        when(cacheManager.getCache("postDetail")).thenReturn(cache);
        CacheInvalidationService service = new CacheInvalidationService(cacheManager, versionService);

        service.postChanged("old-slug", "new-slug");

        verify(versionService).increment("publicPosts", "search");
        verify(cache, times(2)).evict(SimpleKey.EMPTY);
        verify(cache).evict("summary");
        verify(cache).evict("old-slug");
        verify(cache).evict("new-slug");
    }
}

