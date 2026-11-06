-- 笔记 N+1 / 分页 / 慢查询压测数据
-- 目标库：myblog_bench（独立测试库，不污染 myblog）
-- 规模：10,000 notes / 100,000 note_comments / 10,000 note_likes
-- 前置：myblog_bench.users 已有 10,000 条 bench_user_* 数据

SET SESSION cte_max_recursion_depth = 200000;

TRUNCATE TABLE note_comments;
TRUNCATE TABLE note_likes;
TRUNCATE TABLE notes;

DROP TABLE IF EXISTS bench_numbers;
CREATE TABLE bench_numbers (n INT NOT NULL PRIMARY KEY);

INSERT INTO bench_numbers (n)
SELECT a.d + b.d * 10 + c.d * 100 + d.d * 1000 + 1
FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d;

DROP TABLE IF EXISTS bench_offsets;
CREATE TABLE bench_offsets (k INT NOT NULL PRIMARY KEY);
INSERT INTO bench_offsets (k) VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

INSERT INTO notes
    (id, author_id, comment_count, content, created_at, image_urls, like_count, updated_at, video_url)
SELECT
    CONCAT('bench-note-', LPAD(n, 6, '0')),
    CONCAT('a', LPAD(n, 7, '0'), '-0000-0000-0000-', LPAD(n, 12, '0')),
    10,
    CONCAT('Bench note ', LPAD(n, 6, '0'), ' content for N+1 and pagination testing.'),
    DATE_SUB('2026-11-04 00:00:00', INTERVAL n MINUTE),
    NULL,
    1,
    DATE_SUB('2026-11-04 00:00:00', INTERVAL n MINUTE),
    NULL
FROM bench_numbers;

INSERT INTO note_comments
    (id, content, created_at, note_id, parent_id, user_id)
SELECT
    CONCAT('bench-comment-', LPAD(n, 6, '0'), '-', k),
    CONCAT('Bench comment ', n, '-', k),
    DATE_ADD(DATE_SUB('2026-11-04 00:00:00', INTERVAL n MINUTE), INTERVAL k MINUTE),
    CONCAT('bench-note-', LPAD(n, 6, '0')),
    CASE WHEN k >= 8
         THEN CONCAT('bench-comment-', LPAD(n, 6, '0'), '-', k - 8)
         ELSE NULL
    END,
    CONCAT(
        'a',
        LPAD(((n + k) % 10000) + 1, 7, '0'),
        '-0000-0000-0000-',
        LPAD(((n + k) % 10000) + 1, 12, '0')
    )
FROM bench_numbers
CROSS JOIN bench_offsets;

INSERT INTO note_likes (id, created_at, note_id, user_id)
SELECT
    CONCAT('bench-like-', LPAD(n, 6, '0')),
    DATE_SUB('2026-11-04 00:00:00', INTERVAL n MINUTE),
    CONCAT('bench-note-', LPAD(n, 6, '0')),
    CONCAT(
        'a',
        LPAD((n % 10000) + 1, 7, '0'),
        '-0000-0000-0000-',
        LPAD((n % 10000) + 1, 12, '0')
    )
FROM bench_numbers;

DROP TABLE IF EXISTS bench_offsets;
DROP TABLE IF EXISTS bench_numbers;

SELECT 'notes' AS table_name, COUNT(*) AS row_count FROM notes
UNION ALL SELECT 'note_comments', COUNT(*) FROM note_comments
UNION ALL SELECT 'note_likes', COUNT(*) FROM note_likes;
