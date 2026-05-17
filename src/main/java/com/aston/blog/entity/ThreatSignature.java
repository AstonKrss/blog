package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "threat_signatures", indexes = {
    @Index(name = "idx_ip", columnList = "ip"),
    @Index(name = "idx_alert_threshold", columnList = "attack_count")
})
@Data
public class ThreatSignature {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** 攻击者 IP */
    private String ip;

    /** 该 IP 尝试过的所有 Payload（用 || 分隔） */
    @Column(columnDefinition = "TEXT")
    private String payloads;

    /** 常见的 User-Agent */
    private String userAgent;

    /** 攻击次数 */
    private int attackCount;

    /** 触发的攻击类型（逗号分隔，如 "SENSITIVE_ACCESS,XSS,SQL_INJECTION"） */
    private String attackTypes;

    /** 是否已被审核/分析 */
    private boolean reviewed;

    /** 威胁等级：low/medium/high/critical */
    private String riskLevel;

    /** 备注（管理员可手动填写分析结论） */
    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}