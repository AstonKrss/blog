package com.aston.blog.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aston.blog.entity.PostLike;

public interface PostLikeRepository extends JpaRepository<PostLike, String> {
    PostLike findByPostIdAndUserId(String postId, String userId);

    long countByPostId(String postId);

    boolean existsByPostIdAndUserId(String postId, String userId);

    void deleteByPostIdAndUserId(String postId, String userId);

}
