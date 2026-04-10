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

@RestController
@RequestMapping("/api/public")
public class PublicController {
    private final PostService postService;
    private final TagService tagService;
    private final ArchiveService archiveService;

    public PublicController(PostService postService, TagService tagService, ArchiveService archiveService) {
        this.postService = postService;
        this.tagService = tagService;
        this.archiveService = archiveService;
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
    public Result<StatsVO> getStats() { return Result.success(postService.getStats()); }

    @GetMapping("/tags")
    public Result<List<TagVO>> getTags() { return Result.success(tagService.getAllTags()); }

    @GetMapping("/archive")
    public Result<List<ArchiveYearVO>> getArchive() { return Result.success(archiveService.getArchive()); }
}