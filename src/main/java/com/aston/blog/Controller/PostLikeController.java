package com.aston.blog.Controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.context.SecurityContextHolder;
import com.aston.blog.Service.PostLikeService;
import com.aston.blog.common.Result;

@RestController
@RequestMapping("/api/posts/{postId}/like")
public class PostLikeController {

    private final PostLikeService postLikeService;

    public PostLikeController(PostLikeService postLikeService) {
        this.postLikeService = postLikeService;
    }

    private String getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            return auth.getPrincipal().toString();
        }
        return null;
    }

    @GetMapping
    public Result<Map<String, Object>> getLikeStatus(@PathVariable String postId) {
        String userId = getCurrentUserId();
        Map<String, Object> data = new HashMap<>();
        try {
            data = postLikeService.getLikeStatus(postId, userId);
        } catch (Exception e) {
        }
        return Result.success(data);
    }

    @PostMapping
    public Result<Map<String, Object>> toggleLike(@PathVariable String postId) {
        String userId = getCurrentUserId();
        Map<String, Object> data = new HashMap<>();
        data = postLikeService.toggleLike(postId, userId);
        return Result.success(data);
    }
}
