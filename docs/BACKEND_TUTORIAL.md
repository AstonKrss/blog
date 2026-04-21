# 后端功能扩展教程

本教程手把手教你实现四个功能。请按照步骤操作，理解原理后自己敲代码。

---

## 准备工作

### 添加 Maven 依赖

在 `pom.xml` 的 `<dependencies>` 中添加：

```xml
<!-- RSS 和sitemap 需要的 XML 处理 -->
<!-- Spring Boot 已自带，无需额外依赖 -->

<!-- 邮件通知需要的依赖 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<!-- Markdown 解析（用于文章目录） -->
<dependency>
    <groupId>org.commonmark</groupId>
    <artifactId>commonmark</artifactId>
    <version>0.21.0</version>
</dependency>
```

### 配置文件

在 `application.properties` 添加：

```properties
# 邮件配置（评论通知用）
spring.mail.host=smtp.qq.com
spring.mail.port=587
spring.mail.username=你的邮箱@qq.com
spring.mail.password=你的授权码
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# 博主信息
blog.owner.email=你的邮箱@qq.com
blog.owner.name=Aston
blog.site.url=https://你的博客域名.com
```

---

## 1. RSS Feed 教程

### 目标

创建 `RssController.java`，访问 `/rss.xml` 返回 RSS 2.0 格式的博客订阅源。

### 步骤 1：创建 Controller

**文件位置**: `src/main/java/com/aston/blog/Controller/RssController.java`

```java
package com.aston.blog.Controller;

import com.aston.blog.entity.Post;
import com.aston.blog.entity.Tag;
import com.aston.blog.repository.PostRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping
public class RssController {

    private final PostRepository postRepository;
    
    // RFC 822 日期格式（RSS 标准）
    private static final DateTimeFormatter RFC822_FORMAT = 
        DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.ENGLISH);

    public RssController(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    @GetMapping(value = "/rss.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> generateRss() {
        // 1. 获取所有已发布的文章（按发布时间倒序）
        List<Post> posts = postRepository.findPublishedWithAuthorAndTags(
            org.springframework.data.domain.PageRequest.of(0, 20)
        ).getContent();

        // 2. 构建 RSS XML
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n");
        xml.append("  <channel>\n");
        xml.append("    <title>Aston's Blog</title>\n");
        xml.append("    <link>https://blog.example.com</link>\n");
        xml.append("    <description>技术博客，记录成长</description>\n");
        xml.append("    <language>zh-CN</language>\n");
        xml.append("    <lastBuildDate>").append(getRssDate(java.time.ZonedDateTime.now())).append("</lastBuildDate>\n");
        xml.append("    <atom:link href=\"https://blog.example.com/rss.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n");

        // 3. 遍历文章生成 item
        for (Post post : posts) {
            xml.append("    <item>\n");
            xml.append("      <title><![CDATA[").append(escapeXml(post.getTitle())).append("]]></title>\n");
            xml.append("      <link>https://blog.example.com/blog/").append(post.getSlug()).append("</link>\n");
            xml.append("      <guid isPermaLink=\"true\">https://blog.example.com/blog/").append(post.getSlug()).append("</guid>\n");
            
            // 摘要用 CDATA 包裹，避免 XML 转义问题
            String description = post.getExcerpt() != null ? post.getExcerpt() : "";
            xml.append("      <description><![CDATA[").append(description).append("]]></description>\n");
            
            // 发布时间
            if (post.getPublishedAt() != null) {
                xml.append("      <pubDate>").append(getRssDate(post.getPublishedAt().atZone(ZoneId.systemDefault()))).append("</pubDate>\n");
            }
            
            // 作者
            if (post.getAuthor() != null) {
                String authorEmail = post.getAuthor().getEmail() != null ? post.getAuthor().getEmail() : "";
                String authorName = post.getAuthor().getDisplayName() != null ? post.getAuthor().getDisplayName() : post.getAuthor().getUsername();
                xml.append("      <author>").append(authorEmail).append(" (").append(authorName).append(")</author>\n");
            }
            
            // 标签
            if (post.getTags() != null) {
                for (Tag tag : post.getTags()) {
                    xml.append("      <category><![CDATA[").append(tag.getName()).append("]]></category>\n");
                }
            }
            
            xml.append("    </item>\n");
        }

        xml.append("  </channel>\n");
        xml.append("</rss>");

        return ResponseEntity.ok(xml.toString());
    }

    // 工具方法：ZonedDateTime 转 RFC 822 格式
    private String getRssDate(java.time.ZonedDateTime dateTime) {
        return dateTime.format(RFC822_FORMAT);
    }

    // 工具方法：XML 特殊字符转义
    private String escapeXml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&apos;");
    }
}
```

