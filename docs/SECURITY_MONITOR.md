# 安全监控后端实现指南 (完整版)

本文档详细说明如何实现完整的攻击日志记录和统计功能，支持多种攻击类型检测。

## 攻击类型分类

| 类型 | 常量 | 说明 |
|------|------|------|
| XSS | `XSS` | 跨站脚本攻击 |
| SQL注入 | `SQL_INJECTION` | SQL 注入攻击 |
| 暴力破解 | `BRUTE_FORCE` | 登录暴力破解 |
| 路径穿越 | `PATH_TRAVERSAL` | 目录遍历攻击 |
| 命令注入 | `COMMAND_INJECTION` | OS 命令注入 |
| 扫描探测 | `SCANNER` | 扫描器行为检测 |
| 敏感文件访问 | `SENSITIVE_ACCESS` | 敏感文件访问 |
| 其他 | `OTHER` | 其他类型攻击 |

---

## 1. 数据库实体

创建 `AttackLog.java`：

```java
package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "attack_logs")
@Data
public class AttackLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String ip;                    // 攻击者 IP
    private String path;                  // 请求路径
    private String method;                // 请求方法 GET/POST
    private String payload;               // 攻击载荷
    private String attackType;            // 攻击类型
    private String userAgent;             // 浏览器标识
    private String queryParams;           // URL 查询参数
    private Integer riskLevel;             // 风险等级 1-5
    private LocalDateTime createdAt;      // 创建时间
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

创建 `LoginAttempt.java`（用于暴力破解检测）：

```java
package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_attempts")
@Data
public class LoginAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String ip;                    // 尝试登录的 IP
    private String username;              // 尝试的用户名
    private boolean success;              // 是否成功
    private String userAgent;             // 浏览器标识
    private LocalDateTime createdAt;      // 尝试时间
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

---

## 2. Repository

创建 `AttackLogRepository.java`：

```java
package com.aston.blog.repository;

import com.aston.blog.entity.AttackLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttackLogRepository extends JpaRepository<AttackLog, String> {
    
    // 统计总数
    long count();
    
    // 按类型统计
    long countByAttackType(String attackType);
    
    // 统计今日攻击数
    @Query("SELECT COUNT(a) FROM AttackLog a WHERE a.createdAt >= :startOfDay")
    long countToday(LocalDateTime startOfDay);
    
    // 获取攻击者排行（包含最后攻击时间）
    @Query("SELECT a.ip, COUNT(a) as cnt, MAX(a.createdAt) as lastTime FROM AttackLog a GROUP BY a.ip ORDER BY cnt DESC")
    List<Object[]> findTopAttackers();
    
    // 获取攻击目标排行
    @Query("SELECT a.path, COUNT(a) as cnt FROM AttackLog a GROUP BY a.path ORDER BY cnt DESC")
    List<Object[]> findTopAttackPaths();
    
    // 获取最近的攻击日志
    List<AttackLog> findTop50ByOrderByCreatedAtDesc();
    
    // 获取最近7天的攻击趋势
    @Query("SELECT CAST(a.createdAt AS date) as date, COUNT(a) as cnt FROM AttackLog a WHERE a.createdAt >= :startDate GROUP BY CAST(a.createdAt AS date) ORDER BY date")
    List<Object[]> findAttackTrend(LocalDateTime startDate);
    
    // 按日期范围查询
    List<AttackLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);
}
```

创建 `LoginAttemptRepository.java`：

```java
package com.aston.blog.repository;

import com.aston.blog.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, String> {
    
    // 统计某 IP 在时间窗口内的失败次数
    @Query("SELECT COUNT(a) FROM LoginAttempt a WHERE a.ip = :ip AND a.success = false AND a.createdAt >= :since")
    long countFailedAttemptsByIp(String ip, LocalDateTime since);
    
    // 统计某用户名在时间窗口内的失败次数
    @Query("SELECT COUNT(a) FROM LoginAttempt a WHERE a.username = :username AND a.success = false AND a.createdAt >= :since")
    long countFailedAttemptsByUsername(String username, LocalDateTime since);
    
    // 获取某 IP 的最近尝试记录
    List<LoginAttempt> findByIpOrderByCreatedAtDesc(String ip);
}
```

---

## 3. VO 类

创建 `com.aston.blog.vo.security.SecurityStatsVO`：

