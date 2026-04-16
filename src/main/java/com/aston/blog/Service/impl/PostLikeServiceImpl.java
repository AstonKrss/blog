package com.aston.blog.Service.impl;

import java.util.LinkedHashMap;
import java.util.Map;
import com.aston.blog.repository.PostLikeRepository;
import com.aston.blog.entity.PostLike;
import org.springframework.stereotype.Service;
import com.aston.blog.Service.PostLikeService;

@Service
public class PostLikeServiceImpl implements PostLikeService {

    private final PostLikeRepository postLikeRepository;

    public PostLikeServiceImpl(PostLikeRepository postLikeRepository) {
        this.postLikeRepository = postLikeRepository;
    }

    @Override
    public Map<String, Object> toggleLike(String postId, String userId) {
        if (userId == null) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("liked", false);
            result.put("count", postLikeRepository.countByPostId(postId));
            return result;
        }

        if (postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            postLikeRepository.deleteByPostIdAndUserId(postId, userId);
        } else {
            PostLike newLike = new PostLike();
            newLike.setPostId(postId);
            newLike.setUserId(userId);
            postLikeRepository.save(newLike);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("liked", postLikeRepository.existsByPostIdAndUserId(postId, userId));
        result.put("count", postLikeRepository.countByPostId(postId));
        return result;
    }

    @Override
    public Map<String, Object> getLikeStatus(String postId, String userId) {
        Map<String, Object> result = new LinkedHashMap<>();
        boolean liked = userId != null && postLikeRepository.existsByPostIdAndUserId(postId, userId);
        result.put("liked", liked);
        result.put("count", postLikeRepository.countByPostId(postId));
        return result;
    }

}
