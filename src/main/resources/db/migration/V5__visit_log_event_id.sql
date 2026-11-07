-- 访问日志事件的幂等键；旧数据回填为原 id，保证迁移后仍可建立唯一索引。
ALTER TABLE visit_logs ADD COLUMN event_id varchar(36) NULL AFTER id;
UPDATE visit_logs SET event_id = id WHERE event_id IS NULL;
ALTER TABLE visit_logs MODIFY COLUMN event_id varchar(36) NOT NULL;
CREATE UNIQUE INDEX uk_visit_log_event ON visit_logs(event_id);