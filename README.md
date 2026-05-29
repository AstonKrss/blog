# Aston's Blog

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-6DB33F?logo=springboot&logoColor=fff)
![Java](https://img.shields.io/badge/Java-17%2B-007396?logo=openjdk&logoColor=fff)
![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688?logo=fastapi&logoColor=fff)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=fff)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=fff)
![License](https://img.shields.io/badge/License-MIT-blue)

一个偏 DevSecOps 风格的全栈个人博客系统。项目包含博客内容管理、相册、旅行地图、留言板、友链、RSS、在线工具、安全工具箱、终端学习中心和后台管理。

前端使用 **Next.js 15 App Router**，后端使用 **Spring Boot 4.0**，安全工具服务使用 **Python FastAPI**，数据持久化使用 **MySQL 8.0**。

## 目录

- [功能亮点](#功能亮点)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [项目结构](#项目结构)
- [页面路由](#页面路由)
- [核心 API](#核心-api)
- [开发命令](#开发命令)
- [部署说明](#部署说明)
- [安全说明](#安全说明)
- [相关文档](#相关文档)

## 功能亮点

- **博客系统**：文章发布、草稿、标签、归档、搜索、评论、点赞、阅读目录。
- **后台管理**：文章、项目、相册、友链、站点设置、访问统计等管理入口。
- **认证系统**：JWT 登录、注册验证码、邮箱验证、用户资料、密码修改。
- **旅行地图**：基于 ECharts 的中国地图足迹展示，支持登录后标记足迹。
- **RSS 订阅**：提供 `/rss` 展示页和 `/rss.xml` 订阅入口。
- **默认背景图主题**：全站默认使用背景图主题，也可手动切换浅色/深色。
- **Command Palette**：按 `⌘K` 或 `/` 打开命令面板，快速跳转页面、切换主题、使用工具。
- **终端学习中心**：内置类 Linux 终端，支持 `learn docker`、`learn linux`、`learn git` 等学习命令。
- **安全工具箱**：XSS/SQLi 检测、OSS 扫描、路径模糊测试、端口扫描、编码解码、哈希计算等。
- **代码审计 Agent 规划**：已提供代码审计 Agent 的后端搭建文档和前端入口页面。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | Next.js 15, React 19, TypeScript, Tailwind CSS, next-themes, ECharts, Lucide Icons |
| 后端 | Spring Boot 4.0, Spring Security, Spring Data JPA, Jakarta Validation, JJWT, Lombok |
| 安全工具服务 | Python 3.11, FastAPI, Uvicorn, Pydantic, HTTPX, PyMySQL |
| 数据库 | MySQL 8.0 |
| 部署 | Docker, Docker Compose, GitHub Actions |

> 说明：`pom.xml` 当前配置 `java.version=17`，后端 Docker 镜像使用 Java 21。建议本地至少使用 Java 17，生产镜像按 Dockerfile 使用 Java 21。

## 快速开始

### 方式一：Docker Compose

```bash
docker compose up -d --build
```

默认端口：

| 服务 | 地址 |
| --- | --- |
| 前端 | http://localhost:3000 或 compose 映射后的 http://localhost |
| 后端 | http://localhost:8080 |
| Python 安全工具 | http://localhost:8000 |
| MySQL | localhost:3306 |

### 方式二：本地开发

启动 MySQL 后，分别启动后端、前端和 Python 服务。

后端：

```bash
mvn spring-boot:run
```

前端：

```bash
cd frontend
npm install
npm run dev
```

Python 安全工具：

```bash
cd python
pip install -r requirements.txt
python app.py
```

访问：

```text
http://localhost:3000
```

## 环境变量

### 后端

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/myblog...` | MySQL 连接地址 |
| `SPRING_DATASOURCE_USERNAME` | `root` | 数据库用户名 |
| `SPRING_DATASOURCE_PASSWORD` | `root` | 数据库密码 |
| `JWT_SECRET` | 代码内默认值 | JWT 签名密钥，生产必须替换 |
| `JWT_EXPIRATION` | `86400000` | Token 过期时间 |
| `MAIL_HOST` | `smtp.qq.com` | 邮件服务器 |
| `MAIL_PORT` | `587` | 邮件端口 |
| `MAIL_USERNAME` | 空 | 邮箱账号 |
| `MAIL_PASSWORD` | 空 | 邮箱授权码 |
| `BLOG_SITE_URL` | `http://localhost:8080` | 后端站点地址 |
| `BLOG_OWNER_EMAIL` | 空 | 站长邮箱 |
| `BLOG_OWNER_NAME` | `Aston` | 站长名称 |

### 前端

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | 后端 API 地址 |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | 前端站点地址 |
| `PYTHON_API_URL` | `http://localhost:8000` | Python 安全工具服务地址 |

### Python 服务

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_HOST` | `localhost` | MySQL 主机 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_NAME` | `myblog` | 数据库名 |
| `DB_USER` | `root` | 数据库用户 |
| `DB_PASSWORD` | 空 | 数据库密码 |
| `JWT_SECRET` | 空 | 与后端保持一致 |
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `PORT` | `8000` | 服务端口 |
| `CORS_ORIGINS` | `http://localhost:3000` | CORS 白名单 |

## 项目结构

```text
blog/
├── src/main/java/com/aston/blog/
│   ├── Controller/          # REST Controller
│   ├── Service/             # Service 接口
│   ├── Service/impl/        # Service 实现
│   ├── dto/                 # 请求 DTO
│   ├── vo/                  # 响应 VO
│   ├── entity/              # JPA 实体
│   ├── repository/          # Spring Data JPA Repository
│   ├── common/              # Result、JWT、异常处理等
│   ├── config/              # Security、Web、拦截器配置
│   └── util/                # 工具类
├── src/main/resources/
│   └── application.yml      # 后端配置
├── frontend/
│   ├── app/                 # Next.js App Router 页面
│   ├── components/          # React 组件
│   ├── lib/                 # 前端工具函数
│   └── public/              # 静态资源
├── python/
│   ├── modules/             # 安全扫描模块
│   ├── routers/             # FastAPI 路由
│   ├── services/            # 任务、数据库、扫描服务
│   └── utils/               # JWT、SSE 等工具
├── docs/                    # 项目文档、审计报告、优化方案
├── compose.yaml             # Docker Compose
├── Dockerfile.backend       # 后端镜像
└── README.md
```

## 页面路由

| 路径 | 功能 |
| --- | --- |
| `/` | 首页 |
| `/blog` | 博客列表 |
| `/blog/[slug]` | 博客详情 |
| `/archive` | 文章归档 |
| `/tags` | 标签 |
| `/timeline` | 时间线 |
| `/travel` | 旅行足迹地图 |
| `/photos` | 相册 |
| `/projects` | 项目展示 |
| `/friends` | 友链 |
| `/guestbook` | 留言板 |
| `/search` | 搜索 |
| `/tools` | 在线工具 |
| `/security/tools` | 安全工具箱 |
| `/security/tools/code-audit` | 代码审计 Agent 前端入口 |
| `/terminal` | 终端学习中心 |
| `/games` | 小游戏 |
| `/notes` | 笔记 |
| `/resources` | 资源导航 |
| `/about` | 关于 |
| `/dashboard/*` | 管理后台 |
| `/login` | 登录 |
| `/register` | 注册 |
| `/verify` | 邮箱验证 |
| `/rss` | RSS 订阅页 |

## 核心 API

### 公开 API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/public/posts` | GET | 公开文章列表 |
| `/api/public/posts/{slug}` | GET | 文章详情 |
| `/api/public/tags` | GET | 标签 |
| `/api/public/archive` | GET | 归档 |
| `/api/public/comments/{postId}` | GET/POST | 评论 |
| `/api/public/search` | GET | 搜索 |
| `/api/public/online` | GET | 在线人数 |
| `/api/public/footprints` | GET | 公开旅行足迹 |
| `/api/public/photos` | GET | 公开相册 |
| `/api/public/projects` | GET | 公开项目 |
| `/api/public/friends` | GET | 公开友链 |
| `/api/public/guestbook` | GET | 公开留言 |

### 认证 API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 |
| `/api/auth/send-code` | POST | 发送验证码 |
| `/api/auth/verify` | GET | 邮箱验证 |
| `/api/auth/resend-verify` | POST | 重发验证邮件 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 当前用户 |

### 管理与业务 API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/posts` | GET/POST | 文章列表、创建 |
| `/api/posts/{id}` | GET/PUT/DELETE | 文章详情、更新、删除 |
| `/api/posts/{postId}/like` | GET/POST | 点赞状态、点赞 |
| `/api/notes` | GET/POST | 笔记 |
| `/api/photos/upload` | POST | 相册上传 |
| `/api/projects` | GET/POST | 项目管理 |
| `/api/friends` | GET | 友链管理 |
| `/api/friends/apply` | POST | 友链申请 |
| `/api/footprints` | GET/POST | 足迹管理 |
| `/api/settings` | GET/PUT | 站点设置 |
| `/api/users` | GET | 用户信息 |
| `/api/users/profile` | PUT | 更新资料 |
| `/api/users/password` | PUT | 修改密码 |
| `/api/upload/image` | POST | 图片上传 |
| `/api/upload/media` | POST | 媒体上传 |
| `/api/admin/security/*` | GET/POST | 安全日志与威胁审查 |

### 安全工具 API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/tools/ip-info` | GET | IP 信息 |
| `/api/tools/dns` | GET | DNS 查询 |
| `/api/tools/whois` | GET | Whois 查询 |
| `/api/tools/subdomains` | GET | 子域名枚举 |
| `/api/tools/port-scan` | GET | 端口扫描 |
| `/api/tools/http-headers` | GET | HTTP Header 检测 |
| `/api/tools/cors-test` | GET | CORS 测试 |
| `/api/tools/cve-search` | GET | CVE 搜索 |
| `/api/tools/breach-check` | GET | 泄露检查 |

## 开发命令

### 后端

```bash
mvn spring-boot:run
mvn compile
mvn test
mvn clean package -DskipTests
```

### 前端

```bash
cd frontend
npm install
npm run dev
npm run build
npm run start
```

### Python

```bash
cd python
pip install -r requirements.txt
python app.py
```

### Docker

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

## 主题系统

项目目前提供三种主题：

- 背景图主题：默认主题，使用 `frontend/public/images/background.jpg`。
- 浅色主题：适合阅读内容。
- 深色主题：适合终端和安全工具页面。

用户可以通过顶部主题按钮或 Command Palette 手动切换，选择会保存在浏览器本地。

## 数据库

当前配置位于 `src/main/resources/application.yml`：

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

开发环境可以使用 `update` 快速迭代表结构。生产环境建议改为 `validate` 或 `none`，并使用 SQL 迁移工具管理表结构。

## 部署说明

项目支持 Docker Compose 一键部署：

```bash
docker compose up -d --build
```

生产部署建议：

- 使用 `.env` 或平台 secrets 管理数据库密码、JWT 密钥、邮箱授权码。
- 将 `NEXT_PUBLIC_API_URL` 配置成公网后端地址。
- 将 `BLOG_SITE_URL` 配置成后端公网地址。
- 将 `COOKIE_DOMAIN` 配置成正式域名。
- 在反向代理层启用 HTTPS。
- 对 `/api/tools/*` 这类可发起网络请求的接口增加鉴权和目标限制。

## 安全说明

这是一个学习和个人站点项目，当前仓库仍保留一些开发阶段配置。上线前请至少完成：

- 替换 `compose.yaml` 中的示例密码、JWT 密钥和邮箱授权码。
- 不要把生产 `.env`、数据库备份、上传目录敏感文件提交到 Git。
- 生产环境关闭 Hibernate 自动改表，改用迁移脚本。
- 收紧 Spring Security 的 `permitAll` 范围。
- 为安全工具接口增加 SSRF 防护、速率限制和管理员权限校验。
- 为上传接口增加文件类型、扩展名、大小、内容检测。

更完整的审计建议见 `docs/CODE_REVIEW_SECURITY_2026-05-22.md`。

## 相关文档

| 文档 | 说明 |
| --- | --- |
| `docs/CODE_REVIEW_SECURITY_2026-05-22.md` | 项目安全代码审计报告 |
| `docs/PERFORMANCE_OPTIMIZATION_PLAN_2026-05-22.md` | 性能优化方案 |
| `docs/CODE_AUDIT_AGENT_BUILD_GUIDE_2026-05-22.md` | 代码审计 Agent 接入教程 |
| `docs/SECURITY_TOOLS.md` | 安全工具接口说明 |
| `docs/POSTMAN_PLAYWRIGHT_JMETER.md` | 接口、前端、压测工具说明 |

## License

MIT
