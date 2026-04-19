package com.aston.blog.Service.impl;

import com.aston.blog.Service.PostService;
import com.aston.blog.dto.CreatePostDTO;
import com.aston.blog.dto.UpdatePostDto;
import com.aston.blog.entity.Post;
import com.aston.blog.entity.Tag;
import com.aston.blog.repository.CommentRepository;
import com.aston.blog.repository.PostRepository;
import com.aston.blog.repository.TagRepository;
import com.aston.blog.vo.archive.ArchiveMonthVO;
import com.aston.blog.vo.archive.ArchiveYearVO;
import com.aston.blog.vo.comment.PaginationVO;
import com.aston.blog.vo.post.PostDetailVO;
import com.aston.blog.vo.post.PostListVO;
import com.aston.blog.vo.post.PostSummaryVO;
import com.aston.blog.vo.stats.StatsVO;
import com.aston.blog.vo.tag.TagVO;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import com.aston.blog.vo.post.SearchResultVO;

@Service
public class PostServiceImpl implements PostService {

    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final CommentRepository commentRepository;

    public PostServiceImpl(PostRepository postRepository, TagRepository tagRepository,
            CommentRepository commentRepository) {
        this.postRepository = postRepository;
        this.tagRepository = tagRepository;
        this.commentRepository = commentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PostListVO getPublicPosts(int page, int limit, String tag) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<Post> postPage;
        if (tag != null && !tag.isEmpty()) {
            postPage = postRepository.findByStatusAndTags("PUBLISHED", tag, pageable);
        } else {
            postPage = postRepository.findPublishedWithAuthorAndTags(pageable);
        }

        List<PostSummaryVO> posts = postPage.getContent().stream()
                .map(this::convertToPostSummaryVO)
                .collect(Collectors.toList());

        PaginationVO pagination = new PaginationVO();
        pagination.setPage(page);
        pagination.setLimit(limit);
        pagination.setTotal(postPage.getTotalElements());
        pagination.setTotalPages(postPage.getTotalPages());

        PostListVO result = new PostListVO();
        result.setPosts(posts);
        result.setPagination(pagination);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public PostListVO getMyPosts(String authorId, int page, int limit, String status) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<Post> postPage;

        if (status != null && !status.isEmpty()) {
            postPage = postRepository.findByAuthorIdAndStatusQuery(authorId, status, pageable);
        } else {
            postPage = postRepository.findByAuthorIdQuery(authorId, pageable);
        }

        List<PostSummaryVO> posts = postPage.getContent().stream()
                .map(this::convertToPostSummaryVO)
                .collect(Collectors.toList());

        PaginationVO pagination = new PaginationVO();
        pagination.setPage(page);
        pagination.setLimit(limit);
        pagination.setTotal(postPage.getTotalElements());
        pagination.setTotalPages(postPage.getTotalPages());

        PostListVO result = new PostListVO();
        result.setPosts(posts);
        result.setPagination(pagination);
        return result;
    }

    @Override
    @Transactional
    public PostDetailVO createPost(CreatePostDTO dto, String authorId) {
        if (postRepository.existsBySlug(dto.getSlug())) {
            throw new RuntimeException("Slug已存在: " + dto.getSlug());
        }

        Post post = new Post();
        post.setTitle(dto.getTitle());
        post.setSlug(dto.getSlug());
        post.setContent(dto.getContent());
        post.setExcerpt(dto.getExcerpt());
        post.setCoverImage(dto.getCoverImage());
        post.setAuthorId(authorId);
        post.setStatus(dto.getStatus() != null ? dto.getStatus() : "DRAFT");
        post.setViewCount(0);
        post.setLikeCount(0);
        post.setCommentCount(0);

        if ("PUBLISHED".equals(post.getStatus())) {
            post.setPublishedAt(LocalDateTime.now());
        }

        if (dto.getTags() != null && !dto.getTags().isEmpty()) {
            Set<Tag> tags = new HashSet<>();
            for (String tagName : dto.getTags()) {
                Tag tag = tagRepository.findByName(tagName).orElseGet(() -> {
                    Tag newTag = new Tag();
                    newTag.setName(tagName);
                    newTag.setSlug(tagName.toLowerCase().replaceAll("\\s+", "-"));
                    return tagRepository.save(newTag);
                });
                tags.add(tag);
            }
            post.setTags(tags);
        }

        post = postRepository.save(post);
        return convertToPostDetailVO(post);
    }

