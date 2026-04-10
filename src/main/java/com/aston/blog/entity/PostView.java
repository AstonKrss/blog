package com.aston.blog.entity;


import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "post_views")
public class PostView {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(name = "post_id", nullable = false)
    private String postId;
    @Column(name = "ip_address")
    private String ipAddress;
    @Column(name = "user_agent")
    private String userAgent;
    private String referrer;

    @CreationTimestamp
    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;
}
