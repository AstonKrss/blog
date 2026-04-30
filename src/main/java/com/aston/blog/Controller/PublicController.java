package com.aston.blog.Controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import com.aston.blog.Service.PostService;
import com.aston.blog.Service.TagService;
import com.aston.blog.Service.ArchiveService;
import com.aston.blog.common.Result;
import com.aston.blog.vo.post.PostDetailVO;
import com.aston.blog.vo.post.PostListVO;
import com.aston.blog.vo.stats.StatsVO;
import com.aston.blog.vo.tag.TagVO;
import com.aston.blog.vo.archive.ArchiveYearVO;

import java.util.List;

import com.aston.blog.vo.comment.CommentVO;
import com.aston.blog.Service.CommentService;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.aston.blog.dto.CreateCommentDTO;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

import com.aston.blog.vo.post.SearchResultVO;

@RestController
@RequestMapping("/api/public")
public class PublicController {
    private final PostService postService;
    private final TagService tagService;
    private final ArchiveService archiveService;
    private final CommentService commentService;

    public PublicController(PostService postService, TagService tagService, ArchiveService archiveService,
            CommentService commentService) {
        this.postService = postService;
        this.tagService = tagService;
        this.archiveService = archiveService;
        this.commentService = commentService;
    }

    @GetMapping("/posts")
    public Result<PostListVO> getPosts(@RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit, @RequestParam(required = false) String tag) {
        return Result.success(postService.getPublicPosts(page, limit, tag));
    }

    @GetMapping("/posts/{slug}")
    public Result<PostDetailVO> getPostBySlug(@PathVariable String slug) {
        PostDetailVO post = postService.getPostBySlug(slug);
        return post == null ? Result.error(404, "文章未找到") : Result.success(post);
    }

    @GetMapping("/stats")
    public Result<StatsVO> getStats() {
        return Result.success(postService.getStats());
    }

    @GetMapping("/posts/{slug}/toc")
    public Result<List<Map<String, Object>>> getPostToc(@PathVariable String slug) {
        PostDetailVO post = postService.getPostBySlug(slug);
        if (post == null) {
            return Result.error(404, "文章未找到");
        }
        List<Map<String, Object>> toc = postService.extractToc(post.getContent());
        return Result.success(toc);
    }

    @GetMapping("/tags")
    public Result<List<TagVO>> getTags() {
        return Result.success(tagService.getAllTags());
    }

    @GetMapping("/archive")
    public Result<List<ArchiveYearVO>> getArchive() {
        return Result.success(archiveService.getArchive());
    }

    @GetMapping("/comments/{postId}")
    public Result<List<CommentVO>> getComments(@PathVariable String postId) {
        return Result.success(commentService.getComments(postId));
    }

    @PostMapping("/comments/{postId}")
    public Result<CommentVO> postComments(@PathVariable String postId,
            @RequestBody(required = false) Map<String, String> body, HttpServletRequest request) {
        String authorName = null;
        String authorEmail = null;
        String authorUrl = null;
        String content = null;

        // 如果有body，说明是匿名评论
        if (body != null) {
            authorName = body.get("authorName");
            authorEmail = body.get("authorEmail");
            authorUrl = body.get("authorUrl");
            content = body.get("content");
        }

        // 从 SecurityContext 获取登录用户 ID
        String userId = null;
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() != null) {
                Object principal = auth.getPrincipal();
                if (principal instanceof String) {
                    userId = (String) principal; // userId 存在 principal 中
                }
            }
        } catch (Exception e) {
        }

        CommentVO vo = commentService.createComment(postId, userId, authorName, authorEmail, authorUrl, content);
        return Result.success(vo);
    }

    @GetMapping("/search")
    public Result<SearchResultVO> search(@RequestParam String q, @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        SearchResultVO result = postService.search(q, page, limit);
        return Result.success(result);
    }

}