package com.aston.blog.Service.impl;

import com.aston.blog.repository.PostLikeRepository;
import com.aston.blog.repository.PostRepository;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PostLikeServiceImplTest {

    @Test
    void toggleLikeMustRunInsideTransaction() throws NoSuchMethodException {
        Method method = PostLikeServiceImpl.class.getMethod("toggleLike", String.class, String.class);

        assertThat(method.isAnnotationPresent(Transactional.class)).isTrue();
    }

    @Test
    void serviceCanBeConstructedWithRepositories() {
        PostLikeRepository repository = mock(PostLikeRepository.class);
        PostRepository postRepository = mock(PostRepository.class);

        assertThat(new PostLikeServiceImpl(repository, postRepository)).isNotNull();
    }

    @Test
    void insertingLikeIncrementsPostCountAtomically() {
        PostLikeRepository repository = mock(PostLikeRepository.class);
        PostRepository postRepository = mock(PostRepository.class);
        when(repository.insertIgnore(anyString(), eq("post-1"), eq("user-1"))).thenReturn(1);
        when(postRepository.findLikeCountById("post-1")).thenReturn(1);

        Map<String, Object> result = new PostLikeServiceImpl(repository, postRepository)
                .toggleLike("post-1", "user-1");

        assertThat(result.get("liked")).isEqualTo(true);
        assertThat(result.get("count")).isEqualTo(1L);
        verify(postRepository).incrementLikeCount("post-1");
    }

    @Test
    void deletingExistingLikeDecrementsPostCountAtomically() {
        PostLikeRepository repository = mock(PostLikeRepository.class);
        PostRepository postRepository = mock(PostRepository.class);
        when(repository.insertIgnore(anyString(), eq("post-1"), eq("user-1"))).thenReturn(0);
        when(repository.deleteByPostIdAndUserId(eq("post-1"), eq("user-1"))).thenReturn(1);
        when(postRepository.findLikeCountById("post-1")).thenReturn(0);

        Map<String, Object> result = new PostLikeServiceImpl(repository, postRepository)
                .toggleLike("post-1", "user-1");

        assertThat(result.get("liked")).isEqualTo(false);
        assertThat(result.get("count")).isEqualTo(0L);
        verify(postRepository).decrementLikeCount("post-1");
    }
}

