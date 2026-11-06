package com.aston.blog.Service.impl;

import com.aston.blog.repository.CommentRepository;
import com.aston.blog.repository.PostRepository;
import com.aston.blog.repository.TagRepository;
import com.aston.blog.repository.UserRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceImplViewCountTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private SimpleMeterRegistry registry;
    private PostServiceImpl service;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        service = new PostServiceImpl(postRepository, tagRepository, commentRepository,
                userRepository, redisTemplate, registry);
    }

    @Test
    void redisFailureDoesNotFailArticleDetailAndRecordsMetric() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("post:view:delta:post-1"))
                .thenThrow(new RuntimeException("redis down"));

        assertThatCode(() -> service.incrementViewInRedis("post-1"))
                .doesNotThrowAnyException();
        assertThat(registry.counter("post.view.redis.failures").count()).isEqualTo(1);
    }

    @Test
    void redisSuccessStillIncrementsViewDelta() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("post:view:delta:post-1")).thenReturn(1L);

        service.incrementViewInRedis("post-1");

        verify(valueOperations).increment("post:view:delta:post-1");
        assertThat(registry.counter("post.view.redis.failures").count()).isZero();
    }
}
