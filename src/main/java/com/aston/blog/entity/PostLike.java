package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "post_likes")
public class PostLike {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(name = "post_id", nullable = false)
    private String postId;
    @Column(name = "user_id")
    private String userId;
    @Column(name = "session_id")
    private String sessionId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
