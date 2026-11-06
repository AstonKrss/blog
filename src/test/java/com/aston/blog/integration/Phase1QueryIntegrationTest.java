package com.aston.blog.integration;

import com.aston.blog.Service.impl.PostLikeServiceImpl;
import com.aston.blog.entity.Post;
import com.aston.blog.repository.PostLikeRepository;
import com.aston.blog.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 阶段 1 真实 MySQL 集成测试。
 *
 * 使用 Testcontainers 启动干净的 MySQL，验证：
 * 1. 文章两段式分页的 ID 查询和批量关联加载；
 * 2. 标签筛选；
 * 3. MySQL FULLTEXT 搜索；
 * 4. 点赞事务的真实数据库行为。
 *
 * 没有 Docker 的机器会自动跳过，不会让普通单元测试失败。
 */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "spring.flyway.baseline-on-migrate=false",
        "blog.cache.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(PostLikeServiceImpl.class)
class Phase1QueryIntegrationTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0.36")
            .withDatabaseName("blog_phase1_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void mysqlProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
    }

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PostLikeRepository postLikeRepository;

    @Autowired
    private PostLikeServiceImpl postLikeService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void seed() {
        jdbcTemplate.update("DELETE FROM post_likes");
        jdbcTemplate.update("DELETE FROM post_tags");
        jdbcTemplate.update("DELETE FROM posts");
        jdbcTemplate.update("DELETE FROM tags");
        jdbcTemplate.update("DELETE FROM users");

        jdbcTemplate.update("""
                INSERT INTO users (id, username, email, password_hash, display_name, role)
                VALUES ('user-1', 'author', 'author@example.com', 'x', '作者', 'AUTHOR')
                """);

        insertPost("post-1", "java-guide", "Java 性能优化", "Java 性能优化实践", "PUBLISHED", 1);
        insertPost("post-2", "redis-guide", "Redis 缓存", "Redis 性能优化实践", "PUBLISHED", 2);
        insertPost("post-3", "mysql-guide", "MySQL 索引", "MySQL 索引与查询优化", "PUBLISHED", 3);
        insertPost("post-4", "draft-guide", "草稿", "草稿内容", "DRAFT", 4);

        jdbcTemplate.update("""
                INSERT INTO tags (id, name, slug, description)
                VALUES ('tag-java', 'Java', 'java', 'Java 标签'),
                       ('tag-redis', 'Redis', 'redis', 'Redis 标签')
                """);
        jdbcTemplate.update("INSERT INTO post_tags (post_id, tag_id) VALUES ('post-1', 'tag-java'), ('post-2', 'tag-redis')");
    }

    @Test
    void articlePaginationUsesIdPageThenBatchLoadsAuthorAndTags() {
        Page<String> idPage = postRepository.findPublishedIds(PageRequest.of(0, 2));

        assertThat(idPage.getTotalElements()).isEqualTo(3);
        assertThat(idPage.getContent()).containsExactly("post-3", "post-2");

        List<Post> posts = postRepository.findByIdInWithAuthorAndTags(idPage.getContent());

        assertThat(posts).hasSize(2);
        assertThat(posts).allSatisfy(post -> {
            assertThat(post.getAuthor()).isNotNull();
            assertThat(post.getAuthor().getDisplayName()).isEqualTo("作者");
        });
        assertThat(posts.stream().filter(p -> p.getId().equals("post-1")).findFirst().orElseThrow().getTags())
                .extracting(tag -> tag.getSlug())
                .contains("java");
    }

    @Test
    void tagFilterReturnsOnlyPublishedPostsWithTag() {
        Page<String> page = postRepository.findPublishedIdsByTag("java", PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).containsExactly("post-1");
    }

    @Test
    void fulltextSearchFindsChineseContentAndCountsIt() {
        List<String> ids = postRepository.searchIds("性能优化", 10, 0);
        long count = postRepository.searchCount("性能优化");

        assertThat(ids).contains("post-1", "post-2");
        assertThat(count).isGreaterThanOrEqualTo(2);
    }

    @Test
    void likeToggleRunsAgainstRealDatabaseAndDoesNotDuplicate() {
        Map<String, Object> first = postLikeService.toggleLike("post-1", "user-1");
        assertThat(first.get("liked")).isEqualTo(true);
        assertThat(first.get("count")).isEqualTo(1L);

        Map<String, Object> second = postLikeService.toggleLike("post-1", "user-1");
        assertThat(second.get("liked")).isEqualTo(false);
        assertThat(second.get("count")).isEqualTo(0L);

        assertThat(postLikeRepository.countByPostId("post-1")).isZero();
    }

    private void insertPost(String id, String slug, String title, String content,
                            String status, int minutesAgo) {
        jdbcTemplate.update("""
                INSERT INTO posts
                    (id, slug, title, content, author_id, status, published_at, view_count, like_count, comment_count)
                VALUES (?, ?, ?, ?, 'user-1', ?, ?, 0, 0, 0)
                """, id, slug, title, content, status,
                LocalDateTime.of(2026, 1, 1, 0, 0).minusMinutes(minutesAgo));
    }
}