```java
package com.aston.blog.vo.security;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class SecurityStatsVO {
    private long totalAttacks;                    // 攻击总数
    private long todayCount;                      // 今日攻击数
    private long xssCount;                        // XSS 攻击数
    private long sqlInjectionCount;               // SQL 注入数
    private long bruteForceCount;                // 暴力破解数
    private long pathTraversalCount;             // 路径穿越数
    private long commandInjectionCount;          // 命令注入数
    private long scannerCount;                   // 扫描探测数
    private long sensitiveAccessCount;           // 敏感访问数
    private long otherCount;                     // 其他攻击数
    private List<Map<String, Object>> topAttackers;      // 攻击者排行
    private List<Map<String, Object>> topAttackPaths;   // 攻击目标排行
    private List<Map<String, Object>> attackTrend;      // 7天趋势
    private List<Map<String, Object>> recentLogs;      // 最近日志
}
```

---

## 4. Service 接口和实现

### AttackLogService.java

```java
package com.aston.blog.Service;

import com.aston.blog.vo.security.SecurityStatsVO;

public interface AttackLogService {
    void logAttack(String ip, String path, String method, String payload, String attackType, String userAgent, String queryParams);
    SecurityStatsVO getSecurityStats();
    void recordLoginAttempt(String ip, String username, boolean success, String userAgent);
    boolean isBruteForce(String ip, String username);
}
```

### AttackLogServiceImpl.java

```java
package com.aston.blog.Service.impl;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.entity.AttackLog;
import com.aston.blog.entity.LoginAttempt;
import com.aston.blog.repository.AttackLogRepository;
import com.aston.blog.repository.LoginAttemptRepository;
import com.aston.blog.vo.security.SecurityStatsVO;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AttackLogServiceImpl implements AttackLogService {

    private static final int BRUTE_FORCE_THRESHOLD = 5;      // 5次失败
    private static final int BRUTE_FORCE_WINDOW_MINUTES = 15; // 15分钟内

    private final AttackLogRepository attackLogRepository;
    private final LoginAttemptRepository loginAttemptRepository;

    public AttackLogServiceImpl(AttackLogRepository attackLogRepository,
                               LoginAttemptRepository loginAttemptRepository) {
        this.attackLogRepository = attackLogRepository;
        this.loginAttemptRepository = loginAttemptRepository;
    }

    @Override
    public void logAttack(String ip, String path, String method, String payload, String attackType, String userAgent, String queryParams) {
        AttackLog log = new AttackLog();
        log.setIp(ip);
        log.setPath(path);
        log.setMethod(method);
        log.setPayload(payload);
        log.setAttackType(attackType);
        log.setUserAgent(userAgent);
        log.setQueryParams(queryParams);
        log.setRiskLevel(calculateRiskLevel(attackType));
        attackLogRepository.save(log);
    }

    @Override
    public SecurityStatsVO getSecurityStats() {
        SecurityStatsVO stats = new SecurityStatsVO();
        
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime startOfWeek = LocalDateTime.of(LocalDate.now().minusDays(7), LocalTime.MIN);
        
        // 统计总数
        stats.setTotalAttacks(attackLogRepository.count());
        stats.setTodayCount(attackLogRepository.countToday(startOfDay));
        
        // 统计各类攻击
        stats.setXssCount(attackLogRepository.countByAttackType("XSS"));
        stats.setSqlInjectionCount(attackLogRepository.countByAttackType("SQL_INJECTION"));
        stats.setBruteForceCount(attackLogRepository.countByAttackType("BRUTE_FORCE"));
        stats.setPathTraversalCount(attackLogRepository.countByAttackType("PATH_TRAVERSAL"));
        stats.setCommandInjectionCount(attackLogRepository.countByAttackType("COMMAND_INJECTION"));
        stats.setScannerCount(attackLogRepository.countByAttackType("SCANNER"));
        stats.setSensitiveAccessCount(attackLogRepository.countByAttackType("SENSITIVE_ACCESS"));
        stats.setOtherCount(attackLogRepository.countByAttackType("OTHER"));
        
        // 攻击者排行
        List<Map<String, Object>> topAttackers = attackLogRepository.findTopAttackers().stream()
            .limit(10)
            .map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("ip", row[0]);
                map.put("count", ((Number) row[1]).longValue());
                map.put("lastAttack", row[2] != null ? row[2].toString() : null);
                return map;
            })
            .collect(Collectors.toList());
        stats.setTopAttackers(topAttackers);
        
        // 攻击目标排行
        List<Map<String, Object>> topPaths = attackLogRepository.findTopAttackPaths().stream()
            .limit(10)
            .map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("path", row[0]);
                map.put("count", ((Number) row[1]).longValue());
                return map;
            })
            .collect(Collectors.toList());
        stats.setTopAttackPaths(topPaths);
        
        // 7天趋势
        List<Map<String, Object>> trend = attackLogRepository.findAttackTrend(startOfWeek).stream()
            .map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("date", row[0].toString());
                map.put("count", ((Number) row[1]).longValue());
                return map;
            })
            .collect(Collectors.toList());
        stats.setAttackTrend(trend);
        
        // 最近日志
        List<Map<String, Object>> recentLogs = attackLogRepository.findTop50ByOrderByCreatedAtDesc().stream()
            .map(log -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", log.getId());
                map.put("ip", log.getIp());
                map.put("path", log.getPath());
                map.put("method", log.getMethod());
                map.put("payload", log.getPayload());
                map.put("attackType", log.getAttackType());
                map.put("userAgent", log.getUserAgent());
                map.put("createdAt", log.getCreatedAt() != null ? log.getCreatedAt().toString() : null);
                return map;
            })
            .collect(Collectors.toList());
        stats.setRecentLogs(recentLogs);
        
        return stats;
    }

    @Override
    public void recordLoginAttempt(String ip, String username, boolean success, String userAgent) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setIp(ip);
        attempt.setUsername(username);
        attempt.setSuccess(success);
        attempt.setUserAgent(userAgent);
        loginAttemptRepository.save(attempt);
    }

    @Override
    public boolean isBruteForce(String ip, String username) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(BRUTE_FORCE_WINDOW_MINUTES);
        
        // 检查 IP 级别的暴力破解
        long ipFailedCount = loginAttemptRepository.countFailedAttemptsByIp(ip, since);
        if (ipFailedCount >= BRUTE_FORCE_THRESHOLD) {
            return true;
        }
        
        // 检查用户名级别的暴力破解
        if (username != null) {
            long userFailedCount = loginAttemptRepository.countFailedAttemptsByUsername(username, since);
            if (userFailedCount >= BRUTE_FORCE_THRESHOLD) {
                return true;
            }
        }
        
        return false;
    }

    private int calculateRiskLevel(String attackType) {
        return switch (attackType) {
            case "COMMAND_INJECTION" -> 5;  // 最高风险
            case "SQL_INJECTION" -> 4;
            case "BRUTE_FORCE" -> 3;
            case "XSS", "PATH_TRAVERSAL" -> 2;
            default -> 1;
        };
    }
}
```

