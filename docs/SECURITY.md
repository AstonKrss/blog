# 安全修复文档

## 概述

本文档说明博客系统的安全修复，特别是**越权漏洞修复**和**权限控制机制**。

---

## 一、问题发现

### 1.1 原来的越权漏洞

在修复前，以下API没有任何权限控制，任何登录用户都可以调用：

| API | 问题 |
|-----|------|
| `POST /api/posts/{id}` | 可删除任意文章 |
| `PUT /api/posts/{id}` | 可修改任意文章 |
| `DELETE /api/projects/{id}` | 可删除任意项目 |
| `PUT /api/projects/{id}` | 可修改任意项目 |
| `DELETE /api/photos/{id}` | 可删除任意照片 |
| `PUT /api/settings` | 可修改站点设置 |
| `PUT /api/friends/{id}/status` | 可审批友链 |
| `GET /api/users` | 可获取所有用户列表 |

### 1.2 攻击示例

普通用户（AUTHOR或READER）发送以下请求即可删除他人文章：

```bash
curl -X DELETE http://localhost:8080/api/posts/xxx \
  -H "Authorization: Bearer <user_token>"
```

---

## 二、修复方案

### 2.1 JWT验证流程

```
用户请求
    │
    ▼
JwtAuthenticationFilter (在 SecurityConfig 中)
    │
    ├─ 1. 读取 Authorization: Bearer <token>
    │
    
    ├─ 2. 调用 JwtUtil.extractUsername(token) 获取用户名
    │
    ├─ 3. 调用 JwtUtil.validateToken(token, username)
    │     └─ 验证JWT签名(SecretKey)
    │     └─ 验证过期时间
    │
    ├─ 4. 提取用户信息
    │     ├─ userId = JwtUtil.extractUserId(token)
    │     └─ role = JwtUtil.extractRole(token)
    │
    ├─ 5. 创建认证对象
    │     new UsernamePasswordAuthenticationToken(
    │         userId,           // principal
    │         token,           // credentials
    │         [ROLE_ADMIN]     // authorities
    │     )
    │
    └─ 6. 设置到 SecurityContextHolder
        SecurityContextHolder.getContext().setAuthentication(authToken)
```

**关键代码** (`SecurityConfig.java`):

```java
@Override
protected void doFilterInternal(HttpServletRequest request, 
                              HttpServletResponse response, 
                              FilterChain chain) throws ServletException, IOException {
    String authHeader = request.getHeader("Authorization");
    
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        String token = authHeader.substring(7);
        
        // 验证JWT
        String username = jwtUtil.extractUsername(token);
        String userId = jwtUtil.extractUserId(token);
        
        if (username != null && userId != null) {
            if (jwtUtil.validateToken(token, username)) {  // 验证签名和过期
                String role = jwtUtil.extractRole(token);
                
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                
                UsernamePasswordAuthenticationToken authToken = 
                    new UsernamePasswordAuthenticationToken(userId, token, authorities);
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
    }
    
    chain.doFilter(request, response);
}
```

### 2.2 JWT Token改进

**Before**: 只包含 `userId`

**After**: 包含 `userId` + `role`

```java
// JwtUtil.java
public String generateToken(String username, String userId, String role) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("userId", userId);
    claims.put("role", role);
    return createToken(claims, username);
}

public String extractRole(String token) {
    return extractClaim(token, claims -> claims.get("role", String.class));
}
```

**登录时生成Token** (`AuthServiceImpl.java`):

```java
String token = jwtUtil.generateToken(user.getUsername(), user.getId(), user.getRole());
// role 是 ADMIN / AUTHOR / READER
```

### 2.3 双重权限验证

对于敏感的ADMIN操作，在Controller层再次验证：

```java
@GetMapping("/admin")
public Result<UserVO> getAdmin(HttpServletRequest request) {
    String userId = getUserIdFromRequest(request);
    if (userId == null) {
        return Result.error(401, "未登录");
    }
    
    // 第一次验证：从SecurityContext
    String role = getUserRoleFromRequest(request);
    
    // 第二次验证：从数据库查询
    if (!"ADMIN".equals(role) && !userService.isAdmin(userId)) {
        return Result.error(403, "无权限");
    }
    
    return Result.success(userService.getAdmin());
}
```

