package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Table(name = "email_codes")
@Entity
public class EmailCode {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 6)
    private String code;

    @Column(nullable = false, length = 50)
    private String type; // REGISTER, RESET_PASSWORD

    @Column(name = "expire_at", nullable = false)
    private LocalDateTime expireAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "used", nullable = false)
    private boolean used = false;
}
