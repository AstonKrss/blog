-- 碎碎念动态表
CREATE TABLE IF NOT EXISTS `notes` (
    `id` VARCHAR(36) PRIMARY KEY,
    `content` TEXT,
    `image_urls` TEXT COMMENT 'JSON array of image URLs',
    `video_url` VARCHAR(500) DEFAULT NULL,
    `author_id` VARCHAR(36) NOT NULL,
    `like_count` INT DEFAULT 0,
    `comment_count` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_notes_author` (`author_id`),
    INDEX `idx_notes_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 碎碎念评论表
CREATE TABLE IF NOT EXISTS `note_comments` (
    `id` VARCHAR(36) PRIMARY KEY,
    `note_id` VARCHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `user_id` VARCHAR(36),
    `parent_id` VARCHAR(36) DEFAULT NULL COMMENT '父评论ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_note_comments_note` (`note_id`),
    INDEX `idx_note_comments_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 碎碎念点赞表
CREATE TABLE IF NOT EXISTS `note_likes` (
    `id` VARCHAR(36) PRIMARY KEY,
    `note_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_note_like_unique` (`note_id`, `user_id`),
    INDEX `idx_note_likes_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;