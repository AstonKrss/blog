package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "attack_logs")
@Data
public class AttackLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String ip;
    private String path;
    private String method;
    private String payload;
    private String attackType;
    private String userAgent; // 浏览器标识
    private String queryParams; // URL 查询参数
    private Integer riskLevel;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}