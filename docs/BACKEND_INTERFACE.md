# 功能扩展接口文档

## 目录

1. [RSS Feed](#1-rss-feed)
2. [SEO 优化](#2-seo-优化)
3. [评论邮件通知](#3-评论邮件通知)
4. [文章目录](#4-文章目录)

---

## 1. RSS Feed

### 接口说明

生成符合 RSS 2.0 标准的博客订阅源，包含所有已发布的文章。

### 接口地址

```
GET /rss.xml
```

### 响应格式

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Aston's Blog</title>
    <link>https://blog.example.com</link>
    <description>博客描述</description>
    <language>zh-CN</language>
    <lastBuildDate>Wed, 01 Jan 2025 00:00:00 GMT</lastBuildDate>
    <atom:link href="https://blog.example.com/rss.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>文章标题</title>
      <link>https://blog.example.com/blog/slug</link>
      <guid isPermaLink="true">https://blog.example.com/blog/slug</guid>
      <description><![CDATA[文章摘要内容]]></description>
      <pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate>
      <author>author@example.com (作者名)</author>
      <category>标签1</category>
      <category>标签2</category>
    </item>
  </channel>
</rss>
```

### 需要返回的字段

| 字段 | 说明 | 示例 |
|------|------|------|
| title | 频道/网站标题 | Aston's Blog |
| link | 网站地址 | https://blog.example.com |
| description | 网站描述 | 个人技术博客 |
| language | 语言 | zh-CN |
| lastBuildDate | 最后构建时间 | RFC 822 格式 |
| item/title | 文章标题 | Spring Boot 入门 |
| item/link | 文章链接 | https://blog.example.com/blog/spring-boot |
| item/guid | 文章唯一标识 | 文章链接 |
| item/description | 文章摘要(CDATA) | 文章摘要内容 |
| item/pubDate | 发布时间 | RFC 822 格式 |
| item/author | 作者信息 | email@example.com (Aston) |
| item/category | 标签 | Java |

---

## 2. SEO 优化

### 2.1 Sitemap

#### 接口地址

```
GET /sitemap.xml
```

#### 响应格式

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://blog.example.com/</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://blog.example.com/blog/spring-boot</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 2.2 Robots.txt

#### 接口地址

```
GET /robots.txt
```

#### 响应格式

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /uploads/

Sitemap: https://blog.example.com/sitemap.xml
```

---

## 3. 评论邮件通知

### 3.1 新评论通知博主

当有新的匿名评论时，发送邮件通知博主。

### 邮件配置 (application.properties)

```properties
# 邮件服务器配置
spring.mail.host=smtp.example.com
spring.mail.port=587
spring.mail.username=notify@example.com
spring.mail.password=yourpassword
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# 博主邮箱
blog.owner.email=admin@example.com
blog.owner.name=Aston
```

### 邮件内容模板

**主题**: `[Aston's Blog] 新评论通知 - 《文章标题》`

**内容**:
```
您好，Aston！

您收到了新的评论：

文章：《文章标题》
评论者：访客名
邮箱：visitor@example.com
网站：https://example.com

评论内容：
---
这是一条评论内容...
---

---
Aston's Blog
```

### 3.2 回复通知评论者

当评论被回复时，发送邮件通知原评论者。

**主题**: `[Aston's Blog] 您的评论有了新回复`

**内容**:
```
您好，访客名！

您在《文章标题》下的评论收到了回复：

您的评论：
> 原评论内容...

博主/访客的回复：
---
回复内容...
---

查看完整讨论：https://blog.example.com/blog/article-slug#comment-id
```

---

## 4. 文章目录

### 接口说明

从 Markdown 内容中解析出标题结构，生成目录树。

### 接口地址

```
GET /api/public/posts/{slug}/toc
```

### 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "headings": [
      {
        "id": "introduction",
        "text": "介绍",
        "level": 1,
        "children": [
          {
            "id": "what-is-markdown",
            "text": "什么是 Markdown",
            "level": 2,
            "children": []
          }
        ]
      },
      {
        "id": "basic-syntax",
        "text": "基本语法",
        "level": 1,
        "children": [
          {
            "id": "headings",
            "text": "标题",
            "level": 2,
            "children": []
          }
        ]
      }
    ]
  }
}
```

### 标题层级说明

| Level | HTML 标签 | 说明 |
|-------|-----------|------|
| 1 | h1 | 文章主标题 |
| 2 | h2 | 二级标题（章） |
| 3 | h3 | 三级标题（节） |
| 4-6 | h4-h6 | 更细分的章节 |

### ID 生成规则

从标题文本生成：
1. 转小写
2. 空格替换为 `-`
3. 特殊字符移除或替换
4. 连续横线合并为单横线

示例：
- "什么是 Markdown?" → `what-is-markdown`
- "Hello World!" → `hello-world`
- "第 1 步：入门" → `第-1-步入门`

---

## 通用说明

### 日期格式

RSS 使用 RFC 822 格式：
```java
// Java 格式化示例
import java.util.Locale;
SimpleDateFormat rssDate = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss Z", Locale.ENGLISH);
String dateStr = rssDate.format(new Date());
```

### Content-Type

| 接口 | Content-Type |
|------|--------------|
| /rss.xml | application/rss+xml; charset=utf-8 |
| /sitemap.xml | application/xml; charset=utf-8 |
| /robots.txt | text/plain; charset=utf-8 |
| /api/* | application/json; charset=utf-8 |

### 缓存策略

| 接口 | 缓存时间 | 说明 |
|------|----------|------|
| /rss.xml | 1 小时 | 可设置 Cache-Control |
| /sitemap.xml | 6 小时 | 定期更新 |
| /robots.txt | 24 小时 | 很少变化 |
| /api/public/posts/{slug}/toc | 1 小时 | 随文章更新 |

### 安全考虑

1. **RSS/Sitemap**: 公开接口，无需认证
2. **邮件通知**: 不在接口中暴露博主真实邮箱
3. **评论通知**: 验证邮箱格式，防止垃圾邮件
