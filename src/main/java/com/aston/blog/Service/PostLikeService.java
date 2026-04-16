package com.aston.blog.Service;

import java.util.Map;

public interface PostLikeService {
    Map<String, Object> getLikeStatus(String postId, String userId);

    Map<String, Object> toggleLike(String postId, String userId);
}
