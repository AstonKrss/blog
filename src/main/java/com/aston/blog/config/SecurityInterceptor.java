package com.aston.blog.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.aston.blog.Service.AttackLogService;

import java.io.IOException;
import java.util.regex.Pattern;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class SecurityInterceptor implements HandlerInterceptor {

    @Autowired
    private AttackLogService attackLogService;

    // ========== 服务器自身 IP 白名单 ==========
    private static final String[] ALLOWED_IPS = {
            "47.242.21.40", // 服务器公网 IP
            "127.0.0.1", // 本地回环
            "0:0:0:0:0:0:0:1", // IPv6 回环
            "172.17.0.1" // Docker 默认网关
    };

    // ========== 排除的路径 ==========
    private static final String[] EXCLUDE_PATHS = {
            "/uploads/", "/static/", "/favicon", "/robots.txt", "/health", "/actuator"
    };

    // ========== 先启用阻断的高风险入口 ==========
    private static final String[] BLOCK_PATH_PREFIXES = {
            "/api/tools/",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/send-code",
            "/api/public/comments",
            "/api/notes/"
    };

    private static final String[] BLOCK_PATH_CONTAINS = {
            "/comments",
            "/guestbook"
    };

    // ========== 敏感文件扩展名 ==========
    private static final String[] SENSITIVE_EXTENSIONS = {
            ".env", ".env.local", ".env.production", ".env.backup",
            ".git", ".svn", ".hg", ".bzr",
            ".key", ".pem", ".crt", ".p12", ".pfx", ".jks",
            ".sql", ".dump", ".backup", ".bak",
            ".pyc", "__pycache__", "requirements.txt", "setup.py", "Pipfile", "poetry.lock",
            "package.json", "package-lock.json", ".npmrc", "yarn.lock",
            "Gemfile", "Gemfile.lock", "Cargo.toml", "Cargo.lock",
            "web.config", "app.config", "appsettings.json",
            ".htaccess", ".htpasswd", "httpd.conf", "nginx.conf", "apache2.conf",
            ".conf", ".config", ".ini", ".toml", ".yaml", ".yml",
            ".aws", "credentials", "accessKeys", "secret",
            ".idea", ".vscode", ".settings", ".project",
            ".log", ".logs", "error.log", "access.log"
    };

    // ========== 敏感路径关键词 ==========
    private static final String[] SENSITIVE_PATHS = {
            "wp-admin", "wp-login", "wp-config", "wp-content",
            "admin.php", "admin/index", "admin/login", "administrator",
            "phpmyadmin", "adminer", "mysql", "database",
            "backup/", "backups/", "db/", "data/", "dump/",
            "/.git/", "/.svn/", "/.env/", "/.config/",
            "shell", "cmd", "execute", "eval", "base64",
            "/api/.env", "/api/config", "/api/backup",
            "/console", "/swagger", "/docs/api",
            "/xmlrpc.php", "/wp/xmlrpc.php",
            "/.well-known/", "/.ssh/", "/.bash/",
            "phpinfo", "info.php", ".php",
            "passwd", "shadow", "known_hosts", "authorized_keys",
            ".npmrc", "pip.conf", "netrc", ".netrc"
    };

    // ========== 扫描器特征 ==========
    private static final String[] SCANNER_SIGNATURES = {
            "sqlmap", "nmap", "masscan", "burp", "awvs", "netsparker",
            "acunetix", "appscan", "nikto", "dirbuster", "gobuster",
            "wpscan", "joomscan", "droopescan", "testssl", "sslyze",
            "zap", "owasp", "metasploit", "hydra", "medusa",
            "golismero", " Vega", " Nessus", "OpenVAS", "Qualys"
    };

    private static final Pattern[] XSS_PATTERNS = {
            Pattern.compile("<script[^>]*>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL),
            Pattern.compile("javascript\\s*:", Pattern.CASE_INSENSITIVE),
            Pattern.compile("on\\w+\\s*=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("data\\s*:\\s*text/html", Pattern.CASE_INSENSITIVE),
            Pattern.compile("vbscript\\s:", Pattern.CASE_INSENSITIVE),
    };

    private static final Pattern[] SQL_PATTERNS = {
            Pattern.compile("union\\s+(all\\s+)?select", Pattern.CASE_INSENSITIVE),
            Pattern.compile("'\\s*(or|and)\\s+.*[=><]", Pattern.CASE_INSENSITIVE),
            Pattern.compile("'\\s*=\\s*'", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(drop|delete|truncate|alter)\\s+(table|database)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("insert\\s+into", Pattern.CASE_INSENSITIVE),
            Pattern.compile("update\\s+.+\\s+set", Pattern.CASE_INSENSITIVE),
            Pattern.compile("exec\\s*\\(|execute\\s*\\(", Pattern.CASE_INSENSITIVE),
            Pattern.compile("waitfor\\s+delay", Pattern.CASE_INSENSITIVE),
            Pattern.compile("benchmark\\s*\\(", Pattern.CASE_INSENSITIVE),
            Pattern.compile("sleep\\s*\\(", Pattern.CASE_INSENSITIVE),
            Pattern.compile("information_schema", Pattern.CASE_INSENSITIVE),
            Pattern.compile("concat\\s*\\(", Pattern.CASE_INSENSITIVE),
            Pattern.compile("0x[0-9a-f]{6,}", Pattern.CASE_INSENSITIVE), // Hex 编码（长度限制减少误报）
    };

    // ========== 路径穿越检测正则 ==========
    private static final Pattern[] PATH_TRAVERSAL_PATTERNS = {
            Pattern.compile("\\.\\./", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\.\\.\\\\", Pattern.CASE_INSENSITIVE),
            Pattern.compile("%2e%2e%2f", Pattern.CASE_INSENSITIVE),
            Pattern.compile("%2e%2e/", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\.\\.%2f", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\.\\.%5c", Pattern.CASE_INSENSITIVE),
            Pattern.compile("etc/passwd", Pattern.CASE_INSENSITIVE),
            Pattern.compile("c:\\\\windows", Pattern.CASE_INSENSITIVE),
            Pattern.compile("/etc/shadow", Pattern.CASE_INSENSITIVE),
    };

    // ========== 命令注入检测正则 ==========
    private static final Pattern[] COMMAND_INJECTION_PATTERNS = {
            Pattern.compile("[;&|`$]\\s*(cat|ls|dir|echo|cd|wget|curl|nc|bash|sh|cmd|python|perl)",
                    Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\|\\s*(cat|ls|dir|echo|wget|curl|nc)", Pattern.CASE_INSENSITIVE),
            Pattern.compile(";\\s*whoami", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bping\\b.*-c\\s*\\d+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bcurl\\b.*-o\\s+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bwget\\b.*-O\\s+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bpython\\b.*-c\\s+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("&\\{.*\\}", Pattern.CASE_INSENSITIVE),
    };

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String ip = getClientIp(request);

        // 白名单 IP 直接放行
        for (String allow : ALLOWED_IPS) {
            if (ip.equals(allow)) {
                return true;
            }
        }

        // 排除路径直接放行
        for (String exclude : EXCLUDE_PATHS) {
            if (path.startsWith(exclude)) {
                return true;
            }
        }

        String userAgent = request.getHeader("User-Agent");
        String queryString = request.getQueryString();
        String fullPayload = queryString != null ? queryString : "";

        // 检测扫描器特征
        for (String signature : SCANNER_SIGNATURES) {
            if (userAgent != null && userAgent.toLowerCase().contains(signature)) {
                return handleDetectedRequest(response, ip, path, method, fullPayload, "SCANNER_DETECTED", userAgent,
                        fullPayload);
            }
        }

        // 检测 XSS
        for (Pattern pattern : XSS_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                String matched = extractMatchedContent(pattern, fullPayload);
                return handleDetectedRequest(response, ip, path, method, matched, "XSS", userAgent, fullPayload);
            }
        }

        // 检测 SQL 注入
        for (Pattern pattern : SQL_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                String matched = extractMatchedContent(pattern, fullPayload);
                return handleDetectedRequest(response, ip, path, method, matched, "SQL_INJECTION", userAgent,
                        fullPayload);
            }
        }

        // 检测路径穿越
        for (Pattern pattern : PATH_TRAVERSAL_PATTERNS) {
            if (pattern.matcher(fullPayload).find() || pattern.matcher(path).find()) {
                String matched = extractMatchedContent(pattern, fullPayload + " | " + path);
                return handleDetectedRequest(response, ip, path, method, matched, "PATH_TRAVERSAL", userAgent,
                        fullPayload);
            }
        }

        // 检测命令注入
        for (Pattern pattern : COMMAND_INJECTION_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                String matched = extractMatchedContent(pattern, fullPayload);
                return handleDetectedRequest(response, ip, path, method, matched, "COMMAND_INJECTION", userAgent,
                        fullPayload);
            }
        }

        // 检测敏感扩展名
        String pathLower = path.toLowerCase();
        for (String ext : SENSITIVE_EXTENSIONS) {
            if (pathLower.endsWith(ext) || pathLower.contains(ext)) {
                return handleDetectedRequest(response, ip, path, method, fullPayload, "SENSITIVE_ACCESS", userAgent,
                        fullPayload);
            }
        }

        // 检测敏感路径关键词
        for (String keyword : SENSITIVE_PATHS) {
            if (pathLower.contains(keyword.toLowerCase())) {
                return handleDetectedRequest(response, ip, path, method, fullPayload, "SENSITIVE_ACCESS", userAgent,
                        fullPayload);
            }
        }

        return true;
    }

    private boolean handleDetectedRequest(
            HttpServletResponse response,
            String ip,
            String path,
            String method,
            String payload,
            String attackType,
            String userAgent,
            String fullPayload
    ) throws IOException {
        attackLogService.recordAttack(ip, path, method, payload, attackType, userAgent, fullPayload);
        attackLogService.recordThreat(ip, path, method, payload, attackType, userAgent, fullPayload);

        if (!isBlockingEnabled() || !isBlockPath(path)) {
            return true;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":403,\"message\":\"请求被安全策略拦截\"}");
        return false;
    }

    private boolean isBlockingEnabled() {
        String value = System.getenv("SECURITY_INTERCEPTOR_BLOCK");
        return value == null || Boolean.parseBoolean(value);
    }

    private boolean isBlockPath(String path) {
        String normalizedPath = path == null ? "" : path.toLowerCase();

        for (String prefix : BLOCK_PATH_PREFIXES) {
            if (normalizedPath.startsWith(prefix.toLowerCase())) {
                return true;
            }
        }

        for (String keyword : BLOCK_PATH_CONTAINS) {
            if (normalizedPath.contains(keyword.toLowerCase())) {
                return true;
            }
        }

        return false;
    }

    private String getClientIp(HttpServletRequest request) {
        String[] headers = {
                "X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP",
                "WL-Proxy-Client-IP", "HTTP_X_FORWARDED_FOR", "HTTP_X_FORWARDED",
                "HTTP_CLIENT_IP", "HTTP_FORWARDED_FOR", "REMOTE_ADDR"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private String extractMatchedContent(Pattern pattern, String input) {
        var matcher = pattern.matcher(input);
        StringBuilder sb = new StringBuilder();
        while (matcher.find() && sb.length() < 200) {
            if (sb.length() > 0)
                sb.append(" | ");
            sb.append(matcher.group());
        }
        return sb.length() > 0 ? sb.toString() : input.substring(0, Math.min(100, input.length()));
    }
}