### 2.4 帮助方法

```java
private String getUserIdFromRequest(HttpServletRequest request) {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() != null) {
        return (String) auth.getPrincipal();
    }
    return null;
}

private String getUserRoleFromRequest(HttpServletRequest request) {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getAuthorities() != null) {
        return auth.getAuthorities().stream()
                .filter(a -> a.getAuthority().startsWith("ROLE_"))
                .map(a -> a.getAuthority().substring(5))
                .findFirst()
                .orElse(null);
    }
    return null;
}
```

---

## 三、具体API权限控制

### 3.1 文章管理

```java
// PostController.java
@PutMapping("/{id}")
public Result<PostDetailVO> updatePost(@PathVariable String id, 
                                   @Valid @RequestBody UpdatePostDto dto,
                                   HttpServletRequest request) {
    String userId = getUserIdFromRequest(request);
    if (userId == null) return Result.error(401, "未登录");
    
    try {
        return Result.success(postService.updatePost(id, dto, userId));
    } catch (RuntimeException e) {
        return Result.error(403, e.getMessage());  // 无权限
    }
}
```

**Service层验证** (`PostServiceImpl.java`):

```java
public PostDetailVO updatePost(String id, UpdatePostDto dto, String userId) {
    Post post = postRepository.findByIdWithTags(id).orElse(null);
    if (post == null) throw new RuntimeException("文章不存在");
    
    // 关键：验证作者是自己
    if (!post.getAuthorId().equals(userId)) {
        throw new RuntimeException("无权限操作");
    }
    // ... 更新逻辑
}
```

### 3.2 项目管理

```java
// ProjectController.java
@PostMapping("/projects")
public Result<ProjectVO> create(@Valid @RequestBody CreateProjectDTO dto,
                             HttpServletRequest request) {
    String role = getUserRole(request);
    if (!"ADMIN".equals(role) && !"AUTHOR".equals(role)) {
        return Result.error(403, "无权限");
    }
    return Result.success(service.create(dto));
}

@DeleteMapping("/projects/{id}")
public Result<?> delete(@PathVariable String id, HttpServletRequest request) {
    String role = getUserRole(request);
    if (!"ADMIN".equals(role)) {
        return Result.error(403, "无权限");
    }
    service.delete(id);
    return Result.success(null);
}

private String getUserRole(HttpServletRequest request) {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getAuthorities() != null) {
        return auth.getAuthorities().stream()
                .filter(a -> a.getAuthority().startsWith("ROLE_"))
                .map(a -> a.getAuthority().substring(5))
                .findFirst()
                .orElse(null);
    }
    return null;
}
```

### 3.3 站点设置

```java
// SettingController.java
@PutMapping
public Result updateSettings(@RequestBody Map<String, Object> request,
                          HttpServletRequest httpRequest) {
    String role = getUserRole(httpRequest);
    if (!"ADMIN".equals(role)) {
        return Result.error(403, "无权限");
    }
    // ... 更新设置
}
```

---

## 四、前端权限控制

### 4.1 控制台菜单

```tsx
// dashboard/page.tsx
const isAdmin = user.role === "ADMIN";
const isAuthor = user.role === "ADMIN" || user.role === "AUTHOR";

const quickActions = [
  // 作者和管理员可见
  ...(isAuthor ? [{ href: "/dashboard/write", ... }] : []),
  // 只有管理员可见
  ...(isAdmin ? [{ href: "/dashboard/settings", ... }] : []),
];
```

### 4.2 管理员页面保护

```tsx
// dashboard/projects/page.tsx
useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
        router.push("/");  // 非管理员跳转首页
        return;
    }
    if (user && user.role === "ADMIN") {
        loadProjects();
    }
}, [user, authLoading]);
```

---

## 五、用户角色说明

| 角色 | 权限 |
|------|------|
| `ADMIN` | 管理所有：站点设置、项目、照片、友链、用户列表、访问统计 |
| `AUTHOR` | 写文章、管理自己的文章 |
| `READER` | 只能看个人资料 |

---

## 六、安全流程图

