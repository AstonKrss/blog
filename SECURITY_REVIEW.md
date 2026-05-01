# 博客系统安全漏洞报告

> 生成时间: 2026-04-30
> 项目: Aston Blog (Spring Boot 4.0 + Java 17)
> 审核范围: 后端 Java 代码安全

---

## 🔴 高危漏洞

### 1. SSRF 漏洞 - SecurityToolsController

**文件位置**: `src/main/java/com/aston/blog/Controller/SecurityToolsController.java`

**漏洞类型**: Server-Side Request Forgery (服务端请求伪造)

**问题代码**:

```java
// 端口扫描允许扫描任意主机，包括内网
@GetMapping("/port-scan")
public Result<?> portScan(@RequestParam String host, ...) {
    for (String portStr : portList) {
        checkPort(host, port);  // 攻击者可指定任意IP
    }
}

// HTTP头获取可访问任意URL
@GetMapping("/http-headers")
public Result<?> getHttpHeaders(@RequestParam String url) {
    template.exchange(url, HttpMethod.GET, entity, String.class);
}
```

**攻击场景**:
- 攻击者指定 `host=192.168.1.1` 扫描内网
- 攻击者指定 `url=http://localhost:6379/` 探测内网 Redis
- 攻击者指定 `url=file:///etc/passwd` 尝试读取本地文件

**修复建议**:
```java
// 1. 禁止内网IP段
private static final Set<String> BLOCKED_IP_PREFIXES = Set.of(
    "10.", "192.168.", "172.16.", "172.17.", "172.18.",
    "172.19.", "172.20.", "172.21.", "172.22.", "172.23.",
    "172.24.", "172.25.", "172.26.", "172.27.", "172.28.",
    "172.29.", "172.30.", "172.31.", "127.", "0."
);

private boolean isBlockedIp(String host) {
    for (String prefix : BLOCKED_IP_PREFIXES) {
        if (host.startsWith(prefix)) return true;
    }
    return false;
}

// 2. 禁止非HTTP(S)协议
if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new RuntimeException("只支持HTTP(S)协议");
}
```

---

### 2. JWT 默认密钥硬编码

**文件位置**: `src/main/java/com/aston/blog/common/JwtUtil.java`

**问题代码**:

```java
@Value("${jwt.secret:defaultSecretKeyForDevelopmentOnly123456}")
private String jwtSecret;
```

**风险说明**:
- 如果配置文件中 `jwt.secret` 未设置或为空字符串，JWT 使用默认密钥
- 攻击者可使用该默认密钥伪造任意用户的 token
- 生产环境必须设置强随机密钥

**修复建议**:
```java
@Value("${jwt.secret}")
private String jwtSecret;

// 应用启动时校验
@PostConstruct
public void validateSecret() {
    if (jwtSecret == null || jwtSecret.isEmpty()) {
        throw new IllegalStateException("JWT secret must be configured");
    }
    if (jwtSecret.length() < 32) {
        throw new IllegalStateException("JWT secret must be at least 32 characters");
    }
}
```

---

### 3. SecurityInterceptor 检测但不拦截

**文件位置**: `src/main/java/com/aston/blog/config/SecurityInterceptor.java`

**问题代码**:

```java
// 检测到攻击后 return true 放行
for (Pattern pattern : SQL_PATTERNS) {
    if (pattern.matcher(fullPayload).find()) {
        attackLogService.recordAttack(...);  // 只记录日志
        return true;  // ⚠️ 攻击请求继续执行！
    }
}
```

**风险说明**:
- 检测到 XSS、SQL注入、命令注入等攻击后，只是记录日志
- 请求被允许继续执行，攻击生效

**修复建议**:
```java
// 方案1: 直接返回403
if (pattern.matcher(fullPayload).find()) {
    attackLogService.recordAttack(...);
    response.setStatus(403);
    response.getWriter().write("{\"code\":403,\"message\":\"请求被拦截\"}");
    return false;  // 拦截请求
}

// 方案2: 抛异常由全局异常处理器处理
if (pattern.matcher(fullPayload).find()) {
    attackLogService.recordAttack(...);
    throw new SecurityException("检测到恶意请求: " + attackType);
}
```

---

## 🟠 中危漏洞

### 4. 邮件密码硬编码默认值

**文件位置**: `src/main/resources/application.properties`

**问题配置**:

```properties
spring.mail.password=${MAIL_PASSWORD:wsukckbbexiccifh}
```

**风险说明**:
- 邮箱密码以默认值形式存在于代码仓库
- 如果代码泄露，邮箱账号可能被滥用

