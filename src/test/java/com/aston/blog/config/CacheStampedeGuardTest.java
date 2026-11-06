package com.aston.blog.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CacheStampedeGuardTest {

    @Mock
    private RedisDistributedLock distributedLock;

    @Test
    void loadsUnderLockAndReleasesLock() throws Exception {
        when(distributedLock.tryLock(anyString(), any(Duration.class))).thenReturn("token");
        CacheStampedeGuard guard = new CacheStampedeGuard(distributedLock);

        String value = guard.load("postDetail", "hot-post", () -> "db-value");

        assertThat(value).isEqualTo("db-value");
        verify(distributedLock).unlock(eq("cache-load:postDetail:hot-post"), eq("token"));
    }

    @Test
    void loadsEvenWhenRedisLockIsUnavailable() throws Exception {
        when(distributedLock.tryLock(anyString(), any(Duration.class))).thenReturn(null);
        CacheStampedeGuard guard = new CacheStampedeGuard(distributedLock);

        String value = guard.load("postDetail", "hot-post", () -> "db-value");

        assertThat(value).isEqualTo("db-value");
    }
}
