# Code Review 安全与功能有效性检查报告

检查时间：2026-05-22  
项目：Aston's Blog  
范围：Spring Boot 后端、Next.js 前端、FastAPI 安全工具、Docker/CI 配置

## 结论

当前项目能编译和构建通过：

```bash
mvn -q -DskipTests compile
cd frontend && npm run build
```

但是“能构建”不等于“安全和功能都有效”。本次 review 发现几个需要优先处理的问题：

- P0：后端全局 `permitAll`，部分管理接口完全没有权限校验。
- P0：安全拦截器只记录攻击，不拦截攻击。
- P0：安全工具接口存在 SSRF / 内网探测风险。
- P0：生产密钥、数据库密码、邮箱授权码出现在 `compose.yaml`。
- P1：配置文档和实际配置不一致，DDL 和 Java 版本容易导致部署/数据风险。
- P1：认证 token 同时放进 sessionStorage，削弱了 httpOnly cookie 的价值。
- P1：部分前端 API 代理读取 token 的方式在服务端无效，功能会不稳定。
- P1：文件上传校验不一致，相册上传接口可接受非图片文件。

下面按严重度列出具体问题和修改建议。

---

## P0 阻塞级问题

### 1. 全局 `permitAll` 导致认证边界失效

位置：

- `src/main/java/com/aston/blog/config/SecurityConfig.java:46`
- `src/main/java/com/aston/blog/config/SecurityConfig.java:49`

问题：

```java
.csrf(csrf -> csrf.disable())
.authorizeHttpRequests(authz -> authz
        .anyRequest().permitAll())
```

这会让 Spring Security 对所有请求放行。项目现在依赖每个 Controller 自己检查 `SecurityContext`，但已经有多个接口漏了检查，因此管理能力可以被未授权访问。

已经发现的直接风险：

- `ProjectController` 的管理接口没有任何登录/管理员校验：
  - `src/main/java/com/aston/blog/Controller/ProjectController.java:37`
  - `src/main/java/com/aston/blog/Controller/ProjectController.java:43`
  - `src/main/java/com/aston/blog/Controller/ProjectController.java:49`
  - `src/main/java/com/aston/blog/Controller/ProjectController.java:55`
- `FriendLinkController` 只要求有 `Authorization` header，但没有验证 token 和管理员角色：
  - `src/main/java/com/aston/blog/Controller/FriendLinkController.java:44`
  - `src/main/java/com/aston/blog/Controller/FriendLinkController.java:53`

影响：

- 未登录用户可能创建、修改、删除项目。
- 未登录或伪造 header 的用户可能查看和审核友链。
- 之后新增接口时很容易继续漏校验。

建议修改：

1. 在 `SecurityConfig` 中定义统一访问规则。
2. 公共接口显式 `permitAll`。
3. 管理接口统一 `hasRole("ADMIN")`。
4. 作者接口统一 `hasAnyRole("ADMIN", "AUTHOR")`。

