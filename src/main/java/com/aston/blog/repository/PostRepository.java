package com.aston.blog.repository;

import com.aston.blog.entity.Post;
import com.aston.blog.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, String> {

    @Query("SELECT p FROM Post p LEFT JOIN FETCH p.tags WHERE p.id = :id")
    Optional<Post> findByIdWithTags(@Param("id") String id);

    @Query("SELECT p FROM Post p LEFT JOIN FETCH p.author LEFT JOIN FETCH p.tags WHERE p.id = :id")
    Optional<Post> findByIdFull(@Param("id") String id);

    Page<Post> findByStatus(String status, Pageable pageable);

    /**
     * 标签筛选从 post_tags/tags 侧驱动，避免先扫描全部已发布文章再逐条判断标签。
     * nativeQuery + countQuery 保留 Spring Data 的分页能力。
     */
    @Query(value = """
            SELECT p.id
            FROM posts p
            JOIN post_tags pt ON pt.post_id = p.id
            JOIN tags t ON t.id = pt.tag_id
            WHERE p.status = 'PUBLISHED' AND t.slug = :tag
            ORDER BY p.published_at DESC
            """,
            countQuery = """
            SELECT COUNT(DISTINCT p.id)
            FROM posts p
            JOIN post_tags pt ON pt.post_id = p.id
            JOIN tags t ON t.id = pt.tag_id
            WHERE p.status = 'PUBLISHED' AND t.slug = :tag
            """,
            nativeQuery = true)
    Page<String> findPublishedIdsByTag(@Param("tag") String tag, Pageable pageable);

    @Query("SELECT p.id FROM Post p WHERE p.status = 'PUBLISHED' ORDER BY p.publishedAt DESC")
    Page<String> findPublishedIds(Pageable pageable);

    @Query("SELECT DISTINCT p FROM Post p LEFT JOIN FETCH p.author LEFT JOIN FETCH p.tags WHERE p.id IN :ids")
    List<Post> findByIdInWithAuthorAndTags(@Param("ids") Collection<String> ids);

    Page<Post> findByAuthorIdAndStatus(String authorId, String status, Pageable pageable);

    Page<Post> findByAuthorId(String authorId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.author.id = :authorId")
    Page<Post> findByAuthorIdQuery(@Param("authorId") String authorId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.author.id = :authorId AND p.status = :status")
    Page<Post> findByAuthorIdAndStatusQuery(@Param("authorId") String authorId, @Param("status") String status,
            Pageable pageable);

    @Query("SELECT p FROM Post p LEFT JOIN FETCH p.author LEFT JOIN FETCH p.tags WHERE p.status = 'PUBLISHED' AND p.slug = :slug")
    Optional<Post> findBySlugFull(@Param("slug") String slug);

    Optional<Post> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT p FROM Post p WHERE p.status = 'PUBLISHED' ORDER BY p.publishedAt DESC")
    Page<Post> findLatestPublished(Pageable pageable);

    @Query("SELECT p.slug FROM Post p WHERE p.status = 'PUBLISHED' ORDER BY p.viewCount DESC")
    List<String> findTopPublishedSlugs(Pageable pageable);

    long countByStatus(String status);

    @Query("SELECT COUNT(DISTINCT p) FROM Post p JOIN p.tags t WHERE p.status = 'PUBLISHED'")
    long countTaggedPublished();

    @Query("SELECT COALESCE(SUM(p.viewCount), 0) FROM Post p WHERE p.status = 'PUBLISHED'")
    Long sumViewCount();

    /**
     * FULLTEXT 与标签匹配拆成 UNION，避免 OR 让优化器放弃 FULLTEXT 索引。
     * 两个分支都只返回 id，最后统一按发布时间排序和分页。
     */
    @Query(value = """
            SELECT matched.id
            FROM (
                SELECT p.id, p.published_at
                FROM posts p
                WHERE p.status = 'PUBLISHED'
                  AND MATCH(p.title, p.content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
                UNION
                SELECT p.id, p.published_at
                FROM posts p
                WHERE p.status = 'PUBLISHED'
                  AND EXISTS (
                      SELECT 1
                      FROM post_tags pt
                      JOIN tags t ON t.id = pt.tag_id
                      WHERE pt.post_id = p.id
                        AND (t.name LIKE CONCAT('%', :keyword, '%')
                             OR t.slug LIKE CONCAT('%', :keyword, '%'))
                  )
            ) matched
            ORDER BY matched.published_at DESC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<String> searchIds(@Param("keyword") String keyword, @Param("limit") int limit, @Param("offset") long offset);

    @Query(value = """
            SELECT COUNT(*)
            FROM (
                SELECT p.id
                FROM posts p
                WHERE p.status = 'PUBLISHED'
                  AND MATCH(p.title, p.content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
                UNION
                SELECT p.id
                FROM posts p
                WHERE p.status = 'PUBLISHED'
                  AND EXISTS (
                      SELECT 1
                      FROM post_tags pt
                      JOIN tags t ON t.id = pt.tag_id
                      WHERE pt.post_id = p.id
                        AND (t.name LIKE CONCAT('%', :keyword, '%')
                             OR t.slug LIKE CONCAT('%', :keyword, '%'))
                  )
            ) matched
            """, nativeQuery = true)
    long searchCount(@Param("keyword") String keyword);

    @Query("SELECT p FROM Post p WHERE p.status = 'PUBLISHED' ORDER BY p.publishedAt DESC")
    List<Post> findAllPublished();

    @Query("SELECT p FROM Post p WHERE p.status = 'DRAFT' ORDER BY p.updatedAt DESC")
    List<Post> findAllDrafts();

    Optional<Post> findBySlugAndStatus(String slug, String status);

    /**
     * 原子累加浏览量(供定时任务从 Redis delta 刷回 MySQL 用)
     * 单条 UPDATE 不会与并发读 view_count 冲突(view_count 不是强一致)
     */
    @Modifying
    @Transactional
    @Query("UPDATE Post p SET p.viewCount = p.viewCount + :delta WHERE p.id = :id")
    int incrementViewCount(@Param("id") String id, @Param("delta") long delta);

    @Modifying
    @Transactional
    @Query("""
            UPDATE Post p
            SET p.likeCount = COALESCE(p.likeCount, 0) + 1
            WHERE p.id = :id
            """)
    int incrementLikeCount(@Param("id") String id);

    @Modifying
    @Transactional
    @Query("""
            UPDATE Post p
            SET p.likeCount = CASE
                WHEN COALESCE(p.likeCount, 0) > 0 THEN p.likeCount - 1
                ELSE 0
            END
            WHERE p.id = :id
            """)
    int decrementLikeCount(@Param("id") String id);

    @Query("SELECT COALESCE(p.likeCount, 0) FROM Post p WHERE p.id = :id")
    Integer findLikeCountById(@Param("id") String id);

    /**
     * 周期性校准：只更新和 post_likes 实际数量不一致的文章。
     */
    @Modifying
    @Transactional
    @Query(value = """
            UPDATE posts p
            LEFT JOIN (
                SELECT post_id, COUNT(*) AS actual_count
                FROM post_likes
                GROUP BY post_id
            ) stats ON stats.post_id = p.id
            SET p.like_count = COALESCE(stats.actual_count, 0)
            WHERE COALESCE(p.like_count, 0) <> COALESCE(stats.actual_count, 0)
            """, nativeQuery = true)
    int calibrateLikeCounts();
}


