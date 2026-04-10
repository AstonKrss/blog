# Aston's Blog

个人博客系统，前端 Next.js + 后端 Spring Boot

## 项目结构

```
blog/
├── frontend/          # 前端 (Next.js 15)
└── backend/           # 后端 (Spring Boot 3.2)
```

## 启动方式

### 1. 启动后端 (端口 8080)

```bash
cd blog/backend
mvn spring-boot:run
```

### 2. 启动前端 (端口 3000)

```bash
cd blog/frontend
npm run dev
```

### 3. 访问

- 前端: http://localhost:3000
- 后端API: http://localhost:8080

## 数据库配置

MySQL 8.0+，数据库名 `myblog`，用户名 `root`，密码 `root`

后端会自动创建表结构 (ddl-auto: update)

## 默认账号

- 用户名: admin
- 密码: admin123
