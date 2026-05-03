# Aston's Blog

全栈博客系统，前端 **Next.js 15 (App Router)** + 后端 **Spring Boot 4.0 (Java 21)**，数据库 **MySQL 8.0**。

## 🆕 新增功能

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

## 🚀 快速开始

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

## 📁 项目结构

```
blog/
├── src/main/java/com/aston/blog/
│   ├── Controller/          # REST 控制器
│   ├── Service/impl/        # 业务逻辑
│   ├── dto/                 # 请求 DTO
│   ├── vo/                  # 响应 VO
│   ├── entity/              # JPA 实体
│   └── repository/          # 数据仓库
├── frontend/                # Next.js 15
│   └── app/                 # 页面路由
│       └── components/      # 组件
├── compose.yaml             # Docker Compose
└── docs/                    # 文档
```

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15, React, TypeScript, TailwindCSS, next-themes |
| 后端 | Spring Boot 4.0, Java 21, Spring Security, JPA |
| 数据库 | MySQL 8.0 |
| 部署 | Docker, Docker Compose, GitHub Actions |

## 🔧 终端命令

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

## 🔐 登录命令

```bash
login username -p password
```

## 📊 API 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 (需验证码) |
| `/api/auth/send-code` | POST | 发送注册验证码 |
| `/api/public/posts` | GET | 公开文章列表 |
| `/api/public/online` | GET | 实时在线人数 |
| `/api/footprints` | GET/POST/DELETE | 旅行足迹 |

## 🌈 主题系统

三个主题：深色 / 浅色 / 背景图

按路由自动切换：
- 首页 `/` — 深色
- 博客 `/blog` — 浅色
- 用户可随时通过顶部切换器覆盖

## 🗄️ 数据库

- **DDL 策略**: `spring.jpa.hibernate.ddl-auto=update`
- **连接配置**: 环境变量 `SPRING_DATASOURCE_URL/USER/PASSWORD`

## 🌐 部署

Push 到 `main` 分支自动触发 GitHub Actions：
1. 前端构建
2. 后端打包
3. SSH 部署到阿里云

## 📝 开发笔记

### 邮箱验证流程

```
用户注册 → 发送验证码 → 验证邮箱 → 完成注册
```

### Docker 共享存储

前后端通过 volumes 共享 `/app/uploads` 目录。

## 📄 License

MIT
