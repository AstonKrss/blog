package com.aston.blog.Service.impl;

import com.aston.blog.Service.PostService;
import com.aston.blog.common.PaginationUtils;
import com.aston.blog.dto.CreatePostDTO;
import com.aston.blog.dto.UpdatePostDto;
import com.aston.blog.entity.Post;
import com.aston.blog.entity.Tag;
import com.aston.blog.repository.CommentRepository;
import com.aston.blog.repository.PostRepository;
import com.aston.blog.repository.TagRepository;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.archive.ArchiveMonthVO;
import com.aston.blog.vo.archive.ArchiveYearVO;
import com.aston.blog.vo.comment.PaginationVO;
import com.aston.blog.vo.post.PostDetailVO;
import com.aston.blog.vo.post.PostListVO;
import com.aston.blog.vo.post.PostSummaryVO;
import com.aston.blog.vo.stats.StatsVO;
import com.aston.blog.vo.tag.TagVO;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import com.aston.blog.vo.post.SearchResultVO;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PostServiceImpl implements PostService {

    private static final Logger log = LoggerFactory.getLogger(PostServiceImpl.class);

    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;

    public PostServiceImpl(PostRepository postRepository, TagRepository tagRepository,
            CommentRepository commentRepository, UserRepository userRepository,
            StringRedisTemplate redisTemplate, MeterRegistry meterRegistry) {
        this.postRepository = postRepository;
        this.tagRepository = tagRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    @Override
    @Cacheable(value = "publicPosts", key = "'p:' + #page + ':l:' + #limit + ':t:' + (#tag == null || #tag.isEmpty() ? 'all' : #tag)")
    @Transactional(readOnly = true)
    public PostListVO getPublicPosts(int page, int limit, String tag) {
        Pageable pageable = PaginationUtils.toPageable(page, limit);
        // 两段式分页：先查当前页 ID，再批量取作者和标签，避免 JOIN FETCH + Page 把全表拉进内存。
        Page<String> idPage = (tag != null && !tag.isEmpty())
                ? postRepository.findPublishedIdsByTag(tag, pageable)
                : postRepository.findPublishedIds(pageable);

        List<String> ids = idPage.getContent();
        List<Post> pagePosts = ids.isEmpty()
                ? List.of()
                : postRepository.findByIdInWithAuthorAndTags(ids);
        Map<String, Post> postById = pagePosts.stream()
                .collect(Collectors.toMap(Post::getId, post -> post));
        List<PostSummaryVO> posts = ids.stream()
                .map(postById::get)
                .filter(Objects::nonNull)
                .map(this::convertToPostSummaryVO)
                .collect(Collectors.toList());

        PaginationVO pagination = new PaginationVO();
        pagination.setPage(page);
        pagination.setLimit(limit);
        pagination.setTotal(idPage.getTotalElements());
        pagination.setTotalPages(idPage.getTotalPages());

        PostListVO result = new PostListVO();
        result.setPosts(posts);
        result.setPagination(pagination);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public PostListVO getMyPosts(String authorId, int page, int limit, String status) {
        Pageable pageable = PaginationUtils.toPageable(page, limit);
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
    @Caching(evict = {
            @CacheEvict(value = "search", allEntries = true),
            @CacheEvict(value = "publicPosts", allEntries = true),
            @CacheEvict(value = "postDetail", allEntries = true),
            @CacheEvict(value = "archive", allEntries = true),
            @CacheEvict(value = "stats", allEntries = true),
            @CacheEvict(value = "tags", allEntries = true)
    })
    public PostDetailVO createPost(CreatePostDTO dto, String authorId) {
        // 验证作者是否存在
        if (authorId == null || authorId.isEmpty()) {
            throw new RuntimeException("用户未登录，请重新登录");
        }

        // 验证 authorId 是否对应有效的用户
        if (!userRepository.existsById(authorId)) {
            throw new RuntimeException("用户不存在或登录已失效，请重新登录");
        }

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
    @Cacheable(value = "postDetail", key = "#slug")
    public PostDetailVO getPostBySlug(String slug) {
        return postRepository.findBySlugFull(slug)
                .map(this::convertToPostDetailVO)
                .orElse(null);
    }

    @Override
    public void incrementViewInRedis(String postId) {
        try {
            redisTemplate.opsForValue().increment("post:view:delta:" + postId);
        } catch (RuntimeException ex) {
            // 浏览量允许少计，Redis 故障不能影响文章详情返回。
            meterRegistry.counter("post.view.redis.failures").increment();
            log.warn("文章浏览量 Redis 增量失败，允许少计 postId={} reason={}", postId, ex.getMessage());
        }
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "search", allEntries = true),
            @CacheEvict(value = "publicPosts", allEntries = true),
            @CacheEvict(value = "postDetail", allEntries = true),
            @CacheEvict(value = "archive", allEntries = true),
            @CacheEvict(value = "stats", allEntries = true),
            @CacheEvict(value = "tags", allEntries = true)
    })
    public PostDetailVO updatePost(String id, UpdatePostDto dto, String userId) {
        Post post = postRepository.findByIdWithTags(id).orElse(null);
        if (post == null)
            throw new RuntimeException("文章不存在");
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
    @Caching(evict = {
            @CacheEvict(value = "search", allEntries = true),
            @CacheEvict(value = "publicPosts", allEntries = true),
            @CacheEvict(value = "postDetail", allEntries = true),
            @CacheEvict(value = "archive", allEntries = true),
            @CacheEvict(value = "stats", allEntries = true),
            @CacheEvict(value = "tags", allEntries = true)
    })
    public void deletePost(String id, String userId, String role) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null)
            throw new RuntimeException("文章不存在");

        // 管理员可以删除任何文章，非管理员只能删除自己的文章
        if (!"ADMIN".equals(role) && !post.getAuthorId().equals(userId)) {
            throw new RuntimeException("无权限操作");
        }
        postRepository.deleteById(id);
    }

    @Override
    @Cacheable(value = "archive")
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
    @Cacheable(value = "stats", key = "'summary'")
    public StatsVO getStats() {
        StatsVO stats = new StatsVO();
        stats.setTotalPosts(postRepository.countByStatus("PUBLISHED"));
        stats.setTotalTaggedPosts(postRepository.countTaggedPublished());
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
        vo.setContent(post.getContent());
        vo.setCreatedAt(post.getCreatedAt() != null ? post.getCreatedAt().toString() : null);
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
    @Cacheable(value = "search", key = "'q:' + #query + ':p:' + #page + ':l:' + #limit")
    public SearchResultVO search(String query, int page, int limit) {
        Pageable pageable = PaginationUtils.toPageable(page, limit);
        // FULLTEXT 先分页查 ID，再批量取关联，避免 LIKE 全表扫描和大结果集 OOM。
        List<String> ids = postRepository.searchIds(query, pageable.getPageSize(), pageable.getOffset());
        long total = postRepository.searchCount(query);
        List<Post> pagePosts = ids.isEmpty()
                ? List.of()
                : postRepository.findByIdInWithAuthorAndTags(ids);
        Map<String, Post> postById = pagePosts.stream()
                .collect(Collectors.toMap(Post::getId, post -> post));
        List<PostSummaryVO> posts = ids.stream()
                .map(postById::get)
                .filter(Objects::nonNull)
                .map(this::convertToPostSummaryVO)
                .collect(Collectors.toList());

        SearchResultVO result = new SearchResultVO();
        result.setPosts(posts);
        result.setTotal(total);
        return result;
    }

    @Override
    public List<Map<String, Object>> extractToc(String content) {
        List<Map<String, Object>> toc = new ArrayList<>();
        if (content == null || content.isEmpty())
            return toc;

        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("^(#{1,6})\\s+(.+)$",
                java.util.regex.Pattern.MULTILINE);
        java.util.regex.Matcher matcher = pattern.matcher(content);

        while (matcher.find()) {
            int level = matcher.group(1).length();
            String text = matcher.group(2).trim();
            String id = text.toLowerCase()
                    .replaceAll("[^\\w\\u4e00-\\u9fa5]+", "-")
                    .replaceAll("^-|-$", "");
            Map<String, Object> item = new HashMap<>();
            item.put("id", id);
            item.put("text", text);
            item.put("level", level);
            toc.add(item);
        }
        return toc;
    }

}


