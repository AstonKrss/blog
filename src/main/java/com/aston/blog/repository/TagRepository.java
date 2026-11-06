package com.aston.blog.repository;

import com.aston.blog.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, String> {

    Optional<Tag> findByName(String name);

    Optional<Tag> findBySlug(String slug);

    boolean existsByName(String name);

    boolean existsBySlug(String slug);

    @Query(value = "SELECT tag_id, COUNT(*) FROM post_tags GROUP BY tag_id", nativeQuery = true)
    List<Object[]> countPostsGroupByTag();
}