---

## 5. 安全拦截器

创建 `SecurityInterceptor.java`：

```java
package com.aston.blog.config;

import com.aston.blog.Service.AttackLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import java.util.regex.Pattern;

@Component
public class SecurityInterceptor implements HandlerInterceptor {

    // 排除的路径（静态资源等不需要检测）
    private static final String[] EXCLUDE_PATHS = {
        "/uploads/", "/static/", "/favicon", "/robots.txt", "/health", "/actuator"
    };

    // 敏感文件路径
    private static final String[] SENSITIVE_PATHS = {
        "/.env", "/.git/", "/wp-admin", "/admin.php", "/config.php", 
        "/wp-config.php", "/.htaccess", "/web.config", "/backup",
        "/phpinfo", "/info.php", "/shell", "/cmd", "/.bash", "/.ssh"
    };

    // 扫描器特征
    private static final String[] SCANNER_SIGNATURES = {
        "sqlmap", "nmap", "masscan", "burp", "awvs", "netsparker",
        "acunetix", "appscan", "nikto", "dirbuster", "gobuster",
        "wpscan", "joomscan", "droopescan", "testssl", "sslyze"
    };

    // ========== XSS 检测正则 ==========
    private static final Pattern[] XSS_PATTERNS = {
        Pattern.compile("<script[^>]*>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL),
        Pattern.compile("javascript\\s*:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("on\\w+\\s*=", Pattern.CASE_INSENSITIVE),  // onerror=, onclick=
        Pattern.compile("eval\\s*\\(", Pattern.CASE_INSENSITIVE),
        Pattern.compile("expression\\s*\\(", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<img[^>]+onerror", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<iframe[^>]*>", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<object[^>]*>", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<embed[^>]*>", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<svg[^>]*>", Pattern.CASE_INSENSITIVE),
        Pattern.compile("alert\\s*\\(", Pattern.CASE_INSENSITIVE),
        Pattern.compile("document\\.cookie", Pattern.CASE_INSENSITIVE),
        Pattern.compile("document\\.write", Pattern.CASE_INSENSITIVE),
    };

    // ========== SQL 注入检测正则 ==========
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
        Pattern.compile("%2e%2e%2f", Pattern.CASE_INSENSITIVE),  // URL 编码
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

    @Autowired
    private AttackLogService attackLogService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String ip = getClientIp(request);
        String userAgent = request.getHeader("User-Agent") != null ? request.getHeader("User-Agent") : "";
        String queryString = request.getQueryString();
        String fullPayload = queryString != null ? queryString : "";

        // 排除静态资源
        for (String exclude : EXCLUDE_PATHS) {
            if (path.startsWith(exclude)) {
                return true;
            }
        }

        // 检测扫描器
        for (String signature : SCANNER_SIGNATURES) {
            if (userAgent.toLowerCase().contains(signature)) {
                logAttack(ip, path, method, "User-Agent: " + userAgent, "SCANNER", userAgent, fullPayload);
                return true;
            }
        }

        // 检测敏感文件访问
        for (String sensitive : SENSITIVE_PATHS) {
            if (path.toLowerCase().contains(sensitive.toLowerCase())) {
                logAttack(ip, path, method, fullPayload, "SENSITIVE_ACCESS", userAgent, fullPayload);
                return true;
            }
        }

        // 检测 XSS
        for (Pattern pattern : XSS_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                logAttack(ip, path, method, extractMatchedContent(pattern, fullPayload), "XSS", userAgent, fullPayload);
                return true;
            }
        }

        // 检测 SQL 注入
        for (Pattern pattern : SQL_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                logAttack(ip, path, method, extractMatchedContent(pattern, fullPayload), "SQL_INJECTION", userAgent, fullPayload);
                return true;
            }
        }

        // 检测路径穿越
        for (Pattern pattern : PATH_TRAVERSAL_PATTERNS) {
            if (pattern.matcher(fullPayload).find() || pattern.matcher(path).find()) {
                logAttack(ip, path, method, extractMatchedContent(pattern, fullPayload + " | " + path), "PATH_TRAVERSAL", userAgent, fullPayload);
                return true;
            }
        }

        // 检测命令注入
        for (Pattern pattern : COMMAND_INJECTION_PATTERNS) {
            if (pattern.matcher(fullPayload).find()) {
                logAttack(ip, path, method, extractMatchedContent(pattern, fullPayload), "COMMAND_INJECTION", userAgent, fullPayload);
                return true;
            }
        }

        // 检测 404 错误率高（可能的扫描）
        // 可选：实现更复杂的扫描检测逻辑

        return true;
    }

    private void logAttack(String ip, String path, String method, String payload, String attackType, String userAgent, String queryParams) {
        try {
            attackLogService.logAttack(ip, path, method, payload, attackType, userAgent, queryParams);
            System.out.println("[SECURITY] " + attackType + " from " + ip + " at " + path + " | " + method);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String extractMatchedContent(Pattern pattern, String input) {
        var matcher = pattern.matcher(input);
        StringBuilder sb = new StringBuilder();
        while (matcher.find() && sb.length() < 200) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append(matcher.group());
        }
        return sb.length() > 0 ? sb.toString() : input.substring(0, Math.min(100, input.length()));
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
}
```

