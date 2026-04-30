-- 插入测试攻击日志数据
INSERT INTO attack_logs (id, ip, path, method, payload, attack_type, user_agent, query_params, risk_level, created_at) VALUES
(UUID(), '192.168.1.100', '/api/posts', 'GET', '<script>alert(1)</script>', 'XSS', 'Mozilla/5.0', 'q=<script>alert(1)</script>', 2, NOW()),
(UUID(), '192.168.1.101', '/api/posts', 'GET', "1' OR '1'='1", 'SQL_INJECTION', 'Mozilla/5.0', 'id=1'' OR ''1''=''1', 4, NOW()),
(UUID(), '192.168.1.102', '/api/auth/login', 'POST', 'username=admin&password=123456', 'BRUTE_FORCE', 'sqlmap/1.5', NULL, 3, NOW() - INTERVAL 1 HOUR),
(UUID(), '10.0.0.50', '/uploads/../../../etc/passwd', 'GET', '../../../etc/passwd', 'PATH_TRAVERSAL', 'curl/7.68.0', NULL, 2, NOW() - INTERVAL 2 HOUR),
(UUID(), '10.0.0.51', '/api/search', 'GET', 'q=;cat /etc/passwd', 'COMMAND_INJECTION', 'python-requests/2.25', 'q=;cat /etc/passwd', 5, NOW() - INTERVAL 3 HOUR),
(UUID(), '172.16.0.100', '/.env', 'GET', NULL, 'SENSITIVE_ACCESS', 'nikto/2.1', NULL, 1, NOW() - INTERVAL 4 HOUR),
(UUID(), '172.16.0.101', '/admin.php', 'GET', NULL, 'SENSITIVE_ACCESS', 'nmap/7.80', NULL, 1, NOW() - INTERVAL 5 HOUR),
(UUID(), '192.168.1.103', '/api/posts', 'GET', '<img src=x onerror=alert(1)>', 'XSS', 'Mozilla/5.0', 'q=<img onerror>', 2, NOW() - INTERVAL 6 HOUR),
(UUID(), '192.168.1.104', '/api/user', 'GET', "1 UNION SELECT * FROM users--", 'SQL_INJECTION', 'sqlmap/1.5', 'id=1 UNION SELECT', 4, NOW() - INTERVAL 7 HOUR),
(UUID(), '10.10.10.50', '/api/terminal', 'POST', 'cmd=whoami', 'COMMAND_INJECTION', 'curl/7.68', 'cmd=whoami', 5, NOW() - INTERVAL 8 HOUR),
(UUID(), '192.168.1.105', '/api/search', 'GET', '<script>document.cookie</script>', 'XSS', 'Mozilla/5.0', 'q=<script>document.cookie</script>', 2, NOW() - INTERVAL 1 DAY),
(UUID(), '192.168.1.106', '/api/posts', 'GET', "admin' OR 1=1--", 'SQL_INJECTION', 'Mozilla/5.0', 'id=admin'' OR 1=1--', 4, NOW() - INTERVAL 1 DAY),
(UUID(), '10.0.0.52', '/.git/config', 'GET', NULL, 'SENSITIVE_ACCESS', 'gobuster/3.1', NULL, 1, NOW() - INTERVAL 2 DAY),
(UUID(), '192.168.1.107', '/api/login', 'POST', 'password=password', 'OTHER', 'Mozilla/5.0', NULL, 1, NOW() - INTERVAL 2 DAY),
(UUID(), '192.168.1.108', '/api/posts', 'GET', '<iframe src=evil.com></iframe>', 'XSS', 'Mozilla/5.0', 'q=<iframe src=evil.com></iframe>', 2, NOW() - INTERVAL 3 DAY);

-- 插入登录尝试记录
INSERT INTO login_attempts (id, ip, username, success, user_agent, created_at) VALUES
(UUID(), '192.168.1.100', 'admin', false, 'Mozilla/5.0', NOW()),
(UUID(), '192.168.1.100', 'admin', false, 'Mozilla/5.0', NOW() - INTERVAL 1 MINUTE),
(UUID(), '192.168.1.100', 'admin', false, 'Mozilla/5.0', NOW() - INTERVAL 2 MINUTE),
(UUID(), '192.168.1.100', 'admin', false, 'Mozilla/5.0', NOW() - INTERVAL 3 MINUTE),
(UUID(), '192.168.1.100', 'admin', false, 'Mozilla/5.0', NOW() - INTERVAL 4 MINUTE),
(UUID(), '192.168.1.101', 'test', true, 'Mozilla/5.0', NOW() - INTERVAL 10 MINUTE),
(UUID(), '10.0.0.50', 'admin', false, 'python-requests/2.25', NOW() - INTERVAL 20 MINUTE),
(UUID(), '10.0.0.50', 'admin', false, 'python-requests/2.25', NOW() - INTERVAL 21 MINUTE),
(UUID(), '10.0.0.50', 'admin', false, 'python-requests/2.25', NOW() - INTERVAL 22 MINUTE),
(UUID(), '10.0.0.50', 'admin', false, 'python-requests/2.25', NOW() - INTERVAL 23 MINUTE),
(UUID(), '10.0.0.50', 'admin', false, 'python-requests/2.25', NOW() - INTERVAL 24 MINUTE);