示例：

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(
                "/api/public/**",
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/send-code",
                "/uploads/**",
                "/health"
            ).permitAll()
            .requestMatchers(
                "/api/admin/**",
                "/api/settings",
                "/api/projects/**",
                "/api/photos/**",
                "/api/friends/**",
                "/api/analytics/**"
            ).hasRole("ADMIN")
            .requestMatchers(
                "/api/posts/**",
                "/api/notes/**",
                "/api/users/profile",
                "/api/users/password",
                "/api/upload/**",
                "/api/terminal/**"
            ).authenticated()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
}
```

同时建议把重复的 `getUserIdFromRequest()` / `getUserRole()` 抽成公共工具或直接使用 `@AuthenticationPrincipal` / `Authentication` 参数，减少漏写。

---

### 2. `SecurityInterceptor` 检测攻击但继续放行

位置：

- `src/main/java/com/aston/blog/config/SecurityInterceptor.java:153`
- `src/main/java/com/aston/blog/config/SecurityInterceptor.java:166`
- `src/main/java/com/aston/blog/config/SecurityInterceptor.java:176`
- `src/main/java/com/aston/blog/config/SecurityInterceptor.java:186`
- `src/main/java/com/aston/blog/config/SecurityInterceptor.java:196`
- `src/main/java/com/aston/blog/config/SecurityInterceptor.java:206`
- `src/main/java/com/aston/blog/config/SecurityInterceptor.java:215`

问题：

检测到扫描器、XSS、SQL 注入、路径穿越、命令注入、敏感文件访问后，代码调用了 `recordAttack()` / `recordThreat()`，但马上 `return true`。

影响：

- 攻击请求会继续进入 Controller。
- 日志系统只能“看见攻击”，不能“阻止攻击”。
- 这和 `SECURITY_REVIEW.md` 中已有高危结论一致。

建议修改：

把攻击命中后的返回改成统一阻断：

```java
private boolean blockRequest(
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

    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
    response.setContentType("application/json;charset=UTF-8");
    response.getWriter().write("{\"code\":403,\"message\":\"请求被安全策略拦截\"}");
    return false;
}
```

然后所有命中处改为：

```java
return blockRequest(response, ip, path, method, matched, "XSS", userAgent, fullPayload);
```

注意：

- 可以先对 `/api/tools/**`、登录、评论等高风险入口启用阻断。
- 如果担心误报，先加灰度配置：`SECURITY_INTERCEPTOR_BLOCK=true`。

---

### 3. `SecurityToolsController` 存在 SSRF / 内网探测风险

位置：

- `src/main/java/com/aston/blog/Controller/SecurityToolsController.java:157`
- `src/main/java/com/aston/blog/Controller/SecurityToolsController.java:194`
- `src/main/java/com/aston/blog/Controller/SecurityToolsController.java:222`
- `src/main/java/com/aston/blog/Controller/SecurityToolsController.java:352`

问题：

这些接口允许用户传入任意 host / url：

- `/api/tools/port-scan?host=...`
- `/api/tools/http-headers?url=...`
- `/api/tools/cors-test?url=...`

`port-scan` 会直接 `Socket.connect(host, port)`，`http-headers` / `cors-test` 会用 `RestTemplate` 请求用户提供的 URL。

影响：

- 攻击者可以让你的服务器扫描内网地址，例如 `127.0.0.1`、`172.17.0.1`、`10.0.0.0/8`、`192.168.0.0/16`。
- 可以探测云服务器 metadata、数据库、Redis、Docker 网络等内网服务。
- 这类问题属于 SSRF，生产环境高危。

建议修改：

增加统一的目标校验：

```java
private void validatePublicTarget(String rawHostOrUrl) {
    URI uri = rawHostOrUrl.startsWith("http")
            ? URI.create(rawHostOrUrl)
            : URI.create("http://" + rawHostOrUrl);

    if (!List.of("http", "https").contains(uri.getScheme())) {
        throw new IllegalArgumentException("只允许 http/https 协议");
    }

    String host = uri.getHost();
    if (host == null || host.isBlank()) {
        throw new IllegalArgumentException("目标地址无效");
    }

    InetAddress address = InetAddress.getByName(host);
    if (address.isAnyLocalAddress()
            || address.isLoopbackAddress()
            || address.isLinkLocalAddress()
            || address.isSiteLocalAddress()
            || address.isMulticastAddress()) {
        throw new IllegalArgumentException("禁止访问内网或本机地址");
    }
}
```

还需要：

- 禁止重定向到内网地址。
- 限制端口白名单，例如只允许 `80`、`443`。
- 给所有外部请求设置连接和读取超时。
- 对这些接口要求登录，最好只允许 `ADMIN`。
- 记录审计日志，包括用户、目标、时间、结果。

---

### 4. 管理接口漏权限校验

位置：

- `src/main/java/com/aston/blog/Controller/ProjectController.java:37`
- `src/main/java/com/aston/blog/Controller/ProjectController.java:43`
- `src/main/java/com/aston/blog/Controller/ProjectController.java:49`
- `src/main/java/com/aston/blog/Controller/ProjectController.java:55`
- `src/main/java/com/aston/blog/Controller/FriendLinkController.java:44`
- `src/main/java/com/aston/blog/Controller/FriendLinkController.java:53`

问题：

`ProjectController` 注释写的是“管理员”，但代码没有检查管理员：

```java
@PostMapping("/projects")
public Result<ProjectVO> create(@Valid @RequestBody CreateProjectDTO dto) {
    return Result.success(service.create(dto));
}
```

`FriendLinkController` 接收 `Authorization` header，但没有解析和验证：

```java
@RequestHeader("Authorization") String token
// 这里应该验证管理员权限
```

影响：

- 项目管理和友链审核功能没有真正受保护。

建议修改：

短期：

```java
private boolean isAdmin() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getAuthorities() == null) return false;
    return auth.getAuthorities().stream()
            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
}
```

每个管理接口：

```java
if (!isAdmin()) {
    return Result.error(403, "无权限");
}
```

长期：

- 用 Spring Security 的 `requestMatchers(...).hasRole("ADMIN")` 统一做。
- 或启用方法级权限：`@EnableMethodSecurity` + `@PreAuthorize("hasRole('ADMIN')")`。

---

### 5. 生产密钥和密码明文出现在 `compose.yaml`

位置：

- `compose.yaml:8`
- `compose.yaml:11`
- `compose.yaml:44`
- `compose.yaml:50`
- `compose.yaml:99`

问题：

文件中包含：

- MySQL root 密码
- MySQL 应用用户密码
- JWT secret
- QQ 邮箱授权码

影响：

- 仓库泄露就等于生产凭据泄露。
- 邮箱可能被滥发邮件。
- JWT secret 泄露后可以伪造任意用户 token。

建议修改：

1. 立即轮换已经提交过的密码和邮箱授权码。
2. 改为从 `.env` 或服务器环境变量读取。
3. `.env` 只保留在服务器，不提交 Git。

示例：

```yaml
environment:
  MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
  MYSQL_DATABASE: ${MYSQL_DATABASE}
  MYSQL_USER: ${MYSQL_USER}
  MYSQL_PASSWORD: ${MYSQL_PASSWORD}
  JWT_SECRET: ${JWT_SECRET}
  MAIL_PASSWORD: ${MAIL_PASSWORD}
```

新增 `.env.example`：

```env
MYSQL_ROOT_PASSWORD=change-me
MYSQL_DATABASE=myblog
MYSQL_USER=bloguser
MYSQL_PASSWORD=change-me
JWT_SECRET=change-me-at-least-32-chars
MAIL_PASSWORD=change-me
```

---

## P1 高优先级问题

### 6. DDL 策略和项目说明不一致

位置：

- `src/main/resources/application.yml:22`
- `AGENTS.md` 中写的是 `ddl-auto=none`

当前配置：

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

问题：

文档说表结构不要依赖 Hibernate 自动建表，但实际会让 Hibernate 自动更新 schema。

影响：

- 生产环境可能被 Hibernate 自动改表。
- 部署时行为不可控，尤其是字段变更、索引、约束、枚举变化。
- 文档和真实行为不一致，会误导后续开发。

建议修改：

生产环境：

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: ${SPRING_JPA_HIBERNATE_DDL_AUTO:validate}
```

本地开发可用：

```env
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

更推荐引入 Flyway 或 Liquibase 管理数据库迁移：

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

---

### 7. Java 版本配置不一致

位置：

- `pom.xml:30`
- `Dockerfile.backend:1`
- `.github/workflows/build.yml` Java setup 使用 21

当前 `pom.xml`：

```xml
<java.version>17</java.version>
```

但 Docker 和 CI 用 Java 21。

影响：

- 本地、CI、容器编译目标不一致。
- 可能出现本地能跑、CI 行为不同，或使用 Java 21 API 后 Maven 仍按 17 编译失败。
- 项目说明写 Spring Boot 4.0 + Java 21，应统一。

建议修改：

```xml
<properties>
    <java.version>21</java.version>
</properties>
```

并确认 IDE、CI、Docker 全部使用 JDK 21。

---

### 8. JWT 默认密钥仍有开发兜底，生产可能误用弱密钥

位置：

- `src/main/java/com/aston/blog/common/JwtUtil.java`

当前逻辑：

```java
@Value("${jwt.secret:defaultSecretKeyForDevelopmentOnly123456}")
private String jwtSecret;
```

问题：

如果生产环境没有传 `JWT_SECRET` 或配置名映射失败，服务会使用默认密钥。

建议修改：

```java
@Value("${jwt.secret}")
private String jwtSecret;

@PostConstruct
public void validateSecret() {
    if (jwtSecret == null || jwtSecret.length() < 32) {
        throw new IllegalStateException("jwt.secret must be configured and at least 32 characters");
    }
    if ("defaultSecretKeyForDevelopmentOnly123456".equals(jwtSecret)) {
        throw new IllegalStateException("default jwt.secret is not allowed");
    }
}
```

同时在 `application.yml` 中使用：

```yaml
jwt:
  secret: ${JWT_SECRET}
  expiration: ${JWT_EXPIRATION:86400000}
```

---

### 9. httpOnly cookie 设计被 sessionStorage 降级

位置：

- `src/main/java/com/aston/blog/Controller/AuthController.java:50`
- `src/main/java/com/aston/blog/Controller/AuthController.java:66`
- `frontend/components/auth-context.tsx:42`
- `frontend/components/auth-context.tsx:85`
- `frontend/components/auth-context.tsx:112`
- `frontend/lib/token.ts:13`
- `frontend/lib/token.ts:24`

问题：

后端注释写了使用 httpOnly cookie 防 XSS，但登录后前端仍把 token 保存到 `sessionStorage`：

```ts
sessionStorage.setItem('auth_token', data.data.token);
```

同时前端试图从 `document.cookie` 读取 `auth_token`，但 httpOnly cookie 本来就不能被 JS 读取。

影响：

- XSS 一旦发生，可以直接读走 sessionStorage 里的 token。
- `document.cookie` 读取 httpOnly cookie 的逻辑不会生效。
- 认证逻辑在 cookie 和 sessionStorage 之间摇摆，增加不稳定性。

建议修改：

推荐方案：只使用 httpOnly cookie。

前端请求：

```ts
await fetch(`${API_BASE}/api/auth/me`, {
  credentials: "include",
});
```

后端 CORS 保持：

```java
configuration.setAllowCredentials(true);
```

删除：

- `sessionStorage.setItem('auth_token', ...)`
- `sessionStorage.getItem('auth_token')`
- 从 JS 读取 `document.cookie` 的 token 逻辑
- 响应体里的 token，或至少生产环境不返回 token

后端 cookie 建议：

```java
String cookieValue = TOKEN_COOKIE_NAME + "=" + token
    + "; Path=/"
    + "; Max-Age=" + TOKEN_COOKIE_MAX_AGE
    + "; HttpOnly"
    + "; SameSite=Lax";

if (isHttpsProduction()) {
    cookieValue += "; Secure";
}
```

---

### 10. Next.js Route Handler 中调用浏览器 token 工具，服务端拿不到 token

位置：

- `frontend/app/api/posts/route.ts:9`
- `frontend/app/api/posts/route.ts:27`
- `frontend/lib/token.ts:13`

问题：

`frontend/app/api/posts/route.ts` 是服务端 Route Handler，却调用了 `getToken()`。而 `getToken()` 中：

```ts
if (typeof document === 'undefined') return null;
```

所以服务端运行时永远拿不到 sessionStorage / document cookie。

影响：

- `/api/posts` 代理接口在没有 `request.cookies.get("auth_token")` 或显式 Authorization header 时会失败。
- 这类问题会表现为“页面直接调用后端能用，走 Next 代理就未登录”。

建议修改：

服务端 Route Handler 只从 `request.cookies` 或 `request.headers` 取 token：

```ts
const token =
  request.cookies.get("auth_token")?.value ||
  request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
```

不要在 `app/api/**` 中 import `@/lib/token`，因为它是浏览器环境工具。

---

### 11. 相册上传缺少文件类型校验

位置：

- `src/main/java/com/aston/blog/Controller/PhotoController.java:40`
- `src/main/java/com/aston/blog/Controller/PhotoController.java:52`
- `src/main/java/com/aston/blog/Controller/PhotoController.java:60`

问题：

`UploadController` 对图片上传做了 MIME、扩展名、图片解码校验；但 `PhotoController.uploadPhoto()` 没做，只用原始文件扩展名生成文件并保存。

影响：

- 管理员账号被盗或 CSRF/XSS 触发后，可上传非图片文件。
- 如果静态资源服务配置不当，可能带来内容嗅探或脚本执行风险。

建议修改：

复用 `UploadController` 的校验逻辑，至少检查：

- 文件大小
- 扩展名白名单
- MIME 白名单
- `ImageIO.read()` 能否解码为图片
- 保存文件名只使用服务器生成的 UUID

示例：

```java
String contentType = file.getContentType();
if (!Set.of("image/jpeg", "image/png", "image/webp", "image/gif").contains(contentType)) {
    return Result.error(400, "只允许上传图片");
}

BufferedImage image = ImageIO.read(file.getInputStream());
if (image == null) {
    return Result.error(400, "文件不是有效图片");
}
```

---

### 12. CI 健康检查引用了不存在的接口

位置：

- `.github/workflows/build.yml:84`
- `.github/workflows/build.yml:86`

当前检查：

```bash
curl -sf http://localhost:8080/api/public/health || echo "Backend health check failed"
curl -sf http://localhost:3000/api/public/health || echo "Frontend health check failed"
```

问题：

项目里没有看到 `/api/public/health` 对应的 Spring Controller 或 Next Route Handler。Python 有 `/health`。

影响：

- 部署脚本会一直打印失败，但不会中断，因为用了 `|| echo`。
- 健康检查没有真正保护发布质量。

建议修改：

后端增加：

```java
@RestController
public class HealthController {
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
```

CI 改成：

```bash
curl -sf http://localhost:8080/health
curl -sf http://localhost:8000/health
curl -sf http://localhost:80
```

并去掉 `|| echo`，让失败真正阻断部署：

```bash
curl -sf http://localhost:8080/health
```

---

## P2 中优先级问题

### 13. 密码强度策略偏弱

位置：

- `src/main/java/com/aston/blog/dto/RegisterDTO.java:18`
- `src/main/java/com/aston/blog/dto/ChangePasswordDTO.java:12`
- `src/main/java/com/aston/blog/Controller/AuthController.java:114`

问题：

注册和改密只要求 6 位。登录时有 `isWeakPassword()`，但只是记录弱密码攻击，不阻止注册或改密。

建议修改：

在 DTO 上使用更强的正则：

```java
@Size(min = 8, max = 72, message = "密码长度必须为 8-72 位")
@Pattern(
    regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
    message = "密码必须包含大小写字母、数字和特殊字符"
)
private String password;
```

BCrypt 通常只处理前 72 字节，建议 max 设为 72。

---

### 14. `UpdatePostDto` 限制文章内容最大 500 字，和 `Post.content LONGTEXT` 设计冲突

位置：

- `src/main/java/com/aston/blog/dto/UpdatePostDto.java:20`
- `src/main/java/com/aston/blog/entity/Post.java:25`

问题：

实体里文章内容是 `LONGTEXT`，但更新 DTO 限制 `content` 最大 500 字。创建 DTO 没有同样限制，导致“创建长文章可以，更新长文章失败”。

建议修改：

把更新 DTO 的内容限制改为更合理的值，例如：

```java
@Size(max = 200000, message = "文章内容过长")
private String content;
```

或者去掉 `@Size`，只在业务层限制上传体大小。

---

### 15. `Post.updatedAt` 使用了 `@CreationTimestamp`

位置：

- `src/main/java/com/aston/blog/entity/Post.java:52`

问题：

```java
@CreationTimestamp
@Column(name = "update_at")
private LocalDateTime updatedAt;
```

这会让更新时间只在创建时设置，不会在更新文章时自动刷新。

建议修改：

```java
@UpdateTimestamp
@Column(name = "updated_at")
private LocalDateTime updatedAt;
```

注意数据库字段现在是 `update_at`，建议统一为 `updated_at`。如果生产已有数据，必须通过迁移脚本处理。

---

### 16. API 文档和实际接口不一致

位置：

- `README.md:194`
- `frontend/app/dashboard/favorites/page.tsx:21`
- `frontend/app/dashboard/favorites/page.tsx:38`
- `frontend/app/rss/page.tsx:20`

问题：

前端引用了一些后端未看到的接口：

- `/api/favorites`
- `/api/posts/{postId}/favorite`
- `/rss.xml`

如果这些不是由其他反向代理或静态文件提供，相关页面功能会失败。

建议修改：

二选一：

1. 实现这些后端接口。
2. 删除或隐藏对应前端入口。

建议先跑一次接口清单对齐：

```bash
rg -n "fetch\\(" frontend/app frontend/components
rg -n "@GetMapping|@PostMapping|@PutMapping|@DeleteMapping" src/main/java/com/aston/blog/Controller
```

---

## 建议修复顺序

1. 立即轮换 `compose.yaml` 中出现过的生产凭据。
2. 修改 `SecurityConfig`，关闭全局 `permitAll`，统一保护管理接口。
3. 修复 `ProjectController` 和 `FriendLinkController` 的权限漏洞。
4. 修改 `SecurityInterceptor`：攻击命中后返回 403。
5. 给 `SecurityToolsController` 增加 SSRF 防护和管理员权限。
6. 统一 JWT 使用方式：只用 httpOnly cookie，删除 sessionStorage token。
7. 统一 Java 版本为 21。
8. 把生产 DDL 策略改成 `validate` 或 `none`，并引入迁移工具。
9. 修复上传校验、健康检查、DTO 限制和更新时间字段。
10. 对前端引用的接口做一次完整对账。

---

## 回归测试建议

后端至少补这些测试：

- 未登录访问 `/api/projects` POST/PUT/DELETE 返回 401。
- AUTHOR 访问 `/api/projects` POST/PUT/DELETE 返回 403。
- ADMIN 访问 `/api/projects` POST/PUT/DELETE 成功。
- 未登录或伪造 Authorization header 访问 `/api/friends` 返回 401/403。
- 恶意 query 命中 `SecurityInterceptor` 时返回 403。
- `/api/tools/port-scan?host=127.0.0.1` 返回 400/403。
- `/api/tools/http-headers?url=http://127.0.0.1:3306` 返回 400/403。
- 上传非图片到 `/api/photos/upload` 返回 400。

前端至少补这些验证：

- 登录后刷新页面仍能获取 `/api/auth/me`。
- 不依赖 `sessionStorage` 也能访问需要登录的页面。
- `/api/posts` Route Handler 能从 httpOnly cookie 转发认证。
- 管理员后台页面遇到 401/403 时跳转或显示无权限。

---

## 本次检查未直接修改业务代码

本文件只记录 review 结论和修复建议，没有直接修复代码。建议先处理 P0 项，再进入功能增强。
