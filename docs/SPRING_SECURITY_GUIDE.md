# Spring Security 与 JWT 学习指南

> 本文档整理了博客项目的安全架构，帮助你理解核心原理

## 目录

1. [请求处理流程](#1-请求处理流程)
2. [Filter Chain 过滤器链](#2-filter-chain-过滤器链)
3. [Spring Security 认证流程](#3-spring-security-认证流程)
4. [JWT 实现详解](#4-jwt-实现详解)
5. [注解的本质](#5-注解的本质)
6. [越权防护机制](#6-越权防护机制)
7. [常见注解一览](#7-常见注解一览)
8. [学习方法与资源](#8-学习方法与资源)

---

## 1. 请求处理流程

### 完整请求流程图

```
Browser 发送请求
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Tomcat / Undertow 服务器接收请求                          │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Spring Security Filter Chain (安全过滤器链)              │
│    ├── CorsFilter (处理跨域)                                 │
│    ├── JwtAuthenticationFilter (JWT 验证) ← 重点！           │
│    ├── SessionManagementFilter (会话管理)                   │
│    └── AuthorizationFilter (权限校验)                        │
└─────────────────────────────────────────────────────────────┘
      │ (通过)
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DispatcherServlet (前端控制器)                           │
│    负责根据 URL 分发请求到对应的 Controller                    │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. HandlerMapping (处理器映射)                               │
│    找到 @GetMapping / @PostMapping 对应的方法                 │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Controller (控制器) ← 你写的代码                          │
│    执行业务逻辑，返回结果                                     │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ViewResolver / HttpMessageConverter                      │
│    渲染视图 或 序列化为 JSON                                 │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
响应返回给浏览器
```

### 关键点

- **Filter 在 Controller 之前执行**
- 如果 Filter 拒绝请求，请求根本到不了 Controller
- Filter 链式执行，一个通过才到下一个

---

## 2. Filter Chain 过滤器链

### 什么是 Filter？

Filter 就像**安检门**，每个请求都必须经过所有安检：

```
请求 ──▶ 安检1 ──▶ 安检2 ──▶ 安检3 ──▶ ... ──▶ Controller ──▶ 响应
          │         │         │
          ▼         ▼         ▼
       跨域检查   JWT验证   权限检查
       
如果安检1 失败 → 直接拒绝，不往下走
```

### 实际代码示例

```java
// 1. 创建一个 Filter（继承 OncePerRequestFilter 保证只执行一次）
public class MyFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException {
        
        // 【前处理】请求到达 Controller 之前做的事
        String token = request.getHeader("Authorization");
        
        if (token == null || !token.startsWith("Bearer ")) {
            // 没有 token，拒绝访问
            response.setStatus(401);
            response.getWriter().write("没有登录");
            return;  // 重要！不调用 chain.doFilter() 请求就卡住了
        }
        
        // 验证 token...
        
        // 【放行】让请求继续往下走（到下一个 Filter 或 Controller）
        chain.doFilter(request, response);
        
        // 【后处理】响应返回之前做的事（一般很少用）
    }
}
```

```java
// 2. 注册到 Spring Security（告诉框架使用这个 Filter）
@Configuration
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .addFilterBefore(new MyFilter(), UsernamePasswordAuthenticationFilter.class)
            // ↑ 加在 UsernamePasswordAuthenticationFilter 之前
            
            // 或者
            .addFilterAfter(new MyFilter(), JwtAuthenticationFilter.class)
            // ↑ 加在某个 Filter 之后
        ;
        return http.build();
    }
}
```

### 博客项目中的 Filter

```java
// JwtAuthenticationFilter.java - 项目中的 JWT 过滤器

static class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException {
        
        // 1. 从请求头获取 token
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);  // 去掉 "Bearer " 前缀
            
            try {
                // 2. 解析 token 获取用户信息
                String username = jwtUtil.extractUsername(token);
                String userId = jwtUtil.extractUserId(token);
                String role = jwtUtil.extractRole(token);
                
                // 3. 验证 token 有效性
                if (username != null && jwtUtil.validateToken(token, username)) {
                    // 4. 创建权限列表
                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    
                    // 5. 把认证信息存入 SecurityContext（后续可以通过它获取用户）
                    UsernamePasswordAuthenticationToken authToken = 
                        new UsernamePasswordAuthenticationToken(
                            userId,    // principal：用户ID
                            token,     // credentials：令牌
                            authorities // authorities：权限列表
                        );
                    
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                // token 无效，清空上下文
                SecurityContextHolder.clearContext();
            }
        }
        
        // 6. 放行
        chain.doFilter(request, response);
    }
}
```

---

## 3. Spring Security 认证流程

### 完整认证流程

```
用户登录
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/auth/login                                        │
│ Body: { "username": "admin", "password": "123456" }          │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ AuthController.login()                                       │
│   1. 根据 username 查数据库获取密码                           │
│   2. 用 BCryptPasswordEncoder 比对密码                       │
│   3. 密码正确 → 调用 JwtUtil.generateToken() 生成 JWT        │
│   4. 返回 { token: "eyJhbGciOiJIUzI1NiJ9..." }              │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
浏览器存储 token
localStorage.setItem("token", response.data.token)
   │
   ▼
后续请求带上 token
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ JwtAuthenticationFilter                                      │
│   1. 读取 Header 中的 token                                 │
│   2. 验证签名和过期时间                                      │
│   3. 解析出 userId、role                                    │
│   4. 存入 SecurityContextHolder                             │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Controller.getUserIdFromRequest()                           │
│   从 SecurityContextHolder 获取 userId                       │
│   return "user-uuid-123"                                   │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Service.updatePost(id, dto, userId)                         │
│   检查 post.authorId == userId                              │
│   相等 → 更新成功                                           │
│   不等 → 抛出 "无权限"                                       │
└─────────────────────────────────────────────────────────────┘
```

### SecurityContextHolder 是什么？

```java
// 这是一个 ThreadLocal 容器，存储当前线程的用户信息

// 存
SecurityContextHolder.getContext().setAuthentication(auth);

// 取
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String userId = (String) auth.getPrincipal();  // "user-uuid-123"
String role = auth.getAuthorities().iterator().next().getAuthority();  // "ROLE_USER"

// 删（退出登录时）
SecurityContextHolder.clearContext();
```

---

## 4. JWT 实现详解

### JWT 结构

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.          ← Header（头部）
eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjE...     ← Payload（数据）
qaSREpYZObTPxFhVe2qU9aZ6U_hK1vJsF4X5yB5Tq3Y    ← Signature（签名）
   │            │              │
   │            │              └── 用 secret key + 算法 算出
   │            └── 存的是 userId、role、过期时间
   └── {"alg":"HS256","typ":"JWT"}
```

### 博客项目的 JwtUtil

```java
public class JwtUtil {
    
    // 1. 生成 token
    public String generateToken(String username, String userId, String role) {
        return Jwts.builder()
                .subject(username)           // 主题（用户名）
                .claim("userId", userId)    // 自定义 claims
                .claim("role", role)        // 角色
                .issuedAt(new Date())       // 签发时间
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 24))
                // ↑ 过期时间：24小时后
                .signWith(getSigningKey())  // 用 secret key 签名
                .compact();                 // 生成字符串
    }
    
    // 2. 从 token 提取用户名
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    // 3. 从 token 提取 userId
    public String extractUserId(String token) {
        return extractClaim(token, claims -> claims.get("userId", String.class));
    }
    
    // 4. 从 token 提取角色
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }
    
    // 5. 验证 token
    public boolean validateToken(String token, String username) {
        try {
            Claims claims = extractAllClaims(token);
            // 检查 username 是否匹配
            // 检查是否过期
            return claims.getSubject().equals(username) 
                && !isTokenExpired(token);
        } catch (Exception e) {
            return false;  // 签名错误 / 过期 / 格式错误
        }
    }
    
    // 6. 核心：解析 token（同时验证签名）
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())  // 用 secret key 验证签名
                .build()
                .parseSignedClaims(token)     // 解析（签名不对会抛异常）
                .getPayload();                // 获取数据
    }
    
    // 获取签名用的 key
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }
    
    // 检查是否过期
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    // 通用提取方法
    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = extractAllClaims(token);
        return resolver.apply(claims);
    }
}
```

### 你不需要背的内容

```java
// 这些是 jjwt 库的 API，不需要背，用时查文档：

Jwts.builder()                           // 开始构建
    .subject()                           // 设置主题
    .claim()                             // 设置自定义数据
    .issuedAt()                          // 签发时间
    .expiration()                        // 过期时间
    .signWith()                          // 签名
    .compact()                           // 生成字符串

Jwts.parser()                            // 开始解析
    .verifyWith(key)                     // 设置验证密钥
    .build()
    .parseSignedClaims(token)            // 解析
    .getPayload()                        // 获取数据

// 官方文档：https://github.com/jwtk/jjwt
```

---

## 5. 注解的本质

### @ 注解是什么？

```java
// 注解就是"标记"，告诉框架这个类/方法有特殊含义
@RestController
public class PostController {
    
    @GetMapping("/posts")
    public List<Post> getPosts() { ... }
}

// 等价于（传统方式）
public class PostController implements Controller {
    public String handle(HttpServletRequest req, HttpServletResponse resp) {
        if ("/posts".equals(req.getPathInfo()) && "GET".equals(req.getMethod())) {
            return getPosts();
        }
    }
}
```

### Spring 启动时做了什么？

```
1. 扫描 @RestController 注解的类
   ↓
2. 扫描 @GetMapping/@PostMapping 等注解的方法
   ↓
3. 建立 URL → Controller Method 的映射表
   ↓
4. 收到请求时，根据 URL 找到对应方法并执行
```

### 简化版实现（帮助你理解）

```java
// Spring 框架大概是这样实现的（简化版）
public class MySpring {
    
    // 路由表
    private static Map<String, Handler> router = new HashMap<>();
    
    // 启动时扫描
    public static void init(String basePackage) {
        for (Class<?> clazz : scan(basePackage)) {
            
            // 发现 @RestController
            if (clazz.isAnnotationPresent(RestController.class)) {
                Object instance = clazz.newInstance();
                
                // 扫描所有方法
                for (Method method : clazz.getMethods()) {
                    
                    // 发现 @GetMapping
                    if (method.isAnnotationPresent(GetMapping.class)) {
                        String path = method.getAnnotation(GetMapping.class).value();
                        router.put("GET " + path, new Handler(instance, method));
                    }
                    
                    // 发现 @PostMapping
                    if (method.isAnnotationPresent(PostMapping.class)) {
                        String path = method.getAnnotation(PostMapping.class).value();
                        router.put("POST " + path, new Handler(instance, method));
                    }
                }
            }
        }
    }
    
    // 处理请求
    public static void handle(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        String key = method + " " + path;
        
        Handler handler = router.get(key);
        if (handler != null) {
            handler.invoke();  // 调用 controller 方法
        } else {
            response(404);  // 没找到
        }
    }
}
```

---

## 6. 越权防护机制

### 为什么越权检查在 Service 层？

```
┌─────────────────────────────────────────────────────────────┐
│ 职责分离原则                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Controller 层                                               │
│ - 职责：接收请求、参数校验、调用 Service                      │
│ - 不做权限检查（只管拿到 userId 往下传）                      │
│                                                             │
│ Service 层                                                  │
│ - 职责：业务逻辑 + 权限校验                                  │
│ - 做越权检查：post.authorId == userId                       │
│                                                             │
│ Repository 层                                               │
│ - 职责：数据访问                                             │
│ - 不做业务逻辑                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 越权防护代码

```java
// PostServiceImpl.java

@Override
public PostDetailVO updatePost(String id, UpdatePostDto dto, String userId) {
    
    // 1. 先查出文章
    Post post = postRepository.findByIdWithTags(id);
    if (post == null) {
        throw new RuntimeException("文章不存在");
    }
    
    // 2. 【越权检查】只有作者才能修改自己的文章
    if (!post.getAuthorId().equals(userId)) {
        throw new RuntimeException("无权限操作");  // 403
    }
    
    // 3. 更新逻辑
    post.setTitle(dto.getTitle());
    post.setContent(dto.getContent());
    // ...
    
    return postRepository.save(post);
}

@Override
public void deletePost(String id, String userId) {
    Post post = postRepository.findById(id);
    
    // 【越权检查】
    if (!post.getAuthorId().equals(userId)) {
        throw new RuntimeException("无权限操作");
    }
    
    postRepository.deleteById(id);
}
```

### 攻击场景演示

```
攻击者 A 的 userId = "aaa-111"

正常请求：
PUT /api/posts/bbb-222
Authorization: Bearer <A的token>
Body: { "title": "被劫持的标题" }

─────────────────────────────────────────

Service 层的检查：
Post post = findById("bbb-222")  // 查出作者是 "ccc-333"
post.authorId = "ccc-333"

检查：!"ccc-333".equals("aaa-111") = true  // 不相等！

抛出异常：RuntimeException("无权限操作")
返回：403 Forbidden

─────────────────────────────────────────

结论：即使知道别人的文章 ID，也无法修改（越权被阻止）
```

---

## 7. 常见注解一览

### Controller 层注解

```java
@RestController           // = @Controller + @ResponseBody
                          // 返回 JSON 而不是视图

@RequestMapping("/api")   // 类上：URL 前缀
public class XxxController {

    @GetMapping("/posts")           // GET 请求
    public Result getPosts() { }
    
    @PostMapping("/posts")          // POST 请求（创建）
    public Result createPost() { }
    
    @PutMapping("/posts/{id}")     // PUT 请求（更新）
    public Result updatePost(@PathVariable String id) { }
    
    @DeleteMapping("/posts/{id}")  // DELETE 请求
    public Result deletePost(@PathVariable String id) { }
    
    // 参数注解
    @RequestParam("page")          // ?page=1
    @RequestBody                   // 请求体 JSON
    @PathVariable                  // URL 路径中的参数 {id}
    @Valid                         // 触发参数校验
}
```

### 参数校验注解

```java
// DTO 中使用
public class CreatePostDTO {
    
    @NotBlank(message = "标题不能为空")    // 不能是空字符串
    private String title;
    
    @NotNull                             // 不能是 null
    private String content;
    
    @Size(min = 10, max = 200)          // 长度限制
    private String excerpt;
    
    @Pattern(regexp = "^[a-z0-9-]+$")   // 正则校验
    private String slug;
    
    @Email                               // 邮箱格式
    private String email;
}
```

### Service 层注解

```java
@Service                  // 标记为 Service，加入 IOC 容器

@Transactional            // 开启事务（方法内所有数据库操作在一个事务中）

@Transactional(readOnly = true)  // 只读事务（查询优化）
public List<Post> getPosts() { }
```

### 权限控制注解

```java
// 方式1：在 SecurityConfig 中配置
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(authz -> authz
            .requestMatchers("/api/admin/**").hasRole("ADMIN")      // 需要 ADMIN 角色
            .requestMatchers("/api/posts/**").authenticated()       // 需要登录
            .anyRequest().permitAll()                               // 其他全部放行
        );
}

// 方式2：使用注解（需要开启 @EnableMethodSecurity）
@PreAuthorize("hasRole('ADMIN')")     // 方法执行前检查权限
public void deleteUser(String id) { }

@Secured("ROLE_ADMIN")                // 更简单的写法
public void deleteUser(String id) { }
```

---

## 8. 学习方法与资源

### 学习路线图

```
第一阶段：会用（1-2周）
├── 跟着项目敲代码
├── 看项目里的 SecurityConfig 配置
├── 理解 getUserIdFromRequest() 怎么来的
└── 理解 @RestController + @GetMapping 等基本注解

第二阶段：理解原理（2-4周）
├── 看 Spring Security 官方文档
├── 理解 Filter Chain 机制
├── 理解 SecurityContextHolder
├── 跟着视频手写一个简单登录
└── 理解 JWT 结构

第三阶段：深入（1-3个月）
├── 看 Spring 源码（IOC、AOP、Bean）
├── 看 Spring Security 源码
├── 理解 @EnableWebSecurity 的作用
├── 能独立实现完整的认证授权
└── 理解常见安全漏洞（SQL注入、XSS、CSRF）

第四阶段：精通（持续）
├── 能排查复杂的安全问题
├── 能优化安全性能
├── 能设计安全架构
└── 关注安全动态
```

### 推荐资源

#### 视频教程（B站）

```
搜索关键词：Spring Security 教程
- 尚硅谷 Spring Security
- 黑马程序员 Spring Security
- 狂神说 Spring Security
```

#### 官方文档

```
Spring Security:
https://docs.spring.io/spring-security/reference/

Spring Boot:
https://docs.spring.io/spring-boot/docs/current/reference/html/

JJWT (JWT 库):
https://github.com/jwtk/jjwt
```

#### 快速入门项目

```bash
# 用 Spring Initializr 创建项目
https://start.spring.io/

添加依赖：
- Spring Web
- Spring Security
- Spring Data JPA
- MySQL Driver
```

### 你现在最该做的事

1. **画一遍登录流程图**（从请求到响应）
2. **debug 走一遍 JWT 验证过程**
3. **自己写一个简单的 Filter**
4. **理解 SecurityContextHolder 存的是什么**

---

## 附录：项目中的文件对应关系

```
src/main/java/com/aston/blog/
├── config/
│   └── SecurityConfig.java      ← Security 配置类
│                                   定义 Filter Chain
│
├── common/
│   ├── JwtUtil.java             ← JWT 工具类
│   │                            生成/验证/解析 JWT
│   ├── Result.java              ← 统一响应格式
│   └── GlobalExceptionHandler.java  ← 全局异常处理
│
├── Controller/
│   ├── AuthController.java      ← 登录/注册
│   ├── PostController.java      ← 文章 CRUD
│   └── TerminalController.java  ← 终端功能
│
├── Service/
│   ├── PostService.java         ← 接口
│   └── impl/
│       ├── PostServiceImpl.java ← 实现 + 越权检查
│       └── TerminalServiceImpl.java
│
├── Repository/                   ← 数据访问
│
├── entity/                      ← 数据库表映射
│   ├── User.java
│   └── Post.java
│
└── dto/ / vo/                  ← 数据传输对象
```

---

*最后更新：2026年4月*
