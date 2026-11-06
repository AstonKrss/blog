-- 为 myblog_bench 的笔记相关表补索引，用于对比 N+1 批量查询在有索引时的表现
CREATE INDEX idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX idx_notes_author_created_at ON notes (author_id, created_at DESC);
CREATE INDEX idx_note_comments_note_created_at ON note_comments (note_id, created_at ASC);
CREATE INDEX idx_note_comments_parent ON note_comments (parent_id);
CREATE UNIQUE INDEX uk_note_likes_note_user ON note_likes (note_id, user_id);
CREATE INDEX idx_note_likes_user ON note_likes (user_id);
ANALYZE TABLE notes, note_comments, note_likes;
