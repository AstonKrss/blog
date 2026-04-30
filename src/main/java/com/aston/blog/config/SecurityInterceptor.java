package com.aston.blog.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.aston.blog.Service.AttackLogService;

import java.util.regex.Pattern;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class SecurityInterceptor implements HandlerInterceptor {

    @Autowired
    private AttackLogService attackLogService;

    // 排除的路径（静态资源等不需要检测）
    private static final String[] EXCLUDE_PATHS = {
            "/uploads/", "/static/", "/favicon", "/robots.txt", "/health", "/actuator"
    };

    // 敏感文件路径
    private static final String[] SENSITIVE_PATHS = {
            "/.env", "/.git/", "/wp-admin", "/admin.php", "/config.php",
            "/wp-config.php", "/.htaccess", "/web.config", "/backup",
            "/phpinfo", "/info.php", "/shell", "/cmd", "/.bash", "/.ssh",
            "/.api/.env", "/.api/.git/", "/.api/wp-admin", "/.api/admin.php", "/.api/config.php",
            "/.api/wp-config.php", "/.api/.htaccess", "/.api/web.config", "/.api/backup",
            "/.api/phpinfo", "/.api/info.php", "/.api/shell", "/.api/cmd", "/.api/.bash", "/.api/.ssh"
    };

    // 扫描器特征
    private static final String[] SCANNER_SIGNATURES = {
            "sqlmap", "nmap", "masscan", "burp", "awvs", "netsparker",
            "acunetix", "appscan", "nikto", "dirbuster", "gobuster",
            "wpscan", "joomscan", "droopescan", "testssl", "sslyze"
    };

    private static final Pattern[] XSS_PATTERNS = {
            Pattern.compile("<script[^>]*>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL),
            Pattern.compile("javascript\\s*:", Pattern.CASE_INSENSITIVE),
            Pattern.compile("on\\w+\\s*=", Pattern.CASE_INSENSITIVE),
    };
    private static final Pattern[] SQL_PATTERNS = {
            Pattern.compile("union\\s+(all\\s+)?select", Pattern.CASE_INSENSITIVE),
            Pattern.compile("'\\s*(or|and)\\s+'?", Pattern.CASE_INSENSITIVE),
            Pattern.compile("1\\s*=\\s*1", Pattern.CASE_INSENSITIVE),
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
            Pattern.compile("0x[0-9a-f]+", Pattern.CASE_INSENSITIVE), // Hex 编码
    };
    // ========== 路径穿越检测正则 ==========
    private static final Pattern[] PATH_TRAVERSAL_PATTERNS = {
            Pattern.compile("\\.\\./", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\.\\.\\\\", Pattern.CASE_INSENSITIVE),
            Pattern.compile("%2e%2e%2f", Pattern.CASE_INSENSITIVE), // URL 编码
            Pattern.compile("%2e%2e/", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\.\\.%2f", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\.\\.%5c", Pattern.CASE_INSENSITIVE),
            Pattern.compile("etc/passwd", Pattern.CASE_INSENSITIVE),
            Pattern.compile("c:\\windows", Pattern.CASE_INSENSITIVE),
            Pattern.compile("/etc/shadow", Pattern.CASE_INSENSITIVE),
    };

    // ========== 命令注入检测正则 ==========
    private static final Pattern[] COMMAND_INJECTION_PATTERNS = {
            Pattern.compile("[;&|`$]\\s*(cat|ls|dir|echo|cd|wget|curl|nc|bash|sh|cmd)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\|\\s*(cat|ls|dir|echo|wget|curl|nc)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\b(cat|ls|dir|echo|wget|curl|nc)\\b.*\\|", Pattern.CASE_INSENSITIVE),
            Pattern.compile(";\\s*whoami", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bping\\b.*-c\\s*\\d+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bcurl\\b.*-o\\s+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bwget\\b.*-O\\s+", Pattern.CASE_INSENSITIVE),
    };

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String path = request.getRequestURI();
        // 这里可以添加更多的安全检查逻辑，比如检查请求头、参数等
        String method = request.getMethod();
        String ip = getClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        String queryString = request.getQueryString();
        String fullPayload = queryString != null ? queryString : "";

        for (String exclude : EXCLUDE_PATHS) {
            if (path.startsWith(exclude)) {
                return true;
            }
        }
        for (String signature : SCANNER_SIGNATURES) {
            if (userAgent != null && userAgent.toLowerCase().contains(signature)) {
                // 记录扫描器攻击日志
                attackLogService.recordAttack(ip, path, method, fullPayload, "SENSITIVE_ACCESS", userAgent,
                        fullPayload);
                return true;
            }
        }
        // 检测 XSS
        for (Pattern pattern : XSS_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                attackLogService.recordAttack(ip, path, method, extractMatchedContent(pattern, fullPayload), "XSS",
                        userAgent, fullPayload);
                return true;
            }
        }

        // 检测 SQL 注入
        for (Pattern pattern : SQL_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                attackLogService.recordAttack(ip, path, method, extractMatchedContent(pattern, fullPayload),
                        "SQL_INJECTION", userAgent, fullPayload);
                return true;
            }
        }

        // 检测路径穿越
        for (Pattern pattern : PATH_TRAVERSAL_PATTERNS) {
            if (pattern.matcher(fullPayload).find() || pattern.matcher(path).find()) {
                attackLogService.recordAttack(ip, path, method,
                        extractMatchedContent(pattern, fullPayload + " | " + path), "PATH_TRAVERSAL", userAgent,
                        fullPayload);
                return true;
            }
        }

        // 检测命令注入
        for (Pattern pattern : COMMAND_INJECTION_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                attackLogService.recordAttack(ip, path, method, extractMatchedContent(pattern, fullPayload),
                        "COMMAND_INJECTION", userAgent, fullPayload);
                return true;
            }
        }

        for (String sensitive : SENSITIVE_PATHS) {
            if (path.toLowerCase().contains(sensitive.toLowerCase())) {
                // 记录敏感文件访问日志
                attackLogService.recordAttack(ip, path, method, fullPayload, "SENSITIVE_ACCESS", userAgent,
                        fullPayload);
                return true;
            }
        }
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String[] headers = {
                "X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP",
                "WL-Proxy-Client-IP", "HTTP_X_FORWARDED_FOR", "HTTP_X_FORWARDED",
                "HTTP_CLIENT_IP", "HTTP_FORWARDED_FOR", "REMOTE_ADDR"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
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