**修复建议**:
```properties
# 必须设置环境变量，不提供默认值
spring.mail.password=${MAIL_PASSWORD}
```

---

### 5. 弱密码检测只记录不阻止

**文件位置**: `src/main/java/com/aston/blog/Controller/AuthController.java`

**问题代码**:

```java
if (isWeakPassword(password)) {
    attackLogService.recordAttack(...);  // 只记录
    // ⚠️ 继续执行，返回 401，但没有阻止注册流程
}
```

**风险说明**:
- 攻击者可以使用弱密码进行暴力破解
- 登录时检测弱密码没有实际防护意义

**修复建议**:
```java
// 注册时强制密码强度校验
@PostMapping("/register")
public Result<LoginVO> register(@Valid @RequestBody RegisterDTO dto) {
    if (!isPasswordStrong(dto.getPassword())) {
        return Result.error(400, "密码强度不足，请包含大小写字母、数字和特殊字符");
    }
    // ...
}

private boolean isPasswordStrong(String password) {
    if (password == null || password.length() < 8) return false;
    if (!password.matches(".*[A-Z].*")) return false;
    if (!password.matches(".*[a-z].*")) return false;
    if (!password.matches(".*\\d.*")) return false;
    if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*")) return false;
    return true;
}
```

---

### 6. 缺少全局异常处理器

**问题说明**:
- 未配置 `@ControllerAdvice` 全局异常处理
- 运行时异常会返回完整堆栈信息给前端
- 可能泄露内部代码结构和配置信息

**修复建议**:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public Result<?> handleRuntimeException(RuntimeException e) {
        // 记录日志但不返回堆栈
        log.error("业务异常: {}", e.getMessage());
        return Result.error(400, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.error(500, "系统内部错误");
    }
}
```

---

## 🟡 低危漏洞

### 7. CORS 配置硬编码生产IP

**文件位置**: `src/main/java/com/aston/blog/config/SecurityConfig.java`

**问题代码**:

```java
configuration.setAllowedOrigins(java.util.List.of(
    "http://localhost:3000",
    "http://47.242.21.40",           // 生产IP暴露
    "http://47.242.21.40:8080"));
```

**修复建议**:
```java
// 使用环境变量
configuration.setAllowedOrigins(
    Arrays.asList(
        "http://localhost:3000",
        System.getenv().getOrDefault("CORS_ALLOWED_ORIGIN", "")
    ).stream().filter(s -> !s.isEmpty()).toList()
);
```

---

### 8. 内存存储封禁IP

**文件位置**: `src/main/java/com/aston/blog/Service/impl/AttackLogServiceImpl.java`

**问题代码**:

```java
private final Map<String, LocalDateTime> blockedIps = new ConcurrentHashMap<>();
```

**问题说明**:
- 服务重启后所有封禁记录丢失
- 分布式部署时各节点封禁不共享

**修复建议**:
```java
// 使用数据库持久化
public void blockIp(String ip) {
    AttackBlock block = new AttackBlock();
    block.setIp(ip);
    block.setBlockedUntil(LocalDateTime.now().plusMinutes(WINDOW_MINUTES));
    blockRepository.save(block);
}
```

---

### 9. CSRF 保护已禁用

**文件位置**: `src/main/java/com/aston/blog/config/SecurityConfig.java`

**问题代码**:

```java
.csrf(csrf -> csrf.disable())
```

**风险说明**:
- 对 API 服务通常可接受，但需确保其他防护到位
- 配合 JWT 使用时，确保 token 存储安全

---

## 📋 修复优先级

| 优先级 | 漏洞 | 工作量 |
|--------|------|--------|
| P0 | SecurityInterceptor 不拦截 | 5分钟 |
| P0 | SSRF 防护 | 30分钟 |
| P0 | JWT 默认密钥移除 | 5分钟 |
| P1 | 全局异常处理器 | 20分钟 |
| P1 | 邮件密码默认值移除 | 5分钟 |
| P1 | 注册密码强度校验 | 15分钟 |
| P2 | CORS 配置环境变量化 | 10分钟 |
| P2 | 封禁IP持久化 | 30分钟 |

---

## ✅ 安全做得好的地方

1. **密码加密**: 使用 BCrypt
2. **JWT 认证**: 有过期时间验证
3. **暴力破解防护**: 有登录失败计数和封禁机制
4. **攻击日志记录**: 完整记录攻击行为
5. **文章权限控制**: 只有作者能修改自己的文章
6. **越权检查**: deletePost 有 role 校验
