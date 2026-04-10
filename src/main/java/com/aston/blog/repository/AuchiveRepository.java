package com.aston.blog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import com.aston.blog.entity.Post;

public interface AuchiveRepository extends JpaRepository<Post, String> {
    @Query("SELECT p FROM Post p WHERE p.status = 'PUBLISHED' AND p.publishedAt IS NOT NULL ORDER BY p.publishedAt DESC")
    List<Post> findAllPublished();
}
