package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_attempts")
@Data

public class LoginAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String ip; // 尝试登录的 IP
    private String username; // 尝试的用户名
    private boolean success; // 是否成功
    private String userAgent; // 浏览器标识
    private LocalDateTime createdAt; // 尝试时间

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}