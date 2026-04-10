# API 接口文档

## 基础信息

- 后端地址: `http://localhost:8080`
- 前端地址: `http://localhost:3000`
- 数据格式: JSON
- 统一响应格式: `{ code: 0, message: "success", data: {...}, timestamp: 1775527912787 }`
- 认证方式: `Authorization: Bearer {token}`

---

## 一、认证接口 (无需登录)

### 1.1 登录

```
POST /api/auth/login
```

**请求体:**
```json
{ "username": "admin", "password": "admin123" }
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "1f884642-30e1-11f1-8c69-005056c00001",
      "username": "admin",
      "email": "admin@example.com",
      "displayName": "Aston",
      "avatarUrl": null,
      "bio": "佛山大学计算机专业学生",
      "role": "ADMIN",
      "createdAt": "2026-04-05T19:17:51"
    }
  },
  "timestamp": 1775527912787
}
```

### 1.2 注册

```
POST /api/auth/register
```

**请求体:**
```json
{ "username": "newuser", "email": "user@example.com", "password": "password123" }
```

**响应:** 同登录

### 1.3 获取当前用户

```
GET /api/auth/me
Authorization: Bearer {token}
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "id": "xxx",
      "username": "admin",
      "email": "admin@example.com",
      "displayName": "Aston",
      "avatarUrl": null,
      "bio": "佛山大学计算机专业学生",
      "role": "ADMIN",
      "createdAt": "2026-04-05T19:17:51"
    }
  },
  "timestamp": 1775527912787
}
```

---

## 二、公开接口 (无需登录)

### 2.1 获取文章列表

```
GET /api/public/posts?page=1&limit=10&tag=nextjs
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| limit | int | 否 | 每页数量，默认 10 |
| tag | string | 否 | 标签 slug 筛选 |

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "posts": [{
      "id": "xxx",
      "slug": "my-first-post",
      "title": "我的第一篇文章",
      "excerpt": "文章摘要",
      "coverImage": "https://...",
      "publishedAt": "2026-04-05T19:17:51",
      "viewCount": 100,
      "commentCount": 5,
      "tags": [{ "tag": { "name": "Next.js", "slug": "nextjs" } }]
    }],
    "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 }
  },
  "timestamp": 1775527912787
}
```

### 2.2 获取文章详情

```
GET /api/public/posts/{slug}
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "post": {
      "id": "xxx",
      "slug": "my-first-post",
      "title": "我的第一篇文章",
      "excerpt": "文章摘要",
      "content": "# Markdown 内容...",
      "coverImage": "https://...",
      "publishedAt": "2026-04-05T19:17:51",
      "viewCount": 101,
      "commentCount": 5,
      "tags": [{ "tag": { "name": "Next.js", "slug": "nextjs" } }]
    }
  },
  "timestamp": 1775527912787
}
```

### 2.3 获取标签列表

```
GET /api/public/tags
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tags": [{
      "id": "xxx",
      "name": "Next.js",
      "slug": "nextjs",
      "description": "Next.js 框架相关",
      "postCount": 10
    }]
  },
  "timestamp": 1775527912787
}
```

### 2.4 获取归档

```
GET /api/public/archive
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "archive": [{
      "year": 2026,
      "months": [{
        "month": 4,
        "count": 5,
        "posts": [{ "id": "xxx", "slug": "my-post", "title": "我的文章" }]
      }]
    }]
  },
  "timestamp": 1775527912787
}
```

### 2.5 获取站点统计

```
GET /api/public/stats
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": { "totalPosts": 50, "totalTags": 8, "totalComments": 120 },
  "timestamp": 1775527912787
}
```

### 2.6 获取文章评论

```
GET /api/public/comments/{postId}
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "comments": [{
      "id": "xxx",
      "content": "写得好！",
      "authorName": "访客",
      "createdAt": "2026-04-05T19:17:51"
    }]
  },
  "timestamp": 1775527912787
}
```

### 2.7 发表评论

```
POST /api/public/comments/{postId}
```

**请求体:**
```json
{ "authorName": "访客", "authorEmail": "visitor@example.com", "content": "写得好！" }
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "comment": {
      "id": "xxx",
      "content": "写得好！",
      "authorName": "访客",
      "createdAt": "2026-04-05T19:17:51"
    }
  },
  "timestamp": 1775527912787
}
```

---

## 三、管理接口 (需要登录)

所有以下接口需要在请求头中携带 Token:
```
Authorization: Bearer {token}
```

### 3.1 创建文章

```
POST /api/posts
```

