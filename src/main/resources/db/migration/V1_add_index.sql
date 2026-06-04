-- posts：公开文章列表、详情、后台文章列表、搜索基础过滤
CREATE UNIQUE INDEX IF NOT EXISTS uk_posts_slug ON posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_status_published_at ON posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_status_created_at ON posts (author_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at ON posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_slug ON posts (status, slug);


CREATE FULLTEXT INDEX IF NOT EXISTS ft_posts_title_content ON posts (title, content);

-- post_tags：标签筛选文章
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_post ON post_tags (tag_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_tag ON post_tags (post_id, tag_id);

-- tags：按 name/slug 查找
CREATE UNIQUE INDEX IF NOT EXISTS uk_tags_name ON tags (name);
CREATE UNIQUE INDEX IF NOT EXISTS uk_tags_slug ON tags (slug);

-- comments：文章评论列表
CREATE INDEX IF NOT EXISTS idx_comments_post_created_at ON comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_user_created_at ON comments (user_id, created_at DESC);
-- post_likes：点赞状态、点赞计数、防重复点赞
CREATE UNIQUE INDEX IF NOT EXISTS uk_post_likes_post_user ON post_likes (post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes (user_id);

-- notes：笔记流、我的笔记
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_author_created_at ON notes (author_id, created_at DESC);

-- note_comments：笔记评论树
CREATE INDEX IF NOT EXISTS idx_note_comments_note_created_at ON note_comments (note_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_note_comments_parent ON note_comments (parent_id);

-- note_likes：笔记点赞状态、防重复点赞
CREATE UNIQUE INDEX IF NOT EXISTS uk_note_likes_note_user ON note_likes (note_id, user_id);
CREATE INDEX IF NOT EXISTS idx_note_likes_user ON note_likes (user_id);

-- photos：相册排序与文件同步
CREATE INDEX IF NOT EXISTS idx_photos_sort_order ON photos (sort_order ASC);
CREATE UNIQUE INDEX IF NOT EXISTS uk_photos_filename ON photos (filename);

-- projects：公开项目列表和后台排序
CREATE INDEX IF NOT EXISTS idx_projects_status_sort_order ON projects (status, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects (sort_order ASC);

-- friend_links：审核列表
CREATE INDEX IF NOT EXISTS idx_friend_links_status_created_at ON friend_links (status, created_at DESC);

-- user_footprint：旅行足迹
CREATE INDEX IF NOT EXISTS idx_user_footprint_user_created_at ON user_footprint (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uk_user_footprint_user_province_city ON user_footprint (user_id, province, city);

-- guestbook：留言板倒序
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook (created_at DESC);

-- site_settings：配置按 key 查询
CREATE UNIQUE INDEX IF NOT EXISTS uk_site_settings_key ON site_settings (setting_key);

-- email_codes：验证码查询与清理
CREATE INDEX IF NOT EXISTS idx_email_codes_email_type_used_created_at ON email_codes (email, type, used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_codes_expire_at ON email_codes (expire_at);

-- login_attempts：暴力破解判断
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_success_created_at ON login_attempts (ip, success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_success_created_at ON login_attempts (username, success, created_at DESC);

-- visit_logs：访问统计、在线人数、后台日志
CREATE INDEX IF NOT EXISTS idx_visit_logs_created_at ON visit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_logs_ip_created_at ON visit_logs (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_logs_path_created_at ON visit_logs (path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_logs_country_created_at ON visit_logs (country, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_logs_isp_created_at ON visit_logs (isp, created_at DESC);

-- attack_logs：安全面板统计与筛选
CREATE INDEX IF NOT EXISTS idx_attack_logs_created_at ON attack_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attack_logs_attack_type_created_at ON attack_logs (attack_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attack_logs_ip_created_at ON attack_logs (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attack_logs_ip_attack_type_created_at ON attack_logs (ip, attack_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attack_logs_path_created_at ON attack_logs (path, created_at DESC);

-- threat_signatures：未审核威胁排序
CREATE INDEX IF NOT EXISTS idx_threat_signatures_reviewed_attack_count ON threat_signatures (reviewed, attack_count DESC);
CREATE INDEX IF NOT EXISTS idx_threat_signatures_ip_reviewed ON threat_signatures (ip, reviewed);