    @Override
    public PostDetailVO getPostById(String id) {
        Post post = postRepository.findByIdWithTags(id).orElse(null);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }
        return convertToPostDetailVO(post);
    }

    @Override
    @Transactional
    public PostDetailVO getPostBySlug(String slug) {
        return postRepository.findBySlugFull(slug).map(post -> {
            // 增加浏览量
            post.setViewCount(post.getViewCount() + 1);
            postRepository.save(post);
            return convertToPostDetailVO(post);
        }).orElse(null);
    }

    @Override
    @Transactional
    public PostDetailVO updatePost(String id, UpdatePostDto dto, String userId) {
        Post post = postRepository.findByIdWithTags(id).orElse(null);
        if (post == null) throw new RuntimeException("文章不存在");
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("无权限操作");
        }

        if (!post.getSlug().equals(dto.getSlug()) && postRepository.existsBySlug(dto.getSlug())) {
            throw new RuntimeException("Slug已存在: " + dto.getSlug());
        }

        post.setTitle(dto.getTitle());
        post.setSlug(dto.getSlug());
        post.setContent(dto.getContent());
        post.setExcerpt(dto.getExcerpt());
        post.setCoverImage(dto.getCoverImage());
        post.setStatus(dto.getStatus());

        if ("PUBLISHED".equals(dto.getStatus()) && post.getPublishedAt() == null) {
            post.setPublishedAt(LocalDateTime.now());
        }

        if (dto.getTags() != null) {
            Set<Tag> tags = new HashSet<>();
            for (String tagName : dto.getTags()) {
                Tag tag = tagRepository.findByName(tagName).orElseGet(() -> {
                    Tag newTag = new Tag();
                    newTag.setName(tagName);
                    newTag.setSlug(tagName.toLowerCase().replaceAll("\\s+", "-"));
                    return tagRepository.save(newTag);
                });
                tags.add(tag);
            }
            post.setTags(tags);
        }

        post = postRepository.save(post);
        return convertToPostDetailVO(post);
    }

    @Override
    @Transactional
    public void deletePost(String id, String userId) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) throw new RuntimeException("文章不存在");
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("无权限操作");
        }
        postRepository.deleteById(id);
    }

    @Override
    public List<ArchiveYearVO> getArchive() {
        List<Post> posts = postRepository.findAll().stream()
                .filter(p -> "PUBLISHED".equals(p.getStatus()) && p.getPublishedAt() != null)
                .collect(Collectors.toList());

        Map<Integer, Map<Integer, List<Post>>> grouped = new TreeMap<>();
        for (Post post : posts) {
            int year = post.getPublishedAt().getYear();
            int month = post.getPublishedAt().getMonthValue();
            grouped.computeIfAbsent(year, k -> new TreeMap<>())
                    .computeIfAbsent(month, k -> new ArrayList<>())
                    .add(post);
        }

        List<ArchiveYearVO> result = new ArrayList<>();
        for (Map.Entry<Integer, Map<Integer, List<Post>>> yearEntry : grouped.entrySet()) {
            ArchiveYearVO yearVO = new ArchiveYearVO();
            yearVO.setYear(yearEntry.getKey());

            List<ArchiveMonthVO> months = new ArrayList<>();
            for (Map.Entry<Integer, List<Post>> monthEntry : yearEntry.getValue().entrySet()) {
                ArchiveMonthVO monthVO = new ArchiveMonthVO();
                monthVO.setMonth(monthEntry.getKey());
                monthVO.setCount(monthEntry.getValue().size());

                List<PostSummaryVO> postVOs = monthEntry.getValue().stream()
                        .map(this::convertToPostSummaryVO)
                        .collect(Collectors.toList());
                monthVO.setPosts(postVOs);
                months.add(monthVO);
            }
            yearVO.setMonths(months);
            result.add(yearVO);
        }
        return result;
    }

    @Override
    public StatsVO getStats() {
        StatsVO stats = new StatsVO();
        stats.setTotalPosts(postRepository.countByStatus("PUBLISHED"));
        stats.setTotalTags((long) tagRepository.count());
        stats.setTotalComments(commentRepository.count());

        Long totalViews = postRepository.sumViewCount();
        stats.setTotalViews(totalViews != null ? totalViews : 0L);
        return stats;
    }

    private PostSummaryVO convertToPostSummaryVO(Post post) {
        PostSummaryVO vo = new PostSummaryVO();
        vo.setId(post.getId());
        vo.setSlug(post.getSlug());
        vo.setTitle(post.getTitle());
        vo.setExcerpt(post.getExcerpt());
        vo.setCoverImage(post.getCoverImage());
        vo.setPublishedAt(post.getPublishedAt() != null ? post.getPublishedAt().toString() : null);
        vo.setViewCount(Long.valueOf(post.getViewCount()));
        vo.setCommentCount(Long.valueOf(post.getCommentCount()));

        if (post.getTags() != null) {
            List<TagVO> tagVOs = post.getTags().stream()
                    .map(this::convertToTagVO)
                    .collect(Collectors.toList());
            vo.setTags(tagVOs);
        }

        if (post.getAuthor() != null) {
            com.aston.blog.vo.auth.UserVO authorVO = new com.aston.blog.vo.auth.UserVO();
            authorVO.setId(post.getAuthor().getId());
            authorVO.setUsername(post.getAuthor().getUsername());
            authorVO.setDisplayName(post.getAuthor().getDisplayName());
            authorVO.setAvatarUrl(post.getAuthor().getAvatarUrl());
            vo.setAuthor(authorVO);
        }

        return vo;
    }

    private PostDetailVO convertToPostDetailVO(Post post) {
        PostDetailVO vo = new PostDetailVO();
        vo.setId(post.getId());
        vo.setSlug(post.getSlug());
        vo.setTitle(post.getTitle());
        vo.setExcerpt(post.getExcerpt());
        vo.setContent(post.getContent());
        vo.setCoverImage(post.getCoverImage());
        vo.setStatus(post.getStatus());
        vo.setPublishedAt(post.getPublishedAt() != null ? post.getPublishedAt().toString() : null);
        vo.setViewCount(Long.valueOf(post.getViewCount()));
        vo.setCommentCount(Long.valueOf(post.getCommentCount()));

        if (post.getTags() != null) {
            List<TagVO> tagVOs = post.getTags().stream()
                    .map(this::convertToTagVO)
                    .collect(Collectors.toList());
            vo.setTags(tagVOs);
        }

        return vo;
    }

    private TagVO convertToTagVO(Tag tag) {
        TagVO tagVO = new TagVO();
        tagVO.setId(tag.getId());
        tagVO.setName(tag.getName());
        tagVO.setSlug(tag.getSlug());
        tagVO.setDescription(tag.getDescription());
        return tagVO;
    }

    @Override
    @Transactional
    public void incrementViewCount(String postId) {
        Post post = postRepository.findById(postId).orElse(null);
        if (post != null) {
            post.setViewCount(post.getViewCount() + 1);
            postRepository.save(post);
        }
    }

    @Override
    public SearchResultVO search(String query, int page, int limit) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<Post> postPage = postRepository.search("PUBLISHED", query, pageable);
        List<PostSummaryVO> posts = postPage.getContent().stream()
                .map(this::convertToPostSummaryVO)
                .collect(Collectors.toList());

        SearchResultVO result = new SearchResultVO();
        result.setPosts(posts);
        result.setTotal(postPage.getTotalElements());
        return result;
    }

}