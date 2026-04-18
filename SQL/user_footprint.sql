-- 足迹表（省市两级）
CREATE TABLE IF NOT EXISTS user_footprint (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    province VARCHAR(50) NOT NULL COMMENT '省份',
    city VARCHAR(100) COMMENT '城市（可选，不填表示整个省份）',
    description VARCHAR(500) COMMENT '描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_province (user_id, province),
    INDEX idx_user_id (user_id)
);