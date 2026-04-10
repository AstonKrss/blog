package com.aston.blog.repository;

import com.aston.blog.entity.Post;
import com.aston.blog.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, String> {

    Page<Post> findByStatus(String status, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN p.tags t WHERE p.status = :status AND t.slug = :tag")
    Page<Post> findByStatusAndTags(@Param("status") String status, @Param("tag") String tag, Pageable pageable);

    Page<Post> findByAuthorIdAndStatus(String authorId, String status, Pageable pageable);

    Page<Post> findByAuthorId(String authorId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.author.username = :username")
    Page<Post> findByAuthorUsername(@Param("username") String username, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.author.username = :username AND p.status = :status")
    Page<Post> findByAuthorUsernameAndStatus(@Param("username") String username, @Param("status") String status, Pageable pageable);

    Optional<Post> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT p FROM Post p WHERE p.status = 'PUBLISHED' ORDER BY p.publishedAt DESC")
    Page<Post> findLatestPublished(Pageable pageable);

    long countByStatus(String status);
}
