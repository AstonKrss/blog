package com.aston.blog.repository;

import com.aston.blog.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostLikeRepository extends JpaRepository<PostLike, String> {

    PostLike findByPostIdAndUserId(String postId, String userId);

    long countByPostId(String postId);

    boolean existsByPostIdAndUserId(String postId, String userId);

    /**
     * 原子插入点赞；唯一键已存在时返回 0，不会产生重复记录。
     */
    @Modifying
    @Query(value = """
            INSERT IGNORE INTO post_likes (id, created_at, post_id, user_id)
            VALUES (:id, NOW(), :postId, :userId)
            """, nativeQuery = true)
    int insertIgnore(@Param("id") String id,
            @Param("postId") String postId,
            @Param("userId") String userId);

    /**
     * 返回实际删除行数；0 表示并发情况下已经被其他请求删除。
     */
    @Modifying
    @Query("DELETE FROM PostLike l WHERE l.postId = :postId AND l.userId = :userId")
    int deleteByPostIdAndUserId(@Param("postId") String postId,
            @Param("userId") String userId);
}
