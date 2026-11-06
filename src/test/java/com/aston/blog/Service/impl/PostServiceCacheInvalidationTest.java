package com.aston.blog.Service.impl;

import com.aston.blog.dto.CreatePostDTO;
import com.aston.blog.dto.UpdatePostDto;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class PostServiceCacheInvalidationTest {

    @Test
    void statsCacheUsesTheKeyInvalidatedByTheViewCountFlush() throws Exception {
        Cacheable cacheable = PostServiceImpl.class.getMethod("getStats").getAnnotation(Cacheable.class);

        assertThat(cacheable.key()).isEqualTo("'summary'");
    }

    @Test
    void postMutationsNoLongerUseBroadAllEntriesEviction() throws Exception {
        assertNoBroadEviction("createPost", CreatePostDTO.class, String.class);
        assertNoBroadEviction("updatePost", String.class, UpdatePostDto.class, String.class);
        assertNoBroadEviction("deletePost", String.class, String.class, String.class);
    }

    private void assertNoBroadEviction(String methodName, Class<?>... parameterTypes) throws Exception {
        Method method = PostServiceImpl.class.getMethod(methodName, parameterTypes);

        assertThat(method.getAnnotation(Caching.class)).isNull();
        assertThat(method.getAnnotation(CacheEvict.class)).isNull();
    }
}
