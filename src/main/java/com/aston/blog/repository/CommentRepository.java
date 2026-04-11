package com.aston.blog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.aston.blog.entity.Comment;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, String> {
    List<Comment> findByPostId(String postId);
}
