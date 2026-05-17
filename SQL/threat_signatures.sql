-- 威胁特征库表 (ThreatSignature)
-- 用于记录攻击者 IP 的所有 Payload，便于发现新的攻击模式
-- 当攻击者触发 >= 3 次攻击时自动创建/更新记录

CREATE TABLE IF NOT EXISTS `threat_signatures` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '主键 UUID',
    `ip` VARCHAR(45) NOT NULL COMMENT '攻击者 IP 地址',
    `payloads` TEXT DEFAULT NULL COMMENT '该 IP 尝试过的所有 Payload（用 || 分隔，最多 50 个）',
    `user_agent` VARCHAR(512) DEFAULT NULL COMMENT '攻击者 User-Agent',
    `attack_count` INT NOT NULL DEFAULT 1 COMMENT '该 IP 的攻击次数',
    `attack_types` VARCHAR(512) DEFAULT NULL COMMENT '触发的攻击类型（逗号分隔）',
    `reviewed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已审核: 0=未审核, 1=已审核',
    `risk_level` VARCHAR(20) DEFAULT 'low' COMMENT '威胁等级: low/medium/high/critical',
    `note` TEXT DEFAULT NULL COMMENT '管理员分析备注',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次记录时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    INDEX `idx_threat_ip` (`ip`),
    INDEX `idx_threat_reviewed` (`reviewed`),
    INDEX `idx_threat_attack_count` (`attack_count`),
    INDEX `idx_threat_risk_level` (`risk_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='威胁特征库';