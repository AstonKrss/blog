package com.aston.blog.Controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;

import com.aston.blog.Service.PostService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.CreatePostDTO;
import com.aston.blog.dto.UpdatePostDto;
import com.aston.blog.vo.post.PostDetailVO;
import com.aston.blog.vo.post.PostListVO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @PostMapping
    public Result<PostDetailVO> createPost(@Valid @RequestBody CreatePostDTO dto, HttpServletRequest request) {
        String authorId = getUserIdFromRequest(request);
        if (authorId == null)
            return Result.error(401, "未登录");
        return Result.success(postService.createPost(dto, authorId));
    }

    @GetMapping
    public Result<PostListVO> getMyPosts(@RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit, @RequestParam(required = false) String status,
            HttpServletRequest request) {
        String authorId = getUserIdFromRequest(request);
        if (authorId == null)
            return Result.error(401, "未登录");
        return Result.success(postService.getMyPosts(authorId, page, limit, status));
    }

    @GetMapping("/{id}")
    public Result<PostDetailVO> getPost(@PathVariable String id) {
        PostDetailVO post = postService.getPostById(id);
        Map<String, Object> data = new HashMap<>();
        data.put("post", post);
        return Result.success(post);
    }

    @PutMapping("/{id}")
    public Result<PostDetailVO> updatePost(@PathVariable String id, @Valid @RequestBody UpdatePostDto dto) {
        return Result.success(postService.updatePost(id, dto));
    }

    @DeleteMapping("/{id}")
    public Result<?> deletePost(@PathVariable String id) {
        postService.deletePost(id);
        return Result.success(null);
    }

    private String getUserIdFromRequest(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() != null) {
                Object principal = auth.getPrincipal();
                if (principal instanceof String) {
                    return (String) principal;
                }
            }
        } catch (Exception e) {
        }
        return null;
    }
}