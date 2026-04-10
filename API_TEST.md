# Aston's Blog API 测试 (Apifox)

## 环境
- Base URL: http://localhost:8080

---

## 1. 登录
**POST** `/api/auth/login`

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGci...",
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

## 2. 获取公开文章列表
**GET** `/api/public/posts?page=1&limit=10`

**Headers:** (可选)
```
Authorization: Bearer {token}
```

---

## 3. 获取公开文章列表 (按标签筛选)
**GET** `/api/public/posts?page=1&limit=10&tag=nextjs`

---

## 4. 获取文章详情 (公开)
**GET** `/api/public/posts/{slug}`

Example: `/api/public/posts/my-first-post`

---

## 5. 获取标签列表
**GET** `/api/public/tags`

---

## 6. 获取站点统计
**GET** `/api/public/stats`

---

## 7. 获取归档
**GET** `/api/public/archive`

---

## 8. 获取当前用户信息
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 9. 创建文章 (需登录)
**POST** `/api/posts`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "title": "我的第一篇文章",
  "slug": "my-first-post",
  "excerpt": "文章摘要",
  "content": "# Markdown 内容...",
  "coverImage": "https://example.com/cover.jpg",
  "tags": ["Next.js", "React"],
  "status": "PUBLISHED"
}
```

---

## 10. 获取我的文章列表 (需登录)
**GET** `/api/posts?page=1&limit=10&status=PUBLISHED`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 11. 获取文章详情 (管理) (需登录)
**GET** `/api/posts/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 12. 更新文章 (需登录)
**PUT** `/api/posts/{id}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

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

---

## 13. 删除文章 (需登录)
**DELETE** `/api/posts/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 14. 获取站点设置 (需登录)
**GET** `/api/settings`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 15. 更新站点设置 (需登录)
**PUT** `/api/settings`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

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

---

## 16. 更新个人资料 (需登录)
**PUT** `/api/users/profile`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "displayName": "Aston",
  "bio": "佛山大学计算机专业学生",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

---

## 17. 注册
**POST** `/api/auth/register`

```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123"
}
```

---

## 18. 获取文章评论 (公开)
**GET** `/api/public/comments/{postId}`

---

## 19. 发表评论 (公开)
**POST** `/api/public/comments/{postId}`

```json
{
  "authorName": "访客",
  "authorEmail": "visitor@example.com",
  "content": "写得好！"
}
```