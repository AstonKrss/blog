# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

`blog` 是 Aston 的个人全栈博客系统(偏 DevSecOps 风格),**三服务 + 一数据库**,由 `compose.yaml` 编排:

| 服务 | 技术栈 | 端口 | 容器名 | 源码 |
| --- | --- | --- | --- | --- |
| **MySQL 8.0** | mysql:8.0 | 3306 | `blog-mysql` | (镜像) |
| **Backend** | Spring Boot 4.0 / Java 21 / Spring Data JPA / Spring Security / JJWT 0.12 / Flyway / Lombok | 8080 | `blog-backend` | `src/main/java/com/aston/blog/` + `Dockerfile.backend` |
| **Frontend** | Next.js 15 App Router / React 19 / TS / Tailwind 4 / ECharts / Leaflet 5 / three | 3000 (compose 映射到 80) | `blog-frontend` | `frontend/` + `frontend/Dockerfile` |
| **Python** | FastAPI / pymysql / python-jose / httpx | 8000 | `blog-python` | `python/` + `python/Dockerfile` |

**关键耦合**:
- Backend 和 Python **直接共用 MySQL** (Python 的 `db_service` 写 `oss_scan_logs` / `security_tool_stats` 表;前端用 Prisma client 但只读用户表)
- `uploads/` 目录是 **host↔backend↔frontend 三方共享卷** (`./uploads:/app/uploads`)
- 所有服务在 `blog-network` bridge 网络内,可直接用服务名互访 (`http://backend:8080` 等)
- CI/CD 目标服务器: `47.242.21.40` (阿里云,公开 IP)

## 常用命令

```bash
# === Backend ===
mvn spring-boot:run                          # 本地启动 (默认连 localhost:3306)
mvn compile                                  # 编译
mvn test                                     # 跑测试 (项目里测试覆盖很少)
mvn clean package -DskipTests                # 打 jar,产物 target/*.jar

# === Frontend ===
cd frontend && npm install                   # 装依赖
cd frontend && npm run dev                   # 开发 (默认 :3000,需要 backend 在 :8080)
cd frontend && npm run build                 # 生产构建 (会固化 NEXT_PUBLIC_API_URL)
cd frontend && npm run lint                  # next lint
cd frontend && npm run start                 # 跑 production build (需先 build)

# === Python ===
cd python && pip install -r requirements.txt
cd python && python app.py                   # 启动 (默认 :8000)

# === Docker Compose ===
docker compose up -d --build                 # 全部起来
docker compose up -d --build backend         # 只重建 backend
docker compose logs -f backend               # 看 backend 日志
docker compose down                          # 停服 (数据保留在 mysql_data 卷)
docker compose down -v                       # ⚠️ 会删 MySQL 数据卷
docker exec -it blog-mysql mysql -ubloguser -p<环境变量注入> myblog
```

## 配置文件分布 (几个容易踩坑的)

| 文件 | 内容 | 注意 |
| --- | --- | --- |
| `pom.xml` | 根目录,Java 21,parent=Spring Boot 4.0.5 | 切勿用 `mvn` 时 `cd backend/`(没有该子目录) |
| `src/main/resources/application.yml` | Spring 配置 | `ddl-auto=validate` + Flyway 启用,迁移在 `classpath:db/migration` |
| `Dockerfile.backend` | 多阶段 build: `temurin:21-jdk-alpine` 编译 → `temurin:21-jre-alpine` 跑 | 启动时硬编码 `spring.servlet.multipart.*` 三个系统属性 |
| `frontend/Dockerfile` | 两阶段: `node:22-alpine` 装依赖+build → `node:22-alpine` 跑 | 关键: `NEXT_PUBLIC_API_URL` 通过 ARG 传,build 时固化 |
| `python/Dockerfile` | `python:3.11-slim` | 含 HEALTHCHECK 调 `httpx.get('/health')` |
| `compose.yaml` | MySQL + backend + frontend + python | **密码、QQ 邮箱授权码、JWT secret 都写死了**,上线前必须替换 |
| `frontend/.env.production` | CI 生成,生产 NEXT_PUBLIC_API_URL | 仓库里有一个**不**含密钥的样板文件;真正的生产配置由 CI 写 |
| `python/.env` | DB/JWT/HOST/PORT | `JWT_SECRET` 必须和 backend 一致,否则 Python 工具请求 401 |
| `.github/workflows/build.yml` | 推 main → SSH 部署到阿里云 | 见下文 CI/CD 章节 |