**请求体:**
```json
{
  "title": "文章标题",
  "slug": "my-first-post",
  "excerpt": "文章摘要",
  "content": "# Markdown 内容...",
  "coverImage": "https://example.com/cover.jpg",
  "tags": ["Next.js", "React"],
  "status": "PUBLISHED"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 文章标题 |
| slug | string | 是 | URL 友好标识，需唯一 |
| excerpt | string | 否 | 文章摘要 |
| content | string | 是 | Markdown 正文内容 |
| coverImage | string | 否 | 封面图片 URL |
| tags | string[] | 否 | 标签名称列表 |
| status | string | 否 | DRAFT / PUBLISHED / ARCHIVED，默认 DRAFT |

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "post": {
      "id": "xxx",
      "title": "文章标题",
      "slug": "my-first-post",
      "status": "PUBLISHED",
      "createdAt": "2026-04-05T19:17:51"
    }
  },
  "timestamp": 1775527912787
}
```

### 3.2 获取我的文章列表

```
GET /api/posts?page=1&limit=10&status=PUBLISHED
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| limit | int | 否 | 每页数量，默认 10 |
| status | string | 否 | DRAFT / PUBLISHED / ARCHIVED |

**响应:** 同 2.1 格式

### 3.3 获取文章详情 (管理)

```
GET /api/posts/{id}
```

**响应:** 同 2.2 格式

### 3.4 更新文章

```
PUT /api/posts/{id}
```

**请求体:**
```json
{
  "title": "更新后的标题",
  "slug": "updated-slug",
  "excerpt": "更新后的摘要",
  "content": "# 更新后的内容",
  "coverImage": "https://example.com/new-cover.jpg",
  "tags": ["Next.js", "React", "TypeScript"],
  "status": "PUBLISHED"
}
```

**响应:** 同 3.1 格式

### 3.5 删除文章

```
DELETE /api/posts/{id}
```

**响应:**
```json
{ "code": 0, "message": "success", "data": null, "timestamp": 1775527912787 }
```

### 3.6 更新个人资料

```
PUT /api/users/profile
```

**请求体:**
```json
{
  "displayName": "Aston",
  "bio": "佛山大学计算机专业学生",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": { "user": { ... } },
  "timestamp": 1775527912787
}
```

### 3.7 获取站点设置

```
GET /api/settings
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "settings": [
      { "settingKey": "site_title", "settingValue": "Aston's Blog" },
      { "settingKey": "site_description", "settingValue": "DevSecOps 实践与技术分享" },
      { "settingKey": "posts_per_page", "settingValue": "10" },
      { "settingKey": "allow_comments", "settingValue": "true" }
    ]
  },
  "timestamp": 1775527912787
}
```

### 3.8 更新站点设置

```
PUT /api/settings
```

**请求体:**
```json
{
  "settings": {
    "site_title": "Aston's Blog",
    "site_description": "DevSecOps 实践与技术分享",
    "posts_per_page": "10",
    "allow_comments": "true"
  }
}
```

**响应:**
```json
{ "code": 0, "message": "success", "data": null, "timestamp": 1775527912787 }
```

---

## 四、前端代理路由

| 前端路由 | 方法 | 后端路由 | 说明 |
|---------|------|---------|------|
| `/api/auth/login` | POST | `POST /api/auth/login` | 登录 |
| `/api/auth/register` | POST | `POST /api/auth/register` | 注册 |
| `/api/auth/me` | GET | `GET /api/auth/me` | 获取当前用户 |
| `/api/auth/logout` | POST | 清除 cookie | 退出登录 |
| `/api/public/posts` | GET | `GET /api/public/posts` | 公开文章列表 |
| `/api/public/posts/[slug]` | GET | `GET /api/public/posts/[slug]` | 文章详情 |
| `/api/public/tags` | GET | `GET /api/public/tags` | 标签列表 |
| `/api/public/archive` | GET | `GET /api/public/archive` | 归档 |
| `/api/public/stats` | GET | `GET /api/public/stats` | 站点统计 |
| `/api/public/comments/[id]` | GET | `GET /api/public/comments/[id]` | 获取评论 |
| `/api/posts/[id]/comments` | POST | `POST /api/public/comments/[id]` | 发表评论 |
| `/api/posts` | GET/POST | `GET/POST /api/posts` | 管理文章列表/创建 |
| `/api/posts/[id]` | GET/PUT/DELETE | `GET/PUT/DELETE /api/posts/[id]` | 管理单篇文章 |
| `/api/users/profile` | PUT | `PUT /api/users/profile` | 更新资料 |
| `/api/settings` | GET/PUT | `GET/PUT /api/settings` | 站点设置 |

---

## 五、错误码

| code | message | 说明 |
|------|---------|------|
| 0 | success | 成功 |
| 400 | 请求参数错误 | 参数校验失败 |
| 401 | 未登录 | Token 无效或过期 |
| 403 | 权限不足 | 无权访问该资源 |
| 404 | 资源不存在 | 请求的资源未找到 |
| 500 | 服务器内部错误 | 服务器异常 |

---

## 六、默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | ADMIN |
