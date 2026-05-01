-- 登录尝试记录表 (用于暴力破解防护)
-- 用于记录所有登录尝试，便于分析攻击行为

CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '主键 UUID',
    `ip` VARCHAR(45) NOT NULL COMMENT '尝试登录的 IP 地址',
    `username` VARCHAR(255) DEFAULT NULL COMMENT '尝试的用户名',
    `success` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否成功: 0=失败, 1=成功',
    `user_agent` VARCHAR(512) DEFAULT NULL COMMENT '浏览器 User-Agent',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '尝试时间',
    INDEX `idx_login_attempts_ip` (`ip`),
    INDEX `idx_login_attempts_username` (`username`),
    INDEX `idx_login_attempts_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录尝试记录表';