```
攻击者发送恶意请求
        │
        ▼
    负载均衡/Nginx
        │
        ▼
    Spring Boot Application
        │
        ▼
    JwtAuthenticationFilter
    ├─ 验证JWT签名
    ├─ 验证过期时间
    └─ 设置SecurityContext
        │
        ▼
    Controller (如 /api/projects/{id})
    ├─ getUserIdFromRequest()  ← 从SecurityContext获取
    ├─ getUserRoleFromRequest() ← 获取角色
    ├─ 检查 role == "ADMIN"?
    │   └─ 否 → 403 无权限
    └─ 是 → 继续执行
        │
        ▼
    Service层
    ├─ 查询数据库
    ├─ 验证 authorId == userId?
    │   └─ 否 → 无权限操作
    └─ 执行操作
```

---

## 七、如何测试

### 7.1 测试越权是否被修复

1. 创建一个普通用户（非ADMIN）
2. 尝试访问管理员API：

```bash
# 尝试获取所有用户（应返回403）
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer <user_token>"

# 尝试删除他人文章（应返回403）
curl -X DELETE http://localhost:8080/api/posts/xxx \
  -H "Authorization: Bearer <user_token>"

# 尝试修改站点设置（应返回403）
curl -X PUT http://localhost:8080/api/settings \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"settings":{}}'
```

### 7.2 检查数据库用户角色

```sql
SELECT id, username, role FROM users;
```

确保普通用户的 `role` 字段是 `AUTHOR` 或 `READER`，不是 `ADMIN`。

---

## 八、注意事项

### 8.1 后端必须验证

**永远不要只依赖前端验证**，因为攻击者可以直接调用API绕过后端。

前端验证只是提升用户体验，真正的安全控制在后端。

### 8.2 数据库二次验证

对于敏感操作（如删除他人文章），除了检查角色，还应该在Service层验证资源归属：

```java
if (!post.getAuthorId().equals(userId)) {
    throw new RuntimeException("无权限操作");
}
```

### 8.3 JWT Secret安全

`JwtUtil` 中的 `SECRET` 必须足够长且安全：

```java
private static final String SECRET = "<环境变量注入>";
```

生产环境应该使用环境变量或配置中心，不要硬编码。

---

## 九、已发现的待改进项

### ⚠️ 1. 登录API返回格式不一致 (重要!)

**问题**: 登录(`/api/auth/login`)返回格式不标准，没有将token包装在Result中

**当前返回** (缺少code和标准结构):
```json
{"user": {...}}
```

**应该返回**:
```json
{"code": 0, "message": "success", "data": {"token": "...", "user": {...}}}
```

### ⚠️ 2. IP归属地库

当前用的是简单判断，生产环境建议用MaxMind GeoLite2:
```xml
<dependency>
    <groupId>com.maxmind.geoip2</groupId>
    <artifactId>geoip2</artifactId>
    <version>4.0.0</version>
</dependency>
```

### ☐ 3. 审计日志

记录所有敏感操作

### ☐ 4. Rate Limiting

防止暴力请求

### ☐ 5. 访问日志表DDL

需要手动执行SQL建表

---

## 十、相关文件

| 文件 | 说明 |
|------|------|
| `SecurityConfig.java` | JWT过滤器配置 |
| `JwtUtil.java` | JWT工具类 |
| `AuthServiceImpl.java` | 登录/注册时生成token |
| `UserController.java` | 用户API权限控制 |
| `PostController.java` | 文章API权限控制 |
| `ProjectController.java` | 项目API权限控制 |
| `SettingController.java` | 设置API权限控制 |
| `VisitLogServiceImpl.java` | 访问日志服务 |
| `dashboard/page.tsx` | 前端控制台 |
| `dashboard/*/page.tsx` | 各管理页面 |

---

## 总结

修复的核心思路：

1. **JWT层**: 验证签名+过期，生成时包含role
2. **Filter层**: 验证通过后设置SecurityContext
3. **Controller层**: 从SecurityContext获取userId/role
4. **Service层**: 验证资源归属（authorId == userId）
5. **数据库层**: 二次验证isAdmin()

这样形成了多层防御，即使某一层被突破，其他层仍然能阻止越权。