`.env` / `frontend/.env` / `python/.env` 是本地覆盖,应 `.gitignore`,**`compose.yaml` 里的硬编码是仓库基线**。

## 后端架构

### 分层

```
Controller/          (17 个 REST controller,一个文件一个类,直接放顶层不分子包)
  ├─ AuthController, PostController, PostLikeController, NoteController,
  ├─ PhotoController, ProjectController, FriendLinkController, FootprintController,
  ├─ GuestbookController, CommentController, UserController, SettingController,
  ├─ TerminalController, UploadController, AnalyticsController, PublicController,
  └─ SecurityController, SecurityToolsController   ← 安全管理与安全工具

Service/             (接口,19 个)
Service/impl/        (实现,所有业务逻辑,带 @Transactional,读操作 readOnly=true)
dto/                 (入参,带 jakarta.validation 注解,Controller 加 @Valid)
vo/                  (出参,按功能分子目录: auth/, post/, security/, ...)
entity/              (JPA 实体,@Data + Lombok,@Table 显式声明)
repository/          (Spring Data JPA,接口)
common/              (Result, JwtUtil, GlobalExceptionHandler)
config/              (SecurityConfig, WebConfig, SecurityInterceptor, VisitLoggingInterceptor)
util/                (杂项工具类)
```

**对应关系约定**: `Controller/PostController.java` ↔ `Service/PostService.java` ↔ `Service/impl/PostServiceImpl.java` ↔ `entity/Post.java` ↔ `repository/PostRepository.java`,重命名要同步改五处。

### 实体约定 (entity/)

- 主键统一 `GenerationType.UUID` (`User.id` / `Post.id` 等都是 `String`)
- 时间戳: `@CreationTimestamp` + `@UpdateTimestamp` (Hibernate 自动填充)
- 多对多: `@JoinTable` 显式声明中间表,例 `Post.tags` ↔ `post_tags`
- 多对一: `@ManyToOne(fetch = FetchType.LAZY)`,例 `Post.author`,且外键列用 `insertable=false, updatable=false` 避免双重写入
- 大字段: `@Column(columnDefinition = "LONGTEXT")` 存 Markdown,`TEXT` 存中等文本

### 响应包装 (Result)

`common/Result<T>` 字段: `code` (0 成功) / `message` / `data` / `timestamp`。**注意**: `GlobalExceptionHandler` 抛 `Result` 时返回的是 `Map<String, Object>`,**不是 `Result<T>`** — 前端 `lib/api.ts` 需要同时兼容两种结构(因为全局异常路径不走 `Result.success/error`)。

### 数据库迁移 (Flyway)

- `application.yml` 已启用 `flyway-core` + `classpath:db/migration`
- 已有 `V1_add_index.sql` 是后期补的索引补丁 (全表索引见该文件,80+ 行)
- 新表/新字段必须: 1) 改 entity,2) 写 `V<n>__<desc>.sql` (n 顺延),3) 启动时 Flyway 自动跑
- 切勿把 `ddl-auto` 改回 `update`/`create` — 启动会扫到 schema 不一致就抛 `SchemaManagementException`,改完 entity 不写 Flyway 文件就是直接崩溃

### 拦截器栈 (注册在 WebConfig)

按注册顺序执行 (Spring 默认顺序即添加顺序):

1. `VisitLoggingInterceptor` — `addPathPatterns("/api/**")`,exclude `/api/auth/login` `/api/auth/register`。记录所有 API 访问到 `visit_logs` 表 (IP/UA/Referer/路径)
2. `SecurityInterceptor` — `addPathPatterns("/**")`。**这个是项目自己写的安全网关,叠在 Spring Security 之上**,含:
   - **IP 白名单**: `47.242.21.40`, `127.0.0.1`, `0:0:0:0:0:0:0:1`, `172.17.0.1`
   - **排除路径**: `/uploads/`, `/static/`, `/favicon`, `/robots.txt`, `/health`, `/actuator`
   - **扫描器 UA 拦截**: sqlmap/nmap/burp/zap/nikto/awvs/nessus/wpscan 等 30+ 工具
   - **5 类攻击特征**: XSS, SQLi, 路径穿越, 命令注入, 敏感路径/扩展名访问
   - **阻断白名单**: 命中 `/api/tools/`, `/api/auth/*`, `/api/public/comments`, `/api/notes/`, `/comments`, `/guestbook` 路径上的攻击 → 返 403;其他路径只记录日志
   - **环境开关**: `SECURITY_INTERCEPTOR_BLOCK=false` 可以关闭阻断但保留日志