### 步骤 2：修改 Repository

在 `PostRepository.java` 添加方法：

```java
// 需要在 Service 层添加获取带标签的已发布文章分页方法
// 或者直接在 Controller 使用 JPA 查询
Page<Post> findByStatus(String status, Pageable pageable);
```

### 验证

启动项目后访问：`http://localhost:8080/rss.xml`

应该看到类似这样的输出：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Aston's Blog</title>
    ...
  </channel>
</rss>
```

可以用浏览器插件或在线工具验证 RSS 格式是否正确。

---

## 2. SEO 优化（Sitemap + Robots.txt）教程

### 目标

创建 `SeoController.java`，提供 `/sitemap.xml` 和 `/robots.txt`。

### 步骤 1：创建 Controller

**文件位置**: `src/main/java/com/aston/blog/Controller/SeoController.java`

```java
package com.aston.blog.Controller;

import com.aston.blog.entity.Post;
import com.aston.blog.entity.Tag;
import com.aston.blog.repository.PostRepository;
import com.aston.blog.repository.TagRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping
public class SeoController {

    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    
    private static final String SITE_URL = "https://blog.example.com";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public SeoController(PostRepository postRepository, TagRepository tagRepository) {
        this.postRepository = postRepository;
        this.tagRepository = tagRepository;
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> generateSitemap() {
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // 1. 首页
        xml.append("  <url>\n");
        xml.append("    <loc>").append(SITE_URL).append("/</loc>\n");
        xml.append("    <lastmod>").append(LocalDate.now().format(DATE_FORMAT)).append("</lastmod>\n");
        xml.append("    <changefreq>daily</changefreq>\n");
        xml.append("    <priority>1.0</priority>\n");
        xml.append("  </url>\n");

        // 2. 博客列表页
        xml.append("  <url>\n");
        xml.append("    <loc>").append(SITE_URL).append("/blog</loc>\n");
        xml.append("    <lastmod>").append(LocalDate.now().format(DATE_FORMAT)).append("</lastmod>\n");
        xml.append("    <changefreq>daily</changefreq>\n");
        xml.append("    <priority>0.9</priority>\n");
        xml.append("  </url>\n");

        // 3. 获取所有已发布的文章
        List<Post> posts = postRepository.findAll().stream()
            .filter(p -> "PUBLISHED".equals(p.getStatus()) && p.getPublishedAt() != null)
            .toList();

        for (Post post : posts) {
            xml.append("  <url>\n");
            xml.append("    <loc>").append(SITE_URL).append("/blog/").append(post.getSlug()).append("</loc>\n");
            xml.append("    <lastmod>").append(post.getPublishedAt().toLocalDate().format(DATE_FORMAT)).append("</lastmod>\n");
            xml.append("    <changefreq>weekly</changefreq>\n");
            xml.append("    <priority>0.8</priority>\n");
            xml.append("  </url>\n");
        }

        // 4. 标签页
        List<Tag> tags = tagRepository.findAll();
        for (Tag tag : tags) {
            xml.append("  <url>\n");
            xml.append("    <loc>").append(SITE_URL).append("/tags/").append(tag.getSlug()).append("</loc>\n");
            xml.append("    <lastmod>").append(LocalDate.now().format(DATE_FORMAT)).append("</lastmod>\n");
            xml.append("    <changefreq>weekly</changefreq>\n");
            xml.append("    <priority>0.6</priority>\n");
            xml.append("  </url>\n");
        }

        xml.append("</urlset>");

        return ResponseEntity.ok(xml.toString());
    }

    @GetMapping(value = "/robots.txt", produces = "text/plain; charset=utf-8")
    public ResponseEntity<String> getRobotsTxt() {
        String content = """
            User-agent: *
            Allow: /
            Disallow: /api/
            Disallow: /dashboard/
            Disallow: /uploads/
            Disallow: /login
            Disallow: /register
            
            Sitemap: """ + SITE_URL + """/sitemap.xml
            """;
        
        return ResponseEntity.ok(content);
    }
}
```

### 验证

访问：
- `http://localhost:8080/sitemap.xml`
- `http://localhost:8080/robots.txt`

---

## 3. 评论邮件通知教程

### 目标

在 `CommentServiceImpl.java` 中添加邮件通知功能。

### 步骤 1：创建邮件服务

**文件位置**: `src/main/java/com/aston/blog/Service/EmailService.java`

```java
package com.aston.blog.Service;

public interface EmailService {
    /**
     * 发送新评论通知给博主
     * @param postTitle 文章标题
     * @param postSlug 文章slug
     * @param commentAuthor 评论者名称
     * @param commentEmail 评论者邮箱
     * @param commentContent 评论内容
     */
    void sendNewCommentNotification(String postTitle, String postSlug, 
        String commentAuthor, String commentEmail, String commentContent);
    
    /**
     * 发送评论回复通知给原评论者
     * @param originalCommentAuthor 原评论者名称
     * @param originalCommentEmail 原评论者邮箱
     * @param postTitle 文章标题
     * @param postSlug 文章slug
     * @param replyContent 回复内容
     */
    void sendReplyNotification(String originalCommentAuthor, String originalCommentEmail,
        String postTitle, String postSlug, String replyContent);
}
```

### 步骤 2：实现邮件服务

**文件位置**: `src/main/java/com/aston/blog/Service/impl/EmailServiceImpl.java`

```java
package com.aston.blog.Service.impl;

import com.aston.blog.Service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    @Value("${blog.owner.email}")
    private String ownerEmail;
    
    @Value("${blog.owner.name}")
    private String ownerName;
    
    @Value("${blog.site.url}")
    private String siteUrl;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendNewCommentNotification(String postTitle, String postSlug,
            String commentAuthor, String commentEmail, String commentContent) {
        
        if (ownerEmail == null || ownerEmail.isEmpty()) {
            return; // 没有配置邮箱，跳过发送
        }
        
        String subject = "[Aston's Blog] 新评论通知 - 《" + postTitle + "》";
        String content = buildNewCommentEmail(postTitle, postSlug, 
            commentAuthor, commentEmail, commentContent);
        
        sendEmail(ownerEmail, subject, content);
    }

    @Override
    public void sendReplyNotification(String originalCommentAuthor, String originalCommentEmail,
            String postTitle, String postSlug, String replyContent) {
        
        if (originalCommentEmail == null || originalCommentEmail.isEmpty()) {
            return; // 没有邮箱，跳过发送
        }
        
        String subject = "[Aston's Blog] 您的评论有了新回复";
        String content = buildReplyEmail(originalCommentAuthor, 
            postTitle, postSlug, replyContent);
        
        sendEmail(originalCommentEmail, subject, content);
    }

    private String buildNewCommentEmail(String postTitle, String postSlug,
            String commentAuthor, String commentEmail, String commentContent) {
        String postUrl = siteUrl + "/blog/" + postSlug;
        
        return String.format("""
            您好，%s！
            
            您收到了新的评论：
            
            文章：《%s》
            评论者：%s
            邮箱：%s
            
            评论内容：
            ---
            %s
            ---
            
            查看原文：%s
            
            ---
            Aston's Blog
            """, ownerName, postTitle, commentAuthor, commentEmail, commentContent, postUrl);
    }

    private String buildReplyEmail(String originalCommentAuthor,
            String postTitle, String postSlug, String replyContent) {
        String postUrl = siteUrl + "/blog/" + postSlug;
        
        return String.format("""
            您好，%s！
            
            您在《%s》下的评论收到了回复：
            
            您的评论：
            （查看原文链接获取）
            
            回复内容：
            ---
            %s
            ---
            
            查看完整讨论：%s
            
            ---
            Aston's Blog
            """, originalCommentAuthor, postTitle, replyContent, postUrl);
    }

    private void sendEmail(String to, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
        } catch (Exception e) {
            // 邮件发送失败不影响主流程，仅记录日志
            System.err.println("邮件发送失败: " + e.getMessage());
        }
    }
}
```

### 步骤 3：修改 CommentServiceImpl

在 `CommentServiceImpl.java` 中注入邮件服务：

```java
@Service
public class CommentServiceImpl implements CommentService {
    
    // ... 现有代码 ...
    
    @Autowired
    private EmailService emailService;

    // 在 createComment 方法中添加：
    
    @Override
    @Transactional
    public CommentVO createComment(String postId, String userId, String authorName, 
            String authorEmail, String authorUrl, String content) {
        
        Comment comment = new Comment();
        comment.setPostId(postId);
        
        // ... 现有逻辑保持不变 ...
        
        // 保存评论
        comment = commentRepository.save(comment);
        
        // 更新文章评论计数
        Post post = postRepository.findById(postId).orElse(null);
        if (post != null) {
            post.setCommentCount(post.getCommentCount() + 1);
            postRepository.save(post);
            
            // ========== 新增：发送邮件通知 ==========
            // 获取文章标题和slug
            String postTitle = post.getTitle();
            String postSlug = post.getSlug();
            
            // 发送新评论通知给博主
            emailService.sendNewCommentNotification(
                postTitle,
                postSlug,
                authorName != null ? authorName : "匿名用户",
                authorEmail,
                content
            );
            // ==========================================
        }
        
        return toVO(comment);
    }
    
    // 如果需要支持回复通知，还要添加回复方法
}
```

### 步骤 4：配置邮件（可选）

如果你想用 QQ 邮箱发送，需要：

1. 登录 QQ 邮箱网页版
2. 设置 → 账户 → POP3/SMTP服务 → 开启
3. 生成授权码（不是 QQ 密码）
4. 在 `application.properties` 中配置

```properties
spring.mail.host=smtp.qq.com
spring.mail.port=587
spring.mail.username=your-email@qq.com
spring.mail.password=your-auth-code  # 这是授权码，不是密码
```

### 验证

1. 确保 `application.properties` 配置了邮件
2. 发表一条评论
3. 检查配置的邮箱是否收到通知邮件

---

## 4. 文章目录（TOC）教程

### 目标

创建 `TocService.java` 和对应的 Controller 接口，从 Markdown 内容解析出目录结构。

### 步骤 1：添加依赖

```xml
<!-- Markdown 解析库 -->
<dependency>
    <groupId>org.commonmark</groupId>
    <artifactId>commonmark</artifactId>
    <version>0.21.0</version>
</dependency>
```

### 步骤 2：创建 TOC VO

**文件位置**: `src/main/java/com/aston/blog/vo/post/TocItemVO.java`

```java
package com.aston.blog.vo.post;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class TocItemVO {
    private String id;        // 标题 ID（用于锚点跳转）
    private String text;      // 标题文本
    private int level;        // 标题级别 (1-6)
    private List<TocItemVO> children = new ArrayList<>();  // 子标题
    
    public TocItemVO(String id, String text, int level) {
        this.id = id;
        this.text = text;
        this.level = level;
    }
}
```

### 步骤 3：创建 TOC Service

**文件位置**: `src/main/java/com/aston/blog/Service/TocService.java`

```java
package com.aston.blog.Service;

import com.aston.blog.vo.post.TocItemVO;
import java.util.List;

public interface TocService {
    /**
     * 从 Markdown 内容解析出目录结构
     * @param markdown Markdown 原文
     * @return 目录树
     */
    List<TocItemVO> generateToc(String markdown);
}
```

**文件位置**: `src/main/java/com/aston/blog/Service/impl/TocServiceImpl.java`

```java
package com.aston.blog.Service.impl;

import com.aston.blog.Service.TocService;
import com.aston.blog.vo.post.TocItemVO;
import org.commonmark.node.*;
import org.commonmark.parser.Parser;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class TocServiceImpl implements TocService {

    private static final Pattern CHINESE_PATTERN = Pattern.compile("[\\u4e00-\\u9fa5]+");
    
    // Markdown 解析器
    private final Parser parser = Parser.builder().build();

    @Override
    public List<TocItemVO> generateToc(String markdown) {
        if (markdown == null || markdown.isEmpty()) {
            return new ArrayList<>();
        }

        // 1. 解析 Markdown
        Node document = parser.parse(markdown);
        
        // 2. 提取所有标题
        List<TocItemVO> allHeadings = new ArrayList<>();
        extractHeadings(document, allHeadings);
        
        // 3. 构建树形结构
        return buildTree(allHeadings);
    }

    private void extractHeadings(Node node, List<TocItemVO> headings) {
        while (node != null) {
            if (node instanceof Heading) {
                Heading heading = (Heading) node;
                int level = heading.getLevel();
                
                // 只处理 h1-h3（太多层级体验不好）
                if (level >= 1 && level <= 3) {
                    String text = extractText(heading);
                    String id = generateId(text);
                    
                    headings.add(new TocItemVO(id, text, level));
                }
            }
            
            // 递归处理子节点
            if (node instanceof Node) {
                Node child = ((Node) node).getFirstChild();
                if (child != null) {
                    extractHeadings(child, headings);
                }
            }
            
            node = node.getNext();
        }
    }

    private String extractText(Node node) {
        StringBuilder text = new StringBuilder();
        Node child = node.getFirstChild();
        
        while (child != null) {
            if (child instanceof Text) {
                text.append(((Text) child).getLiteral());
            } else if (child instanceof SoftLineBreak) {
                text.append(" ");
            } else if (child instanceof HardLineBreak) {
                text.append("\n");
            }
            child = child.getNext();
        }
        
        return text.toString().trim();
    }

    private String generateId(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        
        // 1. 转小写
        String id = text.toLowerCase();
        
        // 2. 中文保留，英文和数字保留
        // 3. 空格和特殊字符替换为 -
        id = id.replaceAll("[\\s\\-_]+", "-");
        id = id.replaceAll("[^a-z0-9\\u4e00-\\u9fa5-]", "");
        
        // 4. 移除连续重复的 -
        id = id.replaceAll("-+", "-");
        
        // 5. 移除首尾的 -
        id = id.replaceAll("^-|-$", "");
        
        return id;
    }

    private List<TocItemVO> buildTree(List<TocItemVO> headings) {
        List<TocItemVO> root = new ArrayList<>();
        List<TocItemVO> stack = new ArrayList<>();
        
        for (TocItemVO heading : headings) {
            TocItemVO last = stack.isEmpty() ? null : stack.get(stack.size() - 1);
            
            // 清空栈中级别 >= 当前级别的项
            while (!stack.isEmpty() && stack.get(stack.size() - 1).getLevel() >= heading.getLevel()) {
                stack.remove(stack.size() - 1);
            }
            
            if (stack.isEmpty()) {
                // 没有父级，添加到根
                root.add(heading);
            } else {
                // 有父级，添加为子级
                stack.get(stack.size() - 1).getChildren().add(heading);
            }
            
            stack.add(heading);
        }
        
        return root;
    }
}
```

### 步骤 4：添加 Controller 接口

在 `PublicController.java` 中添加：

```java
// 需要注入 TocService
private final TocService tocService;

// 在构造函数中注入

@GetMapping("/posts/{slug}/toc")
public Result<List<TocItemVO>> getPostToc(@PathVariable String slug) {
    // 1. 获取文章内容
    PostDetailVO post = postService.getPostBySlug(slug);
    if (post == null) {
        return Result.error(404, "文章未找到");
    }
    
    // 2. 解析目录
    List<TocItemVO> toc = tocService.generateToc(post.getContent());
    
    return Result.success(toc);
}
```

### 步骤 5：在 PostDetailVO 中添加目录字段（可选）

如果你想一次性返回文章和目录，修改 `PostDetailVO.java`：

```java
@Data
public class PostDetailVO {
    // ... 现有字段 ...
    
    // 新增：文章目录
    private List<TocItemVO> toc;
}
```

然后在 `PostServiceImpl.getPostBySlug()` 中填充：

```java
@Override
@Transactional
public PostDetailVO getPostBySlug(String slug) {
    return postRepository.findBySlugFull(slug).map(post -> {
        // 增加浏览量
        post.setViewCount(post.getViewCount() + 1);
        postRepository.save(post);
        
        PostDetailVO vo = convertToPostDetailVO(post);
        
        // ========== 新增：生成目录 ==========
        vo.setToc(tocService.generateToc(post.getContent()));
        // =====================================
        
        return vo;
    }).orElse(null);
}
```

别忘了注入 `TocService`。

### 验证

访问：`http://localhost:8080/api/public/posts/your-slug/toc`

应该看到类似：
```json
{
  "code": 0,
  "message": "success",
  "data": [
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
    }
  ]
}
```

---

## 常见问题

### Q1: RSS/Sitemap 返回 404？

确保 Controller 的 `@RequestMapping` 在类级别，或者使用 `@GetMapping("/rss.xml")` 全路径。

### Q2: 邮件发送失败？

1. 检查授权码是否正确
2. 检查网络是否畅通
3. QQ 邮箱可能需要单独开启 SMTP 服务

### Q3: Markdown 解析乱码？

确保文件编码是 UTF-8。

### Q4: TOC 标题 ID 和前端不匹配？

前端渲染 Markdown 时也需要生成相同的 ID。建议使用统一的 ID 生成函数（如 `github-markdown-css` 的做法）。

---

## 下一步

1. 完成后端接口
2. 参考前端文档实现前端页面
3. 测试完整流程
4. 部署到服务器