---

## 6. 登录控制器增强

修改 `AuthController.java` 或创建登录拦截器来检测暴力破解：

```java
// 在登录方法中添加以下逻辑

@Autowired
private AttackLogService attackLogService;

// 在登录失败时调用
public Result<?> login(...) {
    String ip = getClientIp(request);
    String userAgent = request.getHeader("User-Agent");
    
    // 检查是否被暴力破解
    if (attackLogService.isBruteForce(ip, username)) {
        attackLogService.recordLoginAttempt(ip, username, false, userAgent);
        return Result.error(429, "登录尝试次数过多，请15分钟后再试");
    }
    
    // ... 原有登录逻辑
    
    // 记录登录尝试
    attackLogService.recordLoginAttempt(ip, username, success, userAgent);
    
    // 如果登录失败且检测到暴力破解模式，记录攻击日志
    if (!success) {
        // 检测是否使用了常见弱密码
        if (isWeakPassword(password)) {
            attackLogService.logAttack(ip, "/api/auth/login", "POST", 
                "username=" + username, "BRUTE_FORCE", userAgent, null);
        }
    }
}

private boolean isWeakPassword(String password) {
    String[] weakPasswords = {"123456", "password", "admin", "qwerty", "111111"};
    for (String weak : weakPasswords) {
        if (password.toLowerCase().contains(weak)) {
            return true;
        }
    }
    return false;
}
```

---

## 7. 注册拦截器

确保 `WebConfig.java` 正确注册了拦截器：

```java
package com.aston.blog.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private SecurityInterceptor securityInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(securityInterceptor)
            .addPathPatterns("/**");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:3000", "http://47.242.21.40")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

---

## 8. Admin Controller

```java
package com.aston.blog.Controller;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.common.Result;
import com.aston.blog.vo.security.SecurityStatsVO;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/security")
public class SecurityController {

    private final AttackLogService attackLogService;

    public SecurityController(AttackLogService attackLogService) {
        this.attackLogService = attackLogService;
    }

    @GetMapping("/stats")
    public Result<SecurityStatsVO> getSecurityStats() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !"ADMIN".equals(getRoleFromAuth(auth))) {
            return Result.error(403, "无权限访问");
        }
        return Result.success(attackLogService.getSecurityStats());
    }

    private String getRoleFromAuth(Authentication auth) {
        if (auth.getAuthorities() != null && auth.getAuthorities().iterator().hasNext()) {
            return auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        }
        return null;
    }
}
```

---

## 9. 数据库迁移

在 MySQL 中执行：

```sql
-- 攻击日志表
CREATE TABLE IF NOT EXISTS attack_logs (
    id VARCHAR(36) PRIMARY KEY,
    ip VARCHAR(45) NOT NULL COMMENT '攻击者IP',
    path VARCHAR(500) NOT NULL COMMENT '请求路径',
    method VARCHAR(10) COMMENT '请求方法',
    payload TEXT COMMENT '攻击载荷',
    attack_type VARCHAR(50) COMMENT '攻击类型',
    user_agent VARCHAR(500) COMMENT '浏览器标识',
    query_params TEXT COMMENT 'URL参数',
    risk_level INT COMMENT '风险等级1-5',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip),
    INDEX idx_attack_type (attack_type),
    INDEX idx_created_at (created_at),
    INDEX idx_path (path(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 登录尝试记录表
CREATE TABLE IF NOT EXISTS login_attempts (
    id VARCHAR(36) PRIMARY KEY,
    ip VARCHAR(45) NOT NULL COMMENT '尝试IP',
    username VARCHAR(100) COMMENT '尝试的用户名',
    success BOOLEAN COMMENT '是否成功',
    user_agent VARCHAR(500) COMMENT '浏览器标识',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip),
    INDEX idx_username (username),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 10. 扩展建议

### 10.1 自动封禁
```java
// 检测到恶意 IP 后自动加入黑名单
@Scheduled(fixedRate = 60000) // 每分钟执行
public void blockMaliciousIps() {
    // 查询最近1小时内攻击次数超过50次的IP
    // 添加到 Redis 黑名单或数据库黑名单表
}
```

### 10.2 邮件告警
```java
// 严重攻击时发送邮件
if (attackType.equals("COMMAND_INJECTION") && count > 10) {
    emailService.sendAlert("检测到命令注入攻击", "IP: " + ip + "\n路径: " + path);
}
```

### 10.3 WebSocket 实时通知
```java
// 实时推送攻击警报
@MessageMapping("/security/alert")
public void sendAlert(SecurityAlert alert) {
    messagingTemplate.convertAndSend("/topic/alerts", alert);
}
```

### 10.4 日志清理
```java
// 保留30天数据，定期清理
@Scheduled(cron = "0 0 3 * * ?") // 每天凌晨3点
public void cleanupOldLogs() {
    LocalDateTime threshold = LocalDateTime.now().minusDays(30);
    attackLogRepository.deleteByCreatedAtBefore(threshold);
    loginAttemptRepository.deleteByCreatedAtBefore(threshold);
}
```

---

## 实现顺序

1. 创建数据库表
2. 创建实体类 (`AttackLog`, `LoginAttempt`)
3. 创建 Repository
4. 创建 VO 类
5. 创建 Service
6. 创建 SecurityInterceptor
7. 创建/修改 SecurityController
8. 修改 WebConfig 注册拦截器
9. 重启后端测试
