-- 邮箱验证功能数据库变更
-- 执行此 SQL 添加邮箱验证相关字段

ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE COMMENT '邮箱是否已验证' AFTER role,
ADD COLUMN email_verify_token VARCHAR(64) DEFAULT NULL COMMENT '邮箱验证 Token' AFTER email_verified,
ADD COLUMN email_verify_expire DATETIME DEFAULT NULL COMMENT '验证 Token 过期时间' AFTER email_verify_token;

-- 为验证 Token 字段添加索引（加快查询速度）
CREATE INDEX idx_email_verify_token ON users(email_verify_token);