改 SSRF/上传/敏感接口时,**这个拦截器是默认在跑的**,可能误判并阻断 — 调整白名单或排除列表在文件顶部的常量数组里。

### 认证与授权 (两套)

#### 1. Spring Security (`SecurityConfig`)

无状态 JWT,`csrf().disable()`,`sessionCreationPolicy(STATELESS)`。

`SecurityFilterChain` 的匹配规则 (顺序敏感):
- `permitAll`: `/api/public/**`, `/api/auth/login|register|send-code`, `/uploads/**`, `/health`
- `hasRole("ADMIN")`: `/api/admin/**`, `/api/settings`, `/api/projects/**`, `/api/photos/**`, `/api/friends/**`, `/api/analytics/**`
- `authenticated()`: `/api/posts/**`, `/api/notes/**`, `/api/users/profile`, `/api/users/password`, `/api/upload/**`, `/api/terminal/**`
- 其他默认 `authenticated()`

`JwtAuthenticationFilter` (内嵌在 SecurityConfig) 解析顺序: **先看 `auth_token` cookie,fallback 到 `Authorization: Bearer ...`**,写新客户端必须双路径测。

#### 2. 应用层角色检查

`SecurityContextHolder.getContext().getAuthentication().getPrincipal()` 是 **`userId` (String, UUID)**,authorities 是 `ROLE_<role>`。Controller 拿 userId 的统一模式 (很多 Controller 私有方法都重复了):

```java
private String getUserIdFromRequest(HttpServletRequest request) {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof String s) return s;
    return null;
}
```

**注意**: `SecurityController` 和部分接口用 `getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")` 取 role — 这种写法假设用户只有一个角色,业务上没问题但要清楚。

#### 3. 资源归属检查

Service 层负责 `authorId == userId` 校验 (防越权编辑/删除他人内容),Controller 只做角色判断。

#### 4. JwtUtil (common/JwtUtil.java)

- claims: `userId` (String UUID) + `role` (String) + subject=username
- 默认密钥 `${jwt.secret:<开发默认密钥,已废弃>}` — **生产必须设 `JWT_SECRET` 环境变量**,不然用了默认密钥就能伪造 token
- 默认过期 `86400000` ms = 24h
- 注意: Python 服务的 `utils/jwt_auth.py` 也用相同 `JWT_SECRET` 解码,但它做 `int(userId)`,**而 Java 的 userId 是 UUID 字符串** — 这是个跨服务不一致,Python 工具接口目前没真正接前端 JWT 流(详情见 Python 章节)

### 上传 (UploadController)

**四层校验** (顺序: 登录 → 大小 → 扩展名 → MIME → 文件头魔数 → ImageIO 解析):

1. 必须登录 (`/api/upload/image` 路径在 SecurityConfig 标了 authenticated)
2. ≤ 5MB (`POST /api/upload/image` 限制;`/api/upload/media` 是另一个,50MB)
3. 扩展名白名单: `.jpg .jpeg .png .gif .webp .bmp`
4. MIME 白名单: `image/jpeg image/png image/gif image/webp image/bmp`
5. **文件头魔数** (字节签名,真正能识别"是不是真的这个格式")
6. **ImageIO 解析** (用 `javax.imageio.ImageIO.read()` 试解析,损坏文件会失败)

新加文件类型必须同时改: 扩展名集合 + MIME 集合 + 魔数表 + ImageIO 解析调用。

