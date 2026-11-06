package com.aston.blog.Service.impl;

import com.aston.blog.Service.PostLikeService;
import com.aston.blog.repository.PostLikeRepository;
import com.aston.blog.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class PostLikeServiceImpl implements PostLikeService {

    private final PostLikeRepository postLikeRepository;
    private final PostRepository postRepository;

    public PostLikeServiceImpl(PostLikeRepository postLikeRepository, PostRepository postRepository) {
        this.postLikeRepository = postLikeRepository;
        this.postRepository = postRepository;
    }

    @Override
    @Transactional
    public Map<String, Object> toggleLike(String postId, String userId) {
        if (userId == null) {
            return result(false, countFor(postId));
        }

        // INSERT IGNORE 是幂等的：只有真正插入成功才增加计数。
        int inserted = postLikeRepository.insertIgnore(UUID.randomUUID().toString(), postId, userId);
        boolean liked;
        if (inserted > 0) {
            postRepository.incrementLikeCount(postId);
            liked = true;
        } else {
            // 已点赞则取消；删除成功才减少计数，避免并发重复递减。
            int deleted = postLikeRepository.deleteByPostIdAndUserId(postId, userId);
            if (deleted > 0) {
                postRepository.decrementLikeCount(postId);
            }
            liked = false;
        }

        return result(liked, countFor(postId));
    }

    @Override
    public Map<String, Object> getLikeStatus(String postId, String userId) {
        boolean liked = userId != null && postLikeRepository.existsByPostIdAndUserId(postId, userId);
        return result(liked, countFor(postId));
    }

    private long countFor(String postId) {
        Integer count = postRepository.findLikeCountById(postId);
        return count != null ? count : postLikeRepository.countByPostId(postId);
    }

    private Map<String, Object> result(boolean liked, long count) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("liked", liked);
        result.put("count", count);
        return result;
    }
}
