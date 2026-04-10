package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Table(name = "users") // 指定表名为 users
@Entity
public class User {
    @Id // 主键
    @GeneratedValue(strategy = GenerationType.UUID) // 自动生成 UUID
    private String id;
    @Column(unique = true, nullable = false, length = 50)
    private String username;
    @Column(unique = true, nullable = false, length = 255)
    private String email;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "display_name", length = 100)
    private String displayName;
    @Column(name = "avatar_url")
    private String avatarUrl;
    @Column(columnDefinition = "TEXT")
    private String bio;
    @Column(length = 20)
    private String role; // ADMIN, AUTHOR, READER
    @CreationTimestamp // 插入时自动填充当前时间
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp // 更新时自动填充当前时间
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

}