写入路径: `/app/uploads/<filename>`,由 `WebConfig.addResourceHandlers` 暴露为 `/uploads/**`。**注意**: 生产环境 `/uploads/` 不在 SecurityConfig 的 permitAll 范围外保护? 实际上 `SecurityConfig` 里有 `/uploads/**` permitAll — 上传的文件是公开可访问的,**靠文件 UUID 名做隐式安全,不要把敏感内容放到 uploads/**。

### 安全工具 (SecurityToolsController + Python sidecar)

**Java 这边** (`/api/tools/*`,permitAll,SSRF 防护在 controller 内做):
- 主动探测: `ip-info`, `dns`, `whois`, `subdomains`, `port-scan`, `http-headers`, `cors-test`
- 被动查询: `cve-search`, `breach-check`
- SSRF 防护: 端口白名单 `Set.of(80, 443)`,`connectTimeout=2s`,`readTimeout=3s`,`noRedirectRequestFactory` 禁跟随重定向
- ⚠️ 端口扫描和 http-headers 的 SSRF 防护是手工写的,见 `SECURITY_REVIEW.md` — 是持续在补的代码(最近 commit `38b332a 防止ssrf`)

**Python sidecar** (`/api/oss/*`, `/api/web/*`, `/api/crypto/*`, `/api/cve/*` ...):
- OSS 桶扫描,子域名爆破,XSS/SQLi 主动扫描,密码学,密码泄露查询
- 鉴权用 `Depends(get_current_user_id)` (从 Authorization Bearer 头解码)
- 任务模型: `task_manager` 维护 in-memory 任务,完成通过 SSE (`/api/oss/sse/{task_id}`) 推流

## Python 服务 (`python/`)

### 结构

```
python/
├── app.py                  # FastAPI 入口,挂 oss/web/crypto 三个 router,CORS 从 CORS_ORIGINS 读
├── config.py               # 从环境变量读 DB_CONFIG, JWT_SECRET, OSS_REGIONS (阿里云 OSS region 白名单)
├── requirements.txt        # fastapi, uvicorn, pymysql, python-jose, pydantic, httpx, python-dotenv
├── Dockerfile              # python:3.11-slim,带 HEALTHCHECK
├── .env                    # DB_HOST/PORT/USER/PASSWORD/NAME, JWT_SECRET
├── routers/                # oss.py (OSS 扫描), web.py (XSS/SQLi), crypto.py (编解码)
├── modules/                # 实际扫描实现
│   ├── oss/{bucket,path_fuzz,takeover}.py
│   ├── web/{xss,sqli,port_scan}.py  (port_scan.py 是空文件,占位)
│   └── crypto/{base64,md5}.py
├── services/
│   ├── db_service.py       # 直接连 MySQL,写 oss_scan_logs/security_tool_stats 表
│   └── task_manager.py     # 异步任务调度,带 SSE 进度推送
├── utils/
│   ├── jwt_auth.py         # 解码 JWT,⚠️ 强转 int(userId)
│   └── sse_manager.py      # SSE 流管理,按 task_id 维护 asyncio.Queue
├── models/schemas.py       # Pydantic 模型,XSSScanRequest/SQLiScanRequest 带 URL 校验
├── wordlists/              # 桶名字典 common_bucket_names.txt
└── security/docs/          # Python 后端开发教程,技术方案(中文 markdown)
```

### ⚠️ 跨服务不一致 (已知 bug)

- `utils/jwt_auth.py` 第 25 行 `int(user_id)`,**假设 userId 是整数** — 但 Java 后端 `JwtUtil` 签发的 userId 是 UUID 字符串
- 表现: 任何 Java 签发的 token 用 Python 解码会抛 `ValueError: invalid literal for int()` → 401
- 实际: Python 工具接口**没有真正接入前端认证流**,`get_current_user_id` 依赖现在会让所有 Java 用户 token 401
- 改这个 bug: 要么 `JWTAuth.get_user_id` 返回 `int(payload.get("userId"))` 改 `str(...)` + Python 的 `oss_scan_logs.user_id` 列从 INT 改 VARCHAR(36),要么在登录时额外发一个"数字 id" claim

### Python DB 直接写

`db_service` 用 `pymysql.connect(**DB_CONFIG)`,**不是连接池,每次请求开新连接**。表名硬编码:
- `oss_scan_logs` (user_id, tool_type, scan_mode, target, region, options JSON, status, results JSON, total_tasks, completed_tasks, error_message, created_at, finished_at)
- `security_tool_stats` (tool_type, total_scans, success_count, ON DUPLICATE KEY UPDATE 累加)

这些表**在 Flyway 迁移里没看到** — 可能是手动建表或早期自动生成,加新列要同时改 Java 那边的对应代码。

### 阿里云 OSS Region 白名单

`config.OSS_REGIONS` 是 30+ 区域常量数组,`routers/oss.py:create_scan_task` 会校验 `request.region in OSS_REGIONS` — 新加 region 直接改这个数组,API 立刻生效。

## 前端架构 (`frontend/`)

### 目录

```
frontend/
├── app/                    # Next.js App Router,每个子目录一个路由
│   ├── (页面路由: blog/, photos/, projects/, friends/, notes/, ..., security/, tools/, terminal/, dashboard/)
│   ├── api/                # 自有 Route Handlers (auth/, posts/, public/, security/),只做少数场景
│   ├── layout.tsx          # 全局 layout,带 AuthProvider / ThemeProvider
│   ├── page.tsx            # 首页
│   └── globals.css
├── components/             # 复用 React 组件
├── lib/                    # utils.ts (cn 函数), token.ts (cookie + sessionStorage 取 token)
├── public/                 # 静态资源,默认背景图 public/images/background.jpg
├── skills/                 # (开发文档,非运行时)
├── .env / .env.example / .env.production
├── next.config.js          # ⚠️ 是 .js 不是 .ts,见 README 提的 next.config.ts 不存在
├── tailwind.config.ts / postcss.config.js / tsconfig.json
├── Dockerfile              # 见上表
└── package.json
```

### Auth 流 (前端)

- `AuthProvider` (Context API) 管全局用户态
- Token 拿取顺序 (`lib/token.ts`): **先看 `auth_token` cookie** (httpOnly,后端设置) → fallback 到 `sessionStorage` (登录时后端通过 `X-Token` header 返回,前端读到存)
- 登录成功后后端同时做两件事: 1) `Set-Cookie: auth_token=...; HttpOnly; SameSite=Lax; Domain=...`; 2) `X-Token: <token>` header
- `COOKIE_DOMAIN` 环境变量决定 cookie 作用域 (compose 中设的是 `47.242.21.40`),没设时 `AuthController` 会用 `Domain=localhost` (开发) — **⚠️ 部署时忘记设这个会导致 cookie 跨域失败**

### API 调用约定

- **直接走 `process.env.NEXT_PUBLIC_API_URL`** (默认 `http://localhost:8080`),不走 `next.config.js` 里的 rewrite
- Token 通过 cookie 自动带,JS 读不到,前端业务代码用 `getToken()` 拿的是 `X-Token` 那个备份
- Python 工具调用: `process.env.PYTHON_API_URL` (默认 `http://localhost:8000`),前端 fetch 时手动加 `Authorization: Bearer <token>` 头
- 上传: `POST /api/upload/image` 返回 `{code, data: "/uploads/xxx.jpg"}`,前端拼 `${API_URL}${data}` 显示

### 主题

`next-themes`,三选一: 背景图 (默认) / 浅色 / 深色。背景图就是 `public/images/background.jpg`。选择存 localStorage。

## 数据库

### 默认连接

```yaml
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/myblog?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&useSSL=false
SPRING_DATASOURCE_USERNAME=root   # compose 用 bloguser
SPRING_DATASOURCE_PASSWORD=root   # compose 用 <环境变量注入>
```

### Flyway 迁移目录

`src/main/resources/db/migration/`,文件名 `V<n>__<desc>.sql`。已有:
- `V1_add_index.sql` — 给 posts/notes/photos/... 几乎所有表加索引,80+ 行

新加表/字段流程: 1) 写 entity, 2) 写 `V2__<desc>.sql` (注意是双下划线), 3) `mvn spring-boot:run` 启动时自动执行。

### Python 直连的表

`oss_scan_logs`, `security_tool_stats` — **不在 Flyway 迁移里**。这两张表的 schema 改动要手动 `ALTER TABLE` 或新写 SQL 文件。

## 部署 (CI/CD)

`.github/workflows/build.yml` 推 `main` 触发,步骤:

1. `actions/setup-node@v4` (Node 22) + `actions/setup-java@v4` (Temurin 21, cache=maven)
2. **前端**: `cd frontend && npm ci && npm run build` (环境变量 `NEXT_PUBLIC_API_URL=http://47.242.21.40:8080`, `PYTHON_API_URL=http://47.242.21.40:8000`)
3. **后端**: `mvn clean package -DskipTests` (产物 `target/*.jar`,Dockerfile.backend 多阶段 build 复用)
4. SSH 到阿里云 `47.242.21.40`:
   - `cd /root/workspace/blog`, `git reset --hard origin/main`
   - 写 `frontend/.env.production`
   - **按 `git diff` 范围只重建改动的服务** (改 `src/` 才重建 backend,改 `python/` 才重建 python,改 `compose.yaml` 全重建),这是性能优化
   - `docker compose up -d mysql` 先起 MySQL
   - 改动服务才 `docker compose up -d --build <services>`,否则 `docker compose up -d` (只重启不重建)
   - `sleep 15` 等启动,3 个 `curl /health` 做健康检查

**Secrets**: `ALIYUN_HOST`, `ALIYUN_USER`, `ALIYUN_PASSWORD`, `GITHUB_TOKEN` 都在 GitHub repo settings 里。

**注意**: 本地推到 main 立刻部署,没有 staging 环境,提交前先 `mvn compile` 确认能过。

## 关键非自明约定

1. **后端源码不在 `backend/` 子目录** — `pom.xml` 和 `src/` 都在仓库根
2. **`next.config.js` 不是 `.ts`** — README 提到的 `next.config.ts` 不存在
3. **DDL = validate + Flyway** — 改 entity 必写迁移文件,不然启动崩
4. **JWT 是 UUID String,不是 int** — Python 那边强转 int 是 bug,已知
5. **`Uploads` 公开可访问** — 靠 UUID 文件名做隐式安全,不放敏感内容
6. **CORS 在 `SecurityConfig.corsConfigurationSource` 配** — 从 `CORS_ALLOWED_ORIGINS` 环境变量读,默认 `localhost:3000` + `47.242.21.40*`
7. **`Result` vs `Map` 全局异常** — 成功路径用 `Result<T>`,异常处理路径返 `Map<String, Object>`,前端要同时兼容
8. **每次 push main 立刻部署** — 没有 staging,小改也要完整 build 跑一遍
9. **`<4MB` 内部记忆系统在 `MEMORY.md` / `SOUL.md` / `USER.md` / `memory/`** — 这些是给 AI 用的,不是用户文档,改前先看
10. **`SecurityInterceptor` 是项目自写的,不是 Spring Security** — 优先级在 Spring Security 之前(或之后,看 `WebConfig` 注册顺序,这里两者都是 Spring MVC Interceptor),不要混淆

## 关键参考文档

| 文档 | 内容 |
| --- | --- |
| `AGENTS.md` | 详细目录、命令、API 列表 (本文件不重复) |
| `MEMORY.md` / `SOUL.md` / `USER.md` | AI 上下文(不是用户文档) |
| `docs/SECURITY.md` | 安全架构详解 |
| `docs/SECURITY_TOOLS.md` | `/api/tools/*` 接口规范 |
| `docs/CODE_REVIEW_SECURITY_2026-05-22.md` | 最近安全审计待办 |
| `docs/CODE_AUDIT_AGENT_BUILD_GUIDE_2026-05-22.md` | 代码审计 Agent 接入方案(规划中) |
| `docs/POSTMAN_PLAYWRIGHT_JMETER.md` | 接口/前端/压测工具说明 |
| `SECURITY_REVIEW.md` (根目录) | 2026-04-30 安全审计: SSRF/JWT 默认密钥/弱口令等高危清单 |
| `python/security/docs/Python后端开发教程.md` | Python 服务开发教程 |
| `python/security/docs/技术方案.md` | Python 技术方案 |

## 近期活跃方向 (从 git log 推断)

最近 5 个 commit 集中在安全收紧和修复部署:
- `38b332a 防止ssrf` — `SecurityToolsController` SSRF 防护
- `9bf107c 修复镜像拉去` — Dockerfile 镜像拉取
- `f00b8a0 test的preHandle处理` — `SecurityInterceptor.preHandle` 测试
- `da1f759 前端包出问题` — 前端构建
- `2f3b70c 安全` — 综合安全加固

**改安全相关代码前先 `git log --oneline -20` 看最近动向**,作者在持续加固,新接口要按现有模式走 (`SecurityToolsController` 的 SSRF 防护模板 + `SecurityInterceptor` 的白名单/排除数组)。
