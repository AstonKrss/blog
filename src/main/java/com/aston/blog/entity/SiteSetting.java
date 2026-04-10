package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "site_settings")
public class SiteSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(name = "setting_key", unique = true, nullable = false)
    private String settingKey;
    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String settingValue;
    private String description;

    @CreationTimestamp
    @Column(name = "update_at")
    private LocalDateTime updatedAt;
}
