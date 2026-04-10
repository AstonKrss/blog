package com.aston.blog.Service;

import com.aston.blog.dto.CreatePostDTO;
import com.aston.blog.dto.UpdatePostDto;
import com.aston.blog.entity.Post;
import com.aston.blog.vo.archive.ArchiveYearVO;
import com.aston.blog.vo.post.PostDetailVO;
import com.aston.blog.vo.post.PostListVO;
import com.aston.blog.vo.stats.StatsVO;

import java.util.List;

public interface PostService {
    PostListVO getPublicPosts(int page, int limit, String tag);

    PostListVO getMyPosts(String authorId, int page, int limit, String status);

    PostDetailVO createPost(CreatePostDTO dto, String authorId);

    PostDetailVO getPostById(String id);

    PostDetailVO getPostBySlug(String slug);

    PostDetailVO updatePost(String id, UpdatePostDto dto);

    void deletePost(String id);

    List<ArchiveYearVO> getArchive();

    StatsVO getStats();

    void incrementViewCount(String postId);
}
