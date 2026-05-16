# Aston's Blog

全栈博客系统，前端 **Next.js 15 (App Router)** + 后端 **Spring Boot 4.0 (Java 21)** + **Python FastAPI (安全工具)**，数据库 **MySQL 8.0**。

## 新增功能

### Command Palette (`⌘K`)
按 `⌘K` 或 `/` 打开快捷命令面板，搜索页面、切换主题、快速计算。

内置工具：
- 计算器 — 输入数学表达式
- Base64 编解码
- 颜色转换 — HEX ↔ RGB ↔ HSL
- Slug 生成器 — 中文转 URL-safe 格式
- UUID 生成器
- 密码生成器

### 阅读进度条
博客文章顶部显示玫瑰色进度条，阅读超过 10% 后右上角弹出"剩余 X 分钟"提示。

### 实时在线人数
左下角显示"当前 X 人在浏览"，基于过去 5 分钟独立 IP 统计。

### 终端学习中心

博客内置交互式 Linux 终端，支持 **learn** 命令学习 DevOps 技能！

| 命令 | 内容 |
|------|------|
| `learn` | 查看所有可用主题 |
| `learn docker` | 容器化技术入门 |
| `learn dockerfile` | Dockerfile 编写指南 |
| `learn dockercompose` | Docker Compose 使用 |
| `learn linux` | Linux 命令行基础 |
| `learn git` | Git 版本控制 |
| `learn nginx` | Nginx Web 服务器 |

### 安全工具箱
集成常用安全检测工具：XSS 检测、SQL 注入检测、算法检测、OSS 存储桶扫描、路径模糊测试、子域名 takeover 检测、端口扫描、URL 模板模糊测试等。

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
docker compose up -d
```

访问 http://localhost:3000

### 方式二：本地开发

**后端 (端口 8080)**
```bash
mvn spring-boot:run
```

**前端 (端口 3000)**
```bash
cd frontend
npm install
npm run dev
```

## 项目结构

```
blog/
├── src/main/java/com/aston/blog/
│   ├── Controller/          # REST 控制器 (17个)
│   ├── Service/impl/       # 业务逻辑实现
│   ├── dto/                # 请求 DTO
│   ├── vo/                 # 响应 VO
│   ├── entity/             # JPA 实体
│   ├── repository/         # 数据仓库
│   ├── config/             # 配置类
│   ├── common/             # 公共工具 (JWT等)
│   └── util/               # 工具类
├── frontend/                # Next.js 15
│   ├── app/               # 页面路由
│   │   ├── blog/          # 博客文章
│   │   ├── dashboard/     # 管理后台
│   │   ├── travel/        # 旅行足迹
│   │   └── ...
│   └── api/               # API 代理路由
├── python/                  # Python FastAPI 安全工具
│   ├── modules/           # 扫描模块 (oss, web, crypto)
│   ├── routers/           # API 路由
│   ├── services/          # 任务管理、数据库服务
│   └── utils/             # JWT 认证、SSE
├── compose.yaml            # Docker Compose
└── docs/                   # 文档
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15, React, TypeScript, TailwindCSS, next-themes |
| 后端 | Spring Boot 4.0, Java 21, Spring Security, JPA |
| Python | FastAPI, uvicorn, pydantic, pymysql, python-jose |
| 数据库 | MySQL 8.0 |
| 部署 | Docker, Docker Compose, GitHub Actions |

## 页面功能

| 路径 | 功能 |
|------|------|
| `/` | 首页 |
| `/blog` | 博客列表 |
| `/blog/[slug]` | 博客详情 |
| `/archive` | 归档 |
| `/tags` | 标签 |
| `/timeline` | 时间线 |
| `/travel` | 旅行足迹 (中国地图) |
| `/photos` | 相册 |
| `/projects` | 项目展示 |
| `/friends` | 友链申请 |
| `/guestbook` | 留言板 |
| `/search` | 搜索 |
| `/tools` | 在线工具 |
| `/terminal` | 终端模拟器 |
| `/games` | 小游戏 |
| `/notes` | 笔记 |
| `/resources` | 资源导航 |
| `/about` | 关于 |
| `/dashboard/*` | 管理后台 (文章/相册/项目管理等) |
| `/login` | 登录 |
| `/register` | 注册 |
| `/verify` | 邮箱验证 |
| `/rss` | RSS 订阅 |

## 终端命令

```
help        # 帮助
ls [-l]     # 列出目录
cd <dir>    # 切换目录
cat <file>  # 查看文件
vim <file>  # 编辑文件 (需登录)
top         # 系统监控
ps aux      # 进程列表
free -h     # 内存使用
df -h       # 磁盘使用
neofetch    # 系统信息
matrix      # 黑客帝国效果
learn       # 学习中心
```

## 登录命令

```bash
login username -p password
```

## API 接口

### 认证相关
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 (需验证码) |
| `/api/auth/send-code` | POST | 发送注册验证码 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 当前用户信息 |

### 公开接口
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/public/posts` | GET | 公开文章列表 |
| `/api/public/posts/[slug]` | GET | 文章详情 |
| `/api/public/tags` | GET | 标签列表 |
| `/api/public/archive` | GET | 归档信息 |
| `/api/public/comments` | GET | 公开评论 |
| `/api/public/online` | GET | 实时在线人数 |

### 文章相关
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/posts` | GET/POST | 文章列表/创建 |
| `/api/posts/[id]/comments` | GET/POST | 评论 |
| `/api/posts/[id]` | GET/PUT/DELETE | 文章 CRUD |

### 其他接口
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/footprints` | GET/POST/DELETE | 旅行足迹 |
| `/api/photos` | GET/POST | 相册管理 |
| `/api/projects` | GET/POST | 项目展示 |
| `/api/friends` | GET/POST | 友链管理 |
| `/api/guestbook` | GET/POST | 留言板 |
| `/api/notes` | GET/POST | 笔记 |
| `/api/analytics` | GET | 访问统计 |
| `/api/settings` | GET/PUT | 站点设置 |
| `/api/terminal` | POST | 终端命令执行 |
| `/api/upload` | POST | 文件上传 |
| `/api/security/oss/scan` | POST | OSS 存储桶扫描 |
| `/api/security/web/scan` | POST | Web 安全扫描 |
| `/api/security/crypto/encode` | POST | 加密/编码工具 |
| `/api/security/crypto/decode` | POST | 解密/解码工具 |

## 主题系统

三个主题：深色 / 浅色 / 背景图

按路由自动切换：
- 首页 `/` — 深色
- 博客 `/blog` — 浅色
- 用户可随时通过顶部切换器覆盖

## 数据库

- **DDL 策略**: `spring.jpa.hibernate.ddl-auto=update`
- **连接配置**: 环境变量 `SPRING_DATASOURCE_URL/USER/PASSWORD`

## 部署

Push 到 `main` 分支自动触发 GitHub Actions：
1. 前端构建
2. 后端打包
3. Python 安全工具镜像构建
4. SSH 部署到阿里云

## 开发笔记

### 邮箱验证流程

```
用户注册 → 发送验证码 → 验证邮箱 → 完成注册
```

### Docker 共享存储

前后端通过 volumes 共享 `/app/uploads` 目录。

## License

MIT
