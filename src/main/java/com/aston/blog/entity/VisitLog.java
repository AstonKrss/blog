package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "visit_logs")
public class VisitLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "referer", length = 500)
    private String referer;

    @Column(length = 255)
    private String path;

    @Column(length = 50)
    private String country;

    @Column(length = 50)
    private String province;

    @Column(length = 50)
    private String city;

    @Column(length = 50)
    private String isp;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}