# Blog API 接口文档 v2

> 基础 URL: `http://47.242.21.40:8080`  
> 前端 URL: `http://47.242.21.40`

---

## 接口响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

---

## 一、点赞功能 (PostLike)

### Entity
```java
// post_likes 表
@Table(name = "post_likes")
public class PostLike {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(name = "post_id", nullable = false)
    private String postId;
    
    @Column(name = "user_id")
    private String userId;        // 登录用户
    
    @Column(name = "session_id")
    private String sessionId;    // 匿名用户
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
```

### 点赞/取消点赞
```
POST /api/posts/{postId}/like
Authorization: Bearer {token}  // 可选，登录用户
```
无请求体

**响应:**
```json
{
  "code": 0,
  "data": { "liked": true, "count": 15 }
}
```

### 获取点赞状态
```
GET /api/posts/{postId}/like
Authorization: Bearer {token}  // 可选
```
**响应:**
```json
{
  "code": 0,
  "data": { "liked": false, "count": 15 }
}
```

---

## 二、搜索功能

### 搜索文章
```
GET /api/public/search?q=关键词&page=1&limit=10
```
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | String | ✅ | 搜索关键词 |
| page | Int | - | 页码，默认1 |
| limit | Int | - | 条数，默认10 |

**响应:**
```json
{
  "code": 0,
  "data": {
    "posts": [
      {
        "id": "xxx",
        "slug": "post-slug",
        "title": "文章标题",
        "excerpt": "摘要",
        "coverImage": "http://...",
        "publishedAt": "2026-01-01"
      }
    ],
    "total": 100
  }
}
```

---

## 三、草稿箱

### 获取草稿列表
```
GET /api/posts?status=DRAFT
Authorization: Bearer {token}
```

**响应:**
```json
{
  "code": 0,
  "data": {
    "posts": [
      {
        "id": "xxx",
        "title": "草稿标题",
        "slug": "draft-slug",
        "excerpt": "摘要",
        "updatedAt": "2026-01-01"
      }
    ]
  }
}
```

---

## 四、友链申请 (FriendLink)

### Entity - 新建表
```java
// friend_links 表
@Table(name = "friend_links")
public class FriendLink {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;           // 网站名称
    
    @Column(nullable = false)
    private String url;            // 网站链接
    
    @Column
    private String description;    // 网站描述
    
    @Column
    private String avatar;         // 网站头像
    
    @Column
    private String email;        // 联系邮箱
    
    @Column
    @Enumerated(EnumType.STRING)
    private FriendStatus status;  // PENDING, APPROVED, REJECTED
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}

public enum FriendStatus {
    PENDING, APPROVED, REJECTED
}
```

### 获取友链列表 (公开)
```
GET /api/public/friends
```
**响应:**
```json
{
  "code": 0,
  "data": {
    "friends": [
      {
        "id": "xxx",
        "name": "友链名称",
        "url": "https://...",
        "description": "描述",
        "avatar": "http://..."
      }
    ]
  }
}
```

### 申请友链 (公开)
```
POST /api/friends/apply
Content-Type: application/json

{
  "name": "网站名称",
  "url": "https://...",
  "description": "网站描述",
  "avatar": "http://头像",
  "email": "email@example.com"
}
```
**响应:** `{ "code": 0, "message": "申请成功，等待审核" }`

### 审核友链 (管理员)
```
PUT /api/friends/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "APPROVED"  // 或 REJECTED
}
```

### 获取待审核列表 (管理员)
```
GET /api/friends?status=PENDING
Authorization: Bearer {token}
```

---

## 五、留言板 (Guestbook)

### Entity - 新建表
```java
// guestbooks 表
@Table(name = "guestbooks")
public class Guestbook {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String nickname;     // 昵称
    
    @Column
    private String avatar;    // 头像
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;    // 留言内容
    
    @Column
    private String contact;  // 联系方式(微信/QQ)
    
    @Column(name = "user_id")
    private String userId;    // 管理员
    
    @Column
    @Enumerated(EnumType.STRING)
    private GuestStatus status; // VISIBLE, HIDDEN
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}

public enum GuestStatus {
    VISIBLE, HIDDEN
}
```

### 获取留言列表 (公开)
```
GET /api/public/guestbook?page=1&limit=20
```
**响应:**
```json
{
  "code": 0,
  "data": {
    "guestbooks": [
      {
        "id": "xxx",
        "nickname": "昵称",
        "avatar": "http://...",
        "content": "留言内容",
        "createdAt": "2026-01-01"
      }
    ],
    "total": 50
  }
}
```

### 留言 (公开)
```
POST /api/guestbook
Content-Type: application/json

{
  "nickname": "昵称",
  "avatar": "http://头像(可选)",
  "content": "留言内容",
  "contact": "联系方式(可选)"
}
```

### 删除留言 (管理员)
```
DELETE /api/guestbook/{id}
Authorization: Bearer {token}
```

---

## 六、收藏功能 (Favorite)

### Entity - 新建表
```java
// favorites 表
@Table(name = "favorites")
public class Favorite {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(name = "post_id", nullable = false)
    private String postId;
    
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
```

### 收藏/取消收藏
```
POST /api/posts/{postId}/favorite
Authorization: Bearer {token}
```
**响应:**
```json
{
  "code": 0,
  "data": { "favorited": true }
}
```

### 获取收藏列表
```
GET /api/favorites
Authorization: Bearer {token}
```
**响应:**
```json
{
  "code": 0,
  "data": {
    "favorites": [
      {
        "id": "xxx",
        "post": { "id": "...", "title": "...", "slug": "..." },
        "createdAt": "2026-01-01"
      }
    ]
  }
}
```

---

## 七、项目作品集 (Project)

### Entity - 新建表
```java
// projects 表
@Table(name = "projects")
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;          // 项目名称
    
    @Column(columnDefinition = "TEXT")
    private String description;   // 项目描述
    
    @Column
    private String url;         // 项目链接
    
    @Column
    private String demoUrl;     // 演示链接
    
    @Column
    private String coverImage;   // 封面图
    
    @Column
    private String techStack;   // 技术栈，逗号分隔
    
    @Column
    private Integer sortOrder;  // 排序
    
    @Column
    private Boolean featured;    // 是否推荐
    
    @Column
    @Enumerated(EnumType.STRING)
    private ProjectStatus status; // DRAFT, PUBLISHED
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

public enum ProjectStatus {
    DRAFT, PUBLISHED
}
```

### 获取项目列表 (公开)
```
GET /api/public/projects?page=1&limit=10
```
**响应:**
```json
{
  "code": 0,
  "data": {
    "projects": [
      {
        "id": "xxx",
        "name": "项目名",
        "description": "描述",
        "url": "https://...",
        "coverImage": "http://...",
        "techStack": "React, Node.js",
        "featured": true,
        "createdAt": "2026-01-01"
      }
    ]
  }
}
```

### 获取单个项目 (公开)
```
GET /api/public/projects/{id}
```

### 创建项目 (管理员)
```
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "项目名",
  "description": "描述",
  "url": "https://...",
  "demoUrl": "https://...",
  "coverImage": "http://...",
  "techStack": "React, Node.js",
  "sortOrder": 1,
  "featured": true,
  "status": "PUBLISHED"
}
```

### 更新项目 (管理员)
```
PUT /api/projects/{id}
Authorization: Bearer {token}
```

### 删除项目 (管理员)
```
DELETE /api/projects/{id}
Authorization: Bearer {token}
```

### 获取所有项目 (管理员)
```
GET /api/projects
Authorization: Bearer {token}
```

---

## 八、阅读量统计 (已有 PostView)

### Entity (已存在)
```java
// post_views 表 - 已存在，无需创建
```

### 记录阅读 (公开)
```
POST /api/posts/{postId}/view
```
无请求体

### 获取阅读量 (公开)
```
GET /api/posts/{postId}/view
```
**响应:**
```json
{
  "code": 0,
  "data": { "views": 100 }
}
```

---

## 总结 - 你需要创建的表和接口

| 功能 | 表 | 接口 |
|------|-----|------|
| 点赞 | post_likes (已有) | 3个 |
| 搜索 | 无 | 1个 |
| 草稿箱 | 无 | 1个 |
| 友链 | friend_links | 5个 |
| 留言板 | guestbooks | 4个 |
| 收藏 | favorites | 3个 |
| 项目 | projects | 7个 |

### 实体类需要创建:
1. `FriendLink.java`
2. `Guestbook.java`
3. `Favorite.java`
4. `Project.java`

### DTO 需要创建:
1. `ApplyFriendLinkDTO.java`
2. `CreateGuestbookDTO.java`
3. `CreateProjectDTO.java`

### VO 需要创建:
1. `FriendLinkVO.java`
2. `GuestbookVO.java`
3. `FavoriteVO.java`
4. `ProjectVO.java`