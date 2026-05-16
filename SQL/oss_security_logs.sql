-- ============================================
-- OSS 安全工具 日志表
-- ============================================

-- OSS 扫描日志表
CREATE TABLE IF NOT EXISTS oss_scan_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    tool_type VARCHAR(50) NOT NULL COMMENT '工具类型: bucket_fuzz/path_fuzz/perm_check/ak_leak/takeover',
    scan_mode VARCHAR(20) NOT NULL COMMENT '扫描模式: single/batch',
    target VARCHAR(255) NOT NULL COMMENT '扫描目标(Bucket名称或URL)',
    region VARCHAR(50) NOT NULL COMMENT '阿里云区域',
    options JSON COMMENT '扫描选项',
    status VARCHAR(20) NOT NULL DEFAULT 'running' COMMENT '状态: running/completed/failed',
    total_tasks INT DEFAULT 0 COMMENT '总任务数',
    completed_tasks INT DEFAULT 0 COMMENT '已完成任务数',
    results JSON COMMENT '扫描结果',
    error_message TEXT COMMENT '错误信息',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME COMMENT '完成时间',
    INDEX idx_user_id (user_id),
    INDEX idx_tool_type (tool_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 安全工具使用统计表
CREATE TABLE IF NOT EXISTS security_tool_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tool_type VARCHAR(50) NOT NULL UNIQUE COMMENT '工具类型',
    total_scans INT DEFAULT 0 COMMENT '总扫描次数',
    total_targets INT DEFAULT 0 COMMENT '扫描目标数',
    success_count INT DEFAULT 0 COMMENT '成功次数',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 初始化统计表
INSERT INTO security_tool_stats (tool_type, total_scans, total_targets, success_count) VALUES
('bucket_fuzz', 0, 0, 0),
('path_fuzz', 0, 0, 0),
('perm_check', 0, 0, 0),
('ak_leak', 0, 0, 0),
('takeover', 0, 0, 0)
ON DUPLICATE KEY UPDATE tool_type = tool_type;