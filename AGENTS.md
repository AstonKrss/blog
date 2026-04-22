# AGENTS.md — Aston's Blog

## 项目概览

全栈博客系统，前端 **Next.js 15 (App Router)** + 后端 **Spring Boot 4.0 (Java 21)**，数据库 **MySQL 8.0**。

- 前端端口: `3000`
- 后端端口: `8080`
- API 基础 URL: `http://localhost:8080` (可通过 `NEXT_PUBLIC_API_URL` 环境变量配置)

## 目录结构

```
blog/
├── src/main/java/com/aston/blog/
│   ├── Controller/          # REST 控制器（一个文件一个类，无子包）
│   ├── Service/             # 接口
│   ├── Service/impl/        # 服务实现
│   ├── dto/                 # 请求 DTO（带 Jakarta Validation 注解）
│   ├── vo/                  # 响应 VO（按功能模块分子目录）
│   ├── entity/              # JPA 实体（表名用 @Table 显式指定）
│   ├── repository/          # Spring Data JPA 仓库
│   ├── common/              # 公共类（Result、JwtUtil、GlobalExceptionHandler）
│   └── config/              # 配置类（SecurityConfig、WebConfig）
├── src/main/resources/
│   └── application.properties  # 后端配置（DDL auto = none）
├── frontend/                # Next.js 15 App Router
│   ├── app/                 # 页面路由（app/）
│   ├── components/          # React 组件
│   └── lib/                 # 工具函数
├── compose.yaml             # Docker Compose（MySQL + backend + frontend）
├── docs/SECURITY.md         # 安全架构文档
└── docs/SECURITY_TOOLS.md  # 安全工具 API 文档
```

## 常用命令

### 后端

```bash
# 启动（当前目录或 src/）
mvn spring-boot:run

# 打包（跳过测试）
mvn clean package -DskipTests

# 仅编译
mvn compile
```

### 前端

```bash
cd frontend

# 开发
npm run dev

# 生产构建
npm run build

# Lint
npm run lint
```

### Docker Compose

```bash
# 启动全部服务（MySQL + backend + frontend）
docker-compose up -d --build

# 停止
docker-compose down
```

## 构建与部署

- **CI/CD**: `.github/workflows/build.yml` — 推送到 `main` 分支触发 GitHub Actions，自动构建并通过 SSH 部署到阿里云服务器（IP: `47.242.21.40`）。
- **前端构建参数**: `NEXT_PUBLIC_API_URL=http://47.242.21.40:8080` 在 CI 和 `frontend/.env.production` 中硬编码（不要提交生产环境的 .env 文件）。
- **后端镜像**: `eclipse-temurin:21-jdk-alpine` (builder) + `eclipse-temurin:21-jre-alpine` (runtime)。
- **前端镜像**: `node:22-alpine`，暴露端口 `3000`。

## 数据库

- **DDL 策略**: `spring.jpa.hibernate.ddl-auto=none` — 表结构由 JPA 实体注解管理，初始表需手动创建或由已有数据生成。**不要依赖 Hibernate 自动建表**。
- **连接配置**: `application.properties` 中使用环境变量 `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`，默认值连接 `localhost:3306/myblog`。
- **Docker Compose 中**: MySQL 密码为 `Chuyangqi123@@`，应用用户 `bloguser` 密码 `Aston123@@blog`。

## 认证与授权

### JWT 流程

1. 登录成功后 `AuthServiceImpl.generateToken()` 生成 JWT，包含 `userId` + `role`。
2. `SecurityConfig.JwtAuthenticationFilter` 在每个请求中解析 `Authorization: Bearer <token>`，验证签名和过期时间，设置 `SecurityContextHolder`。
3. `SecurityContextHolder` 中 `principal` 存 `userId`（String），`authorities` 存 `ROLE_<role>`。

### 从请求获取用户信息

所有需要认证的 Controller 复用 `getUserIdFromRequest()` 私有方法：

```java
private String getUserIdFromRequest(HttpServletRequest request) {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() != null) {
        Object principal = auth.getPrincipal();
        if (principal instanceof String) return (String) principal;
    }
    return null;
}
```

### 权限控制模式

- **资源归属检查**: Service 层验证 `authorId == userId`（防止修改/删除他人资源）。
- **角色检查**: Controller 层检查 `role == "ADMIN"`，使用 `getAuthorities()` 流式提取角色。
- **双重验证**: 敏感操作同时检查 SecurityContext 中的角色 + 数据库中的 `isAdmin()` 查询。

### 用户角色

| 角色 | 权限 |
|------|------|
| `ADMIN` | 全站管理：站点设置、项目、照片、友链、用户列表、访问统计 |
| `AUTHOR` | 写文章、管理自己的文章 |
| `READER` | 仅查看个人资料 |

## 代码模式

### 后端

- **DTO 带验证注解**: `jakarta.validation.constraints`（`@NotBlank`、`@Size` 等），Controller 参数加 `@Valid`。
- **统一响应**: `Result<T>`（code=0 成功，非0失败），由 `GlobalExceptionHandler` 处理异常。
- **实体命名**: JPA 实体用 `@Data` (Lombok)，表名用 `@Table(name="xxx")`，主键策略 `GenerationType.UUID`，时间戳用 `@CreationTimestamp`/`@UpdateTimestamp`。
- **多对多关联**: `Post.tags` 通过 `@JoinTable` 显式指定中间表 `post_tags`。
- **懒加载**: `@ManyToOne(fetch = FetchType.LAZY)` 用于避免循环加载（如 `Post.author`）。
- **Service 接口**: 所有业务逻辑写在 `impl/` 目录下的实现类，带 `@Transactional`（读操作加 `readOnly=true`）。
- **异常处理**: `RuntimeException` 用于业务错误，在 Controller 层捕获并转为 `Result.error(403, message)`。

### 前端

- **认证**: `AuthProvider` (Context API) 管理全局用户状态，token 存在 `localStorage`，`/api/auth/me` 验证 token。
- **API 调用**: 直接调用 `process.env.NEXT_PUBLIC_API_URL`（即 `http://localhost:8080` 或生产环境地址），不通过 Next.js rewrites 代理。
- **Next.js rewrites**: `next.config.ts` 中 `/api/*` 和 `/uploads/*` 会 rewrite 到后端 API URL（仅在非生产环境或特定部署时使用）。
- **CORS**: 后端 `SecurityConfig` 中 CORS 允许 `http://localhost:3000` 和 `http://47.242.21.40`。

## 特殊配置

- **`spring.docker.compose.enabled=false`**: 禁用 Docker Compose 自动启动（本地开发时 MySQL 通常单独运行）。
- **访问日志**: `VisitLoggingInterceptor` 拦截所有 `/api/**` 请求（除登录/注册），记录 IP、User-Agent、Referer。
- **JWT Secret**: `JwtUtil.SECRET` 硬编码（`mySecretKeyForJwtTokenGenerationThatIsLongEnough`），生产环境应使用环境变量。
- **内容字段**: `Post.content` 用 `@Column(columnDefinition = "LONGTEXT")` 存储 Markdown 内容。

## 非自明约定

- **后端源码不在 `backend/` 子目录**: 实际源码在 `src/main/java/...`（项目根目录下），pom.xml 也在根目录。README 中的 `cd blog/backend` 是旧描述。
- **前端 API 路由** `app/api/*/route.ts` 是 Next.js Route Handlers，仅用于少数场景（如 `/api/posts` 分页），主要 API 来自后端。
- **上传文件**: 通过 `UploadController` 上传到 `uploads/` 目录，前端通过 `/uploads/*` 路径访问。
- **前端 `.env.production`**: 构建时写入，包含 `NEXT_PUBLIC_API_URL`，不应提交到 Git。

## 安全工具箱

位于 `frontend/app/tools/page.tsx`，集成网络安全常用工具：

### 前端工具（纯浏览器实现）
- **编码解码**: Base64, URL, HTML, Unicode, Hex, 二进制, ROT13
- **哈希计算**: SHA-256, SHA-512, 密码生成, 文件哈希
- **JWT & 正则**: JWT 解析器, 正则表达式测试器
- **格式化**: JSON 格式化/压缩, 时间戳转换, UUID 生成
- **其他**: User-Agent 查看, 二维码生成

### 后端 API（SecurityToolsController）
- `GET /api/tools/ip-info` - IP 地理位置查询
- `GET /api/tools/dns?domain=xxx` - DNS 记录查询
- `GET /api/tools/port-scan?host=xxx` - 端口扫描
- `GET /api/tools/cors-test?url=xxx` - CORS 配置测试
- `GET /api/tools/cve-search?keyword=xxx` - CVE 漏洞查询
- `GET /api/tools/whois?domain=xxx` - Whois 查询
- `GET /api/tools/subdomains?domain=xxx` - 子域名枚举
- `GET /api/tools/breach-check?email=xxx` - 密码泄露检测

详细 API 文档见 `docs/SECURITY_TOOLS.md`。
