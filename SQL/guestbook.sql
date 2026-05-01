-- 留言板表
CREATE TABLE IF NOT EXISTS `guestbook` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '主键 UUID',
    `nickname` VARCHAR(50) NOT NULL COMMENT '昵称',
    `content` VARCHAR(1000) NOT NULL COMMENT '留言内容',
    `contact` VARCHAR(100) DEFAULT NULL COMMENT '联系方式',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX `idx_guestbook_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言板';