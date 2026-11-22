# 安全漏洞修复报告

> 生成时间: 2026-05-01
> 项目: Aston Blog (Spring Boot 4.0 + Next.js 15)
> 审核范围: 严重/高危/中危漏洞 (低危漏洞不包含在此报告中)
> 状态: 已修复 (前端部分) + 待修复 (后端部分)

---

## 目录

1. [严重漏洞 (Critical)](#严重漏洞-critical)
   - [1.1 SecurityInterceptor 只检测不拦截](#11-securityinterceptor-只检测不拦截)
   - [1.2 SSRF 漏洞 - SecurityToolsController](#12-ssrf-漏洞---securitytoolscontroller)
   - [1.3 FriendLinkController 缺少权限校验](#13-friendlinkcontroller-缺少权限校验)
   - [1.4 硬编码密钥问题](#14-硬编码密钥问题)
2. [高危漏洞 (High)](#高危漏洞-high)
   - [2.1 TerminalService.canEdit() 权限过松](#21-terminalservicecanedit-权限过松)
   - [2.2 CORS 配置问题](#22-cors-配置问题)
   - [2.3 后端 CORS 生产 IP 硬编码](#23-后端-cors-生产-ip-硬编码)
3. [中危漏洞 (Medium)](#中危漏洞-medium)
   - [3.1 密码强度不足](#31-密码强度不足)
   - [3.2 DTO 输入校验不完整](#32-dto-输入校验不完整)
4. [前端已修复漏洞](#前端已修复漏洞)
   - [JWT Token 存储在 localStorage (XSS 风险)](#jwt-token-存储在-localstorage-xss-风险)
5. [漏洞 Payload 总结](#漏洞-payload-总结)

---

## 严重漏洞 (Critical)

---

### 1.1 SecurityInterceptor 只检测不拦截

**文件**: `src/main/java/com/aston/blog/config/SecurityInterceptor.java`
**行数**: 111-155 (preHandle 方法)
**严重级别**: CRITICAL

#### 问题描述

SecurityInterceptor 能够检测 XSS、SQL 注入、路径穿越、命令注入等攻击特征，但检测后只记录日志，**仍然返回 `true` 允许请求继续**。这意味着攻击可以被记录但不会被阻止。

#### 漏洞代码

```java
// 第 111-116 行 - XSS 检测
for (Pattern pattern : XSS_PATTERNS) {
    if (pattern.matcher(fullPayload).find()) {
        attackLogService.recordAttack(ip, path, method, ..., "XSS", ...);
        return true;  // ❌ 仍然放行请求!
    }
}

// 第 120-126 行 - SQL 注入检测
for (Pattern pattern : SQL_PATTERNS) {
    if (pattern.matcher(fullPayload).find()) {
        attackLogService.recordAttack(..., "SQL_INJECTION", ...);
        return true;  // ❌ 仍然放行请求!
    }
}

// 第 139-145 行 - 命令注入检测
for (Pattern pattern : COMMAND_INJECTION_PATTERNS) {
    if (pattern.matcher(fullPayload).find()) {
        attackLogService.recordAttack(..., "COMMAND_INJECTION", ...);
        return true;  // ❌ 仍然放行请求!
    }
}

// 第 129-136 行 - 路径穿越检测
for (Pattern pattern : PATH_TRAVERSAL_PATTERNS) {
    if (pattern.matcher(fullPayload).find() || pattern.matcher(path).find()) {
        attackLogService.recordAttack(..., "PATH_TRAVERSAL", ...);
        return true;  // ❌ 仍然放行请求!
    }
}
```

#### 可用 Payload

```bash
# XSS Payload
GET /api/posts/search?q=<script>alert(1)</script>
GET /api/posts/1?comment=<img src=x onerror=alert(1)>

# SQL 注入 Payload
GET /api/posts/1' OR '1'='1
GET /api/posts/search?q=1' UNION SELECT * FROM users--
GET /api/comments?postId=1' OR 1=1--

# 路径穿越 Payload
GET /uploads/../../../etc/passwd
GET /api/files?path=..%2F..%2F..%2Fetc%2Fpasswd

# 命令注入 Payload
GET /api/tools/dns?domain=example.com;cat /etc/passwd
GET /api/tools/whois?domain=example.com|ls
```

#### 修复方案

**修改文件**: `src/main/java/com/aston/blog/config/SecurityInterceptor.java`
**修改方法**: `preHandle()` 的各个检测分支

```java
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
        throws Exception {
    // ... 省略前面的检测逻辑，只展示修复后的代码 ...

    // 检测 XSS
    for (Pattern pattern : XSS_PATTERNS) {
        if (pattern.matcher(fullPayload).find()) {
            attackLogService.recordAttack(ip, path, method,
                extractMatchedContent(pattern, fullPayload), "XSS", userAgent, fullPayload);
            // 修复: 返回 403 拒绝请求
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":403,\"message\":\"恶意请求已拦截\"}");
            return false;  // ✅ 阻止请求
        }
    }

    // 检测 SQL 注入
    for (Pattern pattern : SQL_PATTERNS) {
        if (pattern.matcher(fullPayload).find()) {
            attackLogService.recordAttack(ip, path, method,
                extractMatchedContent(pattern, fullPayload), "SQL_INJECTION", userAgent, fullPayload);
            // 修复: 返回 403 拒绝请求
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":403,\"message\":\"恶意请求已拦截\"}");
            return false;  // ✅ 阻止请求
        }
    }

    // 检测路径穿越
    for (Pattern pattern : PATH_TRAVERSAL_PATTERNS) {
        if (pattern.matcher(fullPayload).find() || pattern.matcher(path).find()) {
            attackLogService.recordAttack(ip, path, method,
                extractMatchedContent(pattern, fullPayload + " | " + path), "PATH_TRAVERSAL", userAgent, fullPayload);
            // 修复: 返回 403 拒绝请求
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":403,\"message\":\"恶意请求已拦截\"}");
            return false;  // ✅ 阻止请求
        }
    }

    // 检测命令注入
    for (Pattern pattern : COMMAND_INJECTION_PATTERNS) {
        if (pattern.matcher(fullPayload).find()) {
            attackLogService.recordAttack(ip, path, method,
                extractMatchedContent(pattern, fullPayload), "COMMAND_INJECTION", userAgent, fullPayload);
            // 修复: 返回 403 拒绝请求
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":403,\"message\":\"恶意请求已拦截\"}");
            return false;  // ✅ 阻止请求
        }
    }

    // ... 其余代码保持不变 ...
    return true;
}
```

---

### 1.2 SSRF 漏洞 - SecurityToolsController

**文件**: `src/main/java/com/aston/blog/Controller/SecurityToolsController.java`
**行数**: 157-187 (port-scan), 194-215 (http-headers), 222-260 (cors-test)
**严重级别**: CRITICAL

#### 问题描述

`/api/tools/port-scan` 和 `/api/tools/http-headers` 接口允许用户指定任意主机名或 URL，可被用于扫描内网服务、探测内部网络架构。

#### 漏洞代码

```java
// 第 157-187 行 - 端口扫描
@GetMapping("/port-scan")
public Result<?> portScan(@RequestParam String host,
                          @RequestParam(defaultValue = "80,443,22,21,25,53,110,143,3306,3389,5432,6379,8080,8443,27017") String ports) {
    // ❌ host 参数没有任何校验，可以是任意 IP 或主机名
    for (String portStr : portList) {
        int port = Integer.parseInt(portStr.trim());
        boolean isOpen = checkPort(host, port);  // 可以扫描内网
    }
    ...
}

// 第 194-215 行 - HTTP 头获取
@GetMapping("/http-headers")
public Result<?> getHttpHeaders(@RequestParam String url) {
    // ❌ url 参数没有任何校验
    RestTemplate template = new RestTemplate();
    ResponseEntity<String> response = template.exchange(
        url, HttpMethod.GET, entity, String.class  // 可访问任意 URL
    );
    ...
}

// 第 222-260 行 - CORS 测试
@GetMapping("/cors-test")
public Result<?> corsTest(@RequestParam String url, @RequestParam(defaultValue = "https://evil.com") String origin) {
    // ❌ url 参数没有任何校验
    ResponseEntity<String> response = template.exchange(
        url, HttpMethod.OPTIONS, entity, String.class  // 可探测任意站点
    );
    ...
}
```

#### 可用 Payload

```bash
# 扫描内网 MySQL
GET /api/tools/port-scan?host=192.168.1.100&ports=3306
GET /api/tools/port-scan?host=10.0.0.5&ports=6379,3306,5432

# 扫描本地服务
GET /api/tools/port-scan?host=127.0.0.1&ports=22,3306,6379,27017
GET /api/tools/port-scan?host=localhost&ports=8080,8443

# 探测内网 Web 服务
GET /api/tools/http-headers?url=http://192.168.1.1
GET /api/tools/http-headers?url=http://10.0.0.1:8080/actuator/env

# 读取本地文件 (如果目标支持)
GET /api/tools/http-headers?url=file:///etc/passwd

# 探测云元数据服务
GET /api/tools/http-headers?url=http://169.254.169.254/latest/meta-data/
```

#### 修复方案

**修改文件**: `src/main/java/com/aston/blog/Controller/SecurityToolsController.java`
**新增**: 添加 IP 黑名单和方法校验

```java
// 在 SecurityToolsController 类中添加以下代码

// ========== IP 黑名单 (内网/保留IP段) ==========
private static final Set<String> BLOCKED_IP_PREFIXES = Set.of(
    "10.",           // 10.0.0.0/8 私有地址
    "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.",
    "172.24.", "172.25.", "172.26.", "172.27.",
    "172.28.", "172.29.", "172.30.", "172.31.",  // 172.16.0.0/12 私有地址
    "192.168.",      // 192.168.0.0/16 私有地址
    "127.",          // 环回地址
    "0.",            // 0.0.0.0
    "localhost",
    "169.254.",      // 链路本地地址 (AWS 元数据等)
    "224.", "225.", "226.", "227.", "228.", "229.",
    "230.", "231.", "232.", "233.", "234.", "235.",
    "236.", "237.", "238.", "239."  // 多播地址
);

// ========== IP 校验方法 ==========
private boolean isBlockedIp(String host) {
    String lowerHost = host.toLowerCase();
    if ("localhost".equals(lowerHost) || "127.0.0.1".equals(lowerHost)) {
        return true;
    }
    for (String prefix : BLOCKED_IP_PREFIXES) {
        if (lowerHost.startsWith(prefix)) {
            return true;
        }
    }
    return false;
}

// ========== URL 校验方法 ==========
private boolean isValidUrl(String url) {
    if (url == null || url.isBlank()) {
        return false;
    }
    // 只允许 http 和 https 协议
    return url.toLowerCase().startsWith("http://") || url.toLowerCase().startsWith("https://");
}

// ========== 端口扫描方法添加校验 ==========
@GetMapping("/port-scan")
public Result<?> portScan(@RequestParam String host,
                          @RequestParam(defaultValue = "80,443,22,21,25,53,110,143,3306,3389,5432,6379,8080,8443,27017") String ports) {
    // 添加校验: 检查是否为内网 IP
    if (isBlockedIp(host)) {
        return Result.error(400, "不支持扫描内网/保留地址");
    }

    try {
        // 解析端口列表
        String[] portList = ports.split(",");
        List<Map<String, Object>> results = new ArrayList<>();

        for (String portStr : portList) {
            try {
                int port = Integer.parseInt(portStr.trim());
                // 限制端口范围 (1-65535)
                if (port < 1 || port > 65535) {
                    continue;
                }
                boolean isOpen = checkPort(host, port);
                // ... 其余代码保持不变
            } catch (NumberFormatException e) {
                // 跳过无效端口
            }
        }
        // ...
    } catch (Exception e) {
        return Result.error(500, "端口扫描失败");
    }
}

// ========== HTTP 头获取添加校验 ==========
@GetMapping("/http-headers")
public Result<?> getHttpHeaders(@RequestParam String url) {
    // 添加校验: 检查 URL 是否有效
    if (!isValidUrl(url)) {
        return Result.error(400, "只支持 HTTP(S) 协议");
    }

    try {
        RestTemplate template = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        HttpEntity<String> entity = new HttpEntity<>(headers);
        // ... 其余代码保持不变
    } catch (Exception e) {
        return Result.error(500, "获取 HTTP 头失败");
    }
}

// ========== CORS 测试添加校验 ==========
@GetMapping("/cors-test")
public Result<?> corsTest(@RequestParam String url,
                          @RequestParam(defaultValue = "https://example.com") String origin) {
    // 添加校验: 检查 URL 是否有效
    if (!isValidUrl(url)) {
        return Result.error(400, "只支持 HTTP(S) 协议");
    }
    if (!isValidUrl(origin)) {
        return Result.error(400, "origin 参数只支持 HTTP(S) 协议");
    }

    try {
        // ... 其余代码保持不变
    } catch (Exception e) {
        return Result.error(500, "CORS 测试失败");
    }
}
```

---

### 1.3 FriendLinkController 缺少权限校验

**文件**: `src/main/java/com/aston/blog/Controller/FriendLinkController.java`
**行数**: 44-50 (GET /friends), 53-60 (PUT /friends/{id}/status)
**严重级别**: CRITICAL

#### 问题描述

获取待审核友链列表和审核友链接口**只需要携带 Authorization header 即可访问**，没有验证用户是否为 ADMIN 角色。任何已登录用户都可以查看待审核的友链申请，或者批准/拒绝友链。

#### 漏洞代码

```java
// 第 44-50 行 - 获取待审核列表
@GetMapping("/friends")
public Result<List<FriendLinkVO>> getPending(
        @RequestParam(required = false) String status,
        @RequestHeader("Authorization") String token) {  // ❌ 只检查了 token 是否存在
    // 应该验证用户角色是否为 ADMIN
    return Result.success(friendService.getPendingFriendLinks());
}

// 第 53-60 行 - 审核友链
@PutMapping("/friends/{id}/status")
public Result<?> approve(
        @PathVariable String id,
        @Valid @RequestBody ApproveFriendLinkDTO dto,
        @RequestHeader("Authorization") String token) {  // ❌ 只检查了 token 是否存在
    // 应该验证用户角色是否为 ADMIN
    friendService.approve(id, dto);
    return Result.success(null);
}
```

#### 可用 Payload

```bash
# 任何已登录用户都可以获取待审核友链列表
curl -X GET "http://blog.com/api/friends" \
  -H "Authorization: Bearer <USER_TOKEN>"

# 任何已登录用户都可以批准友链
curl -X PUT "http://blog.com/api/friends/123/status" \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

# 任何已登录用户都可以拒绝友链
curl -X PUT "http://blog.com/api/friends/123/status" \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"rejected"}'
```

#### 修复方案

**修改文件**: `src/main/java/com/aston/blog/Controller/FriendLinkController.java`

方案一: 在 Controller 层添加权限检查

```java
import com.aston.blog.common.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api")
public class FriendLinkController {

    private final FriendLinkService friendService;
    private final JwtUtil jwtUtil;

    public FriendLinkController(FriendLinkService friendService, JwtUtil jwtUtil) {
        this.friendService = friendService;
        this.jwtUtil = jwtUtil;
    }

    // ========== 获取待审核列表 - 需要 ADMIN 权限 ==========
    @GetMapping("/friends")
    public Result<List<FriendLinkVO>> getPending(
            @RequestParam(required = false) String status,
            @RequestHeader("Authorization") String token) {
        // 修复: 检查用户角色
        String role = extractRoleFromToken(token);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限访问，需要管理员权限");
        }
        return Result.success(friendService.getPendingFriendLinks());
    }

    // ========== 审核友链 - 需要 ADMIN 权限 ==========
    @PutMapping("/friends/{id}/status")
    public Result<?> approve(
            @PathVariable String id,
            @Valid @RequestBody ApproveFriendLinkDTO dto,
            @RequestHeader("Authorization") String token) {
        // 修复: 检查用户角色
        String role = extractRoleFromToken(token);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限访问，需要管理员权限");
        }
        friendService.approve(id, dto);
        return Result.success(null);
    }

    // ========== 辅助方法: 从 Token 提取角色 ==========
    private String extractRoleFromToken(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return null;
        }
        try {
            String actualToken = token.substring(7);
            return jwtUtil.extractRole(actualToken);
        } catch (Exception e) {
            return null;
        }
    }
}
```

方案二: 使用 Spring Security 的方法级安全注解 (推荐)

```java
// 首先在 SecurityConfig 中启用方法安全
// @EnableMethodSecurity  // 添加到 SecurityConfig 类上

// 然后在 Controller 方法上添加权限注解
@GetMapping("/friends")
@PreAuthorize("hasRole('ADMIN')")
public Result<List<FriendLinkVO>> getPending(...) {
    return Result.success(friendService.getPendingFriendLinks());
}

@PutMapping("/friends/{id}/status")
@PreAuthorize("hasRole('ADMIN')")
public Result<?> approve(...) {
    friendService.approve(id, dto);
    return Result.success(null);
}
```

---

### 1.4 硬编码密钥问题

**文件**:
- `src/main/resources/application.properties` (第 6-7, 16-19 行)
- `src/main/java/com/aston/blog/common/JwtUtil.java` (第 20 行)
**严重级别**: CRITICAL

#### 问题描述

数据库密码、邮件密码和 JWT 密钥都使用了硬编码的默认值。如果环境变量未设置，应用将使用这些默认凭据，存在严重安全风险。

#### 漏洞代码

```properties
# src/main/resources/application.properties

# 第 6-7 行 - 数据库凭据有默认值
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:root}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:root}
#                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 默认值是 root

# 第 16-19 行 - 邮件凭据有默认值
spring.mail.username=${MAIL_USERNAME:3223957215@qq.com}
spring.mail.password=${MAIL_PASSWORD:<环境变量注入>}
#                                   ^^^^^^^^^^^^^^^^^^^^^^^^^ 默认值是实际可用的授权码
```

```java
// src/main/java/com/aston/blog/common/JwtUtil.java 第 20 行
@Value("${jwt.secret:defaultSecretKeyForDevelopmentOnly123456}")
private String jwtSecret;
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 默认 JWT 密钥
```

#### 可用 Payload

无直接 Payload，但攻击者如果能读取源代码或通过其他途径获取这些凭据，可以：
- 访问数据库，读取/修改所有数据
- 使用邮件账号发送钓鱼邮件
- 伪造任意用户的 JWT token

#### 修复方案

**修改文件**: `src/main/resources/application.properties`

```properties
# ========== 数据库配置 - 移除默认值 ==========
# 生产环境必须通过环境变量设置
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}

# ========== 邮件配置 - 移除默认值 ==========
spring.mail.host=${MAIL_HOST}
spring.mail.port=${MAIL_PORT}
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}

# ========== JWT 配置 - 移除默认值 ==========
jwt.secret=${JWT_SECRET}
```

**修改文件**: `src/main/java/com/aston/blog/common/JwtUtil.java`

```java
// 移除默认值，并添加启动时校验
@Value("${jwt.secret}")
private String jwtSecret;

// 添加构造方法或 @PostConstruct 来验证密钥长度
@PostConstruct
public void validateSecret() {
    // JWT HMAC 密钥至少需要 32 字节 (256 位) 以保证安全性
    if (jwtSecret == null || jwtSecret.length() < 32) {
        throw new IllegalStateException("JWT secret must be at least 32 characters long for security");
    }
}
```

**创建 `.env.example` 文件** (供部署参考，不包含实际凭据):

```bash
# 数据库配置
SPRING_DATASOURCE_URL=jdbc:mysql://your-db-host:3306/myblog
SPRING_DATASOURCE_USERNAME=your_db_user
SPRING_DATASOURCE_PASSWORD=your_secure_password

# 邮件配置
MAIL_HOST=smtp.qq.com
MAIL_PORT=587
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-email-password-or-auth-code

# JWT 密钥 (至少 32 字符)
JWT_SECRET=your-very-long-and-secure-jwt-secret-key-min-32-chars
```

---

## 高危漏洞 (High)

---

### 2.1 TerminalService.canEdit 权限过松

**文件**: `src/main/java/com/aston/blog/Service/impl/TerminalServiceImpl.java`
**行数**: 215-217
**严重级别**: HIGH

#### 问题描述

`canEdit()` 方法只检查用户 ID 是否存在，**任何已登录用户都可以编辑任意文章**。这应该只允许文章作者或管理员操作。

#### 漏洞代码

```java
// 第 215-217 行
@Override
public boolean canEdit(String userId) {
    return userId != null && !userId.isEmpty();  // ❌ 只检查是否登录，未检查权限
}
```

#### 可用 Payload

```bash
# 任何登录用户都可以保存/更新文章内容
curl -X POST "http://blog.com/api/terminal/save" \
  -H "Authorization: Bearer <ANY_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"postId":"1","content":"malicious content"}'
```

#### 修复方案

**修改文件**: `src/main/java/com/aston/blog/Service/impl/TerminalServiceImpl.java`

```java
import com.aston.blog.entity.User;
import com.aston.blog.repository.UserRepository;

@Service
public class TerminalServiceImpl implements TerminalService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;  // 注入 UserRepository

    public TerminalServiceImpl(PostRepository postRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    // ... 其余代码保持不变 ...

    @Override
    public boolean canEdit(String userId) {
        if (userId == null || userId.isEmpty()) {
            return false;
        }
        // 修复: 查询用户并检查角色
        return userRepository.findById(userId)
            .map(user -> "ADMIN".equals(user.getRole()) || "AUTHOR".equals(user.getRole()))
            .orElse(false);
    }
}
```

---

### 2.2 CORS 配置问题

**文件**: `frontend/next.config.ts`
**行数**: 22-27, 31-36
**严重级别**: HIGH

#### 问题描述

Next.js 代理配置中设置了 `Access-Control-Allow-Origin: *` 与 `Access-Control-Allow-Credentials: true` 共用。浏览器规范禁止这种组合，导致凭证设置无效，且存在安全风险。

#### 漏洞代码

```typescript
// next.config.ts 第 22-27 行
{
    source: "/api/:path*",
    headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },  // ❌ 通配符
        { key: "Access-Control-Allow-Credentials", value: "true" },  // ❌ 与 * 冲突
        // ...
    ],
}
```

#### 修复方案

**已修复** - 文件: `frontend/next.config.ts`

```typescript
async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          // 修复: 使用环境变量指定具体域名
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGIN || "http://localhost:3000" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGIN || "http://localhost:3000" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
        ],
      },
    ];
  },
```

---

### 2.3 后端 CORS 生产 IP 硬编码

**文件**: `src/main/java/com/aston/blog/config/SecurityConfig.java`
**行数**: 57-62
**严重级别**: HIGH

#### 问题描述

后端 CORS 配置中硬编码了生产服务器 IP 地址 `47.242.21.40`，不方便维护，且 IP 地址暴露在代码中。

#### 漏洞代码

```java
// SecurityConfig.java 第 57-62 行
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(java.util.List.of(
        "http://localhost:3000",
        "http://47.242.21.40",           // ❌ 硬编码生产 IP
        "http://47.242.21.40:8080"));     // ❌ 硬编码生产 IP
    // ...
}
```

#### 修复方案

**修改文件**: `src/main/java/com/aston/blog/config/SecurityConfig.java`

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    // 修复: 从环境变量读取允许的源
    String allowedOrigins = System.getenv().getOrDefault("CORS_ALLOWED_ORIGINS",
        "http://localhost:3000");

    // 支持多个域名，用逗号分隔
    java.util.List<String> originsList = java.util.Arrays.asList(
        allowedOrigins.split(",")
    );
    configuration.setAllowedOrigins(originsList);

    configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
    configuration.setAllowedHeaders(java.util.List.of("*"));
    configuration.setAllowCredentials(true);

    org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

**环境变量配置**:
```bash
# 生产环境
CORS_ALLOWED_ORIGINS=http://47.242.21.40,https://your-domain.com
```

---

## 中危漏洞 (Medium)

---

### 3.1 密码强度不足

**文件**: `src/main/java/com/aston/blog/dto/RegisterDTO.java`
**行数**: 17-19
**严重级别**: MEDIUM

#### 问题描述

注册时密码只验证最小长度为 6 位，没有复杂度要求。用户可以注册如 `123456`、`aaaaaa` 等弱密码。

#### 漏洞代码

```java
// RegisterDTO.java 第 17-19 行
@NotBlank(message = "密码不能为空,不要黑我！球球了")
@Size(min = 6, max = 50, message = "密码长度至少 6 位")
private String password;  // ❌ 允许 123456 等弱密码
```

#### 可用 Payload

```bash
# 注册使用弱密码
curl -X POST "http://blog.com/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"attacker",
    "email":"attacker@example.com",
    "password":"123456",
    "code":"123456"
  }'
```

#### 修复方案

**修改文件**: `src/main/java/com/aston/blog/dto/RegisterDTO.java`

```java
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;  // 新增
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterDTO {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 20, message = "用户名长度 3-20 位")
    private String username;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "密码不能为空")
    @Size(min = 8, max = 50, message = "密码长度 8-50 位")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
        message = "密码必须包含大小写字母、数字和特殊字符"
    )
    private String password;

    @NotBlank(message = "验证码不能为空")
    @Size(min = 6, max = 6, message = "验证码为6位")
    private String code;
}
```

**前端也需要添加校验** (可选):
```typescript
// frontend/app/api/auth/register/route.ts
const passwordSchema = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
if (!passwordSchema.test(password)) {
    return NextResponse.json(
        { error: "密码必须包含大小写字母、数字和特殊字符" },
        { status: 400 }
    );
}
```

---

### 3.2 DTO 输入校验不完整

**文件**: `src/main/java/com/aston/blog/dto/ApplyFriendLinkDTO.java`
**行数**: 7-15
**严重级别**: MEDIUM

#### 问题描述

友链申请 DTO 的 URL 和 Email 字段缺少格式校验，可能导致无效数据入库。

#### 漏洞代码

```java
// ApplyFriendLinkDTO.java
@Data
public class ApplyFriendLinkDTO {
    @NotBlank(message = "名称不能为空")
    private String name;

    @NotBlank(message = "链接不能为空")
    private String url;  // ❌ 没有 URL 格式校验
    private String description;
    private String avatar;

    private String email;  // ❌ 没有 Email 格式校验
}
```

#### 可用 Payload

```bash
# 提交无效 URL
curl -X POST "http://blog.com/api/friends/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Evil Site",
    "url":"not-a-valid-url",
    "email":"not-an-email"
  }'
```

#### 修复方案

**修改文件**: `src/main/java/com/aston/blog/dto/ApplyFriendLinkDTO.java`

```java
import jakarta.validation.constraints.Email;  // 新增
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;  // 新增
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ApplyFriendLinkDTO {
    @NotBlank(message = "名称不能为空")
    @Size(max = 100, message = "名称最大 100 字符")
    private String name;

    @NotBlank(message = "链接不能为空")
    @Pattern(
        regexp = "^https?://[\\w\\-]+(\\.[\\w\\-]+)+[/#?]?.*$",
        message = "请输入有效的 URL (以 http:// 或 https:// 开头)"
    )
    private String url;

    @Size(max = 500, message = "描述最大 500 字符")
    private String description;

    @Pattern(
        regexp = "^https?://.*$",
        message = "头像 URL 必须以 http:// 或 https:// 开头"
    )
    private String avatar;

    @Email(message = "邮箱格式不正确")
    private String email;
}
```

---

## 前端已修复漏洞

### JWT Token 存储在 localStorage (XSS 风险)

**严重级别**: CRITICAL
**状态**: 已修复
**修复文件**: `frontend/components/auth-context.tsx`, `frontend/lib/token.ts`

#### 问题描述

前端将 JWT token 存储在 localStorage 中，容易受到 XSS 攻击。如果攻击者能在页面中注入 JavaScript 代码，即可读取 token 并冒充用户。

#### 修复方案

**修改文件**: `frontend/components/auth-context.tsx`

所有 `localStorage.getItem("token")` 改为从 httpOnly cookie 读取：

```typescript
// 修复前
const token = localStorage.getItem("token");

// 修复后
const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
```

**新增文件**: `frontend/lib/token.ts`

```typescript
/**
 * Token 管理工具
 * 统一管理从 httpOnly cookie 获取 token，避免 localStorage XSS 风险
 */

const TOKEN_COOKIE_NAME = 'auth_token';

/**
 * 从 cookie 获取 token
 */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${TOKEN_COOKIE_NAME}=`));
  return match ? match.split('=')[1] : null;
}

/**
 * 清除 token cookie
 */
export function clearToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
```

**修改文件**: `frontend/next.config.ts`

```typescript
// 修复 CORS 配置，不再使用通配符 *
async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGIN || "http://localhost:3000" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
```

---

## 漏洞 Payload 总结

### SQL 注入

| Payload | 目标接口 | 说明 |
|---------|----------|------|
| `?q=1' OR 1=1--` | `/api/posts/search` | 绕过认证 |
| `?q=1' UNION SELECT * FROM users--` | `/api/posts/search` | 读取用户表 |
| `?postId=1' OR 1=1--` | `/api/comments` | 读取所有评论 |

### XSS

| Payload | 目标接口 | 说明 |
|---------|----------|------|
| `<script>alert(1)</script>` | `/api/posts/search` | 执行 JS |
| `<img src=x onerror=alert(1)>` | 评论功能 | 存储型 XSS |
| `javascript:alert(1)` | URL 参数 | 链接注入 |

### 路径穿越

| Payload | 目标接口 | 说明 |
|---------|----------|------|
| `../../../etc/passwd` | 文件上传/下载 | 读取系统文件 |
| `..%2F..%2F..%2Fetc%2Fpasswd` | 任意文件接口 | URL 编码绕过 |

### 命令注入

| Payload | 目标接口 | 说明 |
|---------|----------|------|
| `; cat /etc/passwd` | DNS 查询参数 | 执行系统命令 |
| `\| ls -la` | 任意参数 | 管道注入 |
| `&& whoami` | 查询参数 | 链式命令 |

### SSRF

| Payload | 目标接口 | 说明 |
|---------|----------|------|
| `?host=192.168.1.1&ports=3306` | `/api/tools/port-scan` | 扫描内网 |
| `?host=127.0.0.1&ports=6379` | `/api/tools/port-scan` | 探测本地服务 |
| `?url=http://169.254.169.254/` | `/api/tools/http-headers` | 云元数据 |

---

## 修复清单

| # | 漏洞 | 文件 | 严重级别 | 状态 |
|---|------|------|----------|------|
| 1 | SecurityInterceptor 只检测不拦截 | `config/SecurityInterceptor.java` | Critical | 待修复 |
| 2 | SSRF 漏洞 | `Controller/SecurityToolsController.java` | Critical | 待修复 |
| 3 | FriendLinkController 缺少权限校验 | `Controller/FriendLinkController.java` | Critical | 待修复 |
| 4 | 硬编码密钥 | `application.properties` | Critical | 待修复 |
| 5 | TerminalService.canEdit 权限过松 | `Service/impl/TerminalServiceImpl.java` | High | 待修复 |
| 6 | CORS 通配符配置 | `frontend/next.config.ts` | High | 已修复 |
| 7 | 后端 CORS IP 硬编码 | `config/SecurityConfig.java` | High | 待修复 |
| 8 | JWT Token 存储在 localStorage | `frontend/components/auth-context.tsx` | Critical | 已修复 |
| 9 | 密码强度不足 | `dto/RegisterDTO.java` | Medium | 待修复 |
| 10 | DTO 校验不完整 | `dto/ApplyFriendLinkDTO.java` | Medium | 待修复 |

---

*报告生成时间: 2026-05-01*