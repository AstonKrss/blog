package com.aston.blog.Service.impl;

import com.aston.blog.Service.TerminalService;
import com.aston.blog.entity.Post;
import com.aston.blog.entity.User;
import com.aston.blog.repository.PostRepository;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.terminal.DirectoryListingVO;
import com.aston.blog.vo.terminal.FileContentVO;
import com.aston.blog.vo.terminal.FileEntryVO;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class TerminalServiceImpl implements TerminalService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd HH:mm");

    public TerminalServiceImpl(PostRepository postRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DirectoryListingVO listDirectory(String path) {
        DirectoryListingVO result = new DirectoryListingVO();
        List<FileEntryVO> entries = new ArrayList<>();

        if (path.equals("/") || path.equals("~") || path.equals("/home/aston")) {
            result.setPath("/home/aston");
            // Add directories
            entries.add(createDirectoryEntry("articles", "drwxr-xr-x", "aston", "aston", 409));
            entries.add(createDirectoryEntry("drafts", "drwxr-xr-x", "aston", "aston", 409));
            entries.add(createDirectoryEntry("projects", "drwxr-xr-x", "aston", "aston", 409));
            entries.add(createFileEntry("about.md", "-rw-r--r--", "aston", "aston", 1024, "about"));
        } else if (path.equals("/home/aston/articles")) {
            result.setPath("/home/aston/articles");
            List<Post> posts = postRepository.findAllPublished();
            for (Post post : posts) {
                entries.add(createPostEntry(post, "-rw-r--r--"));
            }
        } else if (path.equals("/home/aston/drafts")) {
            result.setPath("/home/aston/drafts");
            List<Post> drafts = postRepository.findAllDrafts();
            for (Post post : drafts) {
                entries.add(createPostEntry(post, "-rw-r--r--"));
            }
        } else if (path.equals("/home/aston/projects")) {
            result.setPath("/home/aston/projects");
            // Static projects directory for now
            entries.add(createFileEntry("portfolio.md", "-rw-r--r--", "aston", "aston", 2048, "portfolio"));
            entries.add(createFileEntry("blog-system.md", "-rw-r--r--", "aston", "aston", 3072, "blog-system"));
        } else {
            result.setPath(path);
        }

        result.setEntries(entries);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public FileContentVO readFile(String path) {
        FileContentVO result = new FileContentVO();
        result.setPath(path);

        // Parse path to determine file type
        if (path.startsWith("/home/aston/articles/")) {
            String slug = path.substring("/home/aston/articles/".length());
            if (slug.endsWith(".md")) {
                slug = slug.substring(0, slug.length() - 3);
            }
            Optional<Post> post = postRepository.findBySlugAndStatus(slug, "PUBLISHED");
            if (post.isPresent()) {
                Post p = post.get();
                result.setName(p.getTitle() + ".md");
                result.setContent(p.getContent());
                result.setType("markdown");
                result.setEditable(false); // Only author can edit
                result.setPostId(p.getId());
                result.setStatus(p.getStatus());
                return result;
            }
        } else if (path.startsWith("/home/aston/drafts/")) {
            String slug = path.substring("/home/aston/drafts/".length());
            if (slug.endsWith(".md")) {
                slug = slug.substring(0, slug.length() - 3);
            }
            Optional<Post> post = postRepository.findBySlugAndStatus(slug, "DRAFT");
            if (post.isPresent()) {
                Post p = post.get();
                result.setName(p.getTitle() + ".md");
                result.setContent(p.getContent());
                result.setType("markdown");
                result.setEditable(false);
                result.setPostId(p.getId());
                result.setStatus(p.getStatus());
                return result;
            }
        } else if (path.equals("/home/aston/about.md") || path.equals("/home/aston/about")) {
            result.setName("about.md");
            result.setType("markdown");
            result.setEditable(false);
            result.setContent(getAboutContent());
            return result;
        } else if (path.equals("/home/aston/projects/portfolio.md") || path.equals("/home/aston/projects/portfolio")) {
            result.setName("portfolio.md");
            result.setType("markdown");
            result.setEditable(false);
            result.setContent(getPortfolioContent());
            return result;
        } else if (path.equals("/home/aston/projects/blog-system.md") || path.equals("/home/aston/projects/blog-system")) {
            result.setName("blog-system.md");
            result.setType("markdown");
            result.setEditable(false);
            result.setContent(getBlogSystemContent());
            return result;
        }

        return null; // File not found
    }

    @Override
    @Transactional
    public FileContentVO saveFile(String path, String content, String userId) {
        if (!canEdit(userId)) {
            throw new RuntimeException("权限不足，需要登录才能编辑");
        }

        // 静态文件不可编辑
        if (path.contains("/about.md") || path.contains("/about") ||
            path.contains("/portfolio.md") || path.contains("/portfolio") ||
            path.contains("/blog-system.md") || path.contains("/blog-system")) {
            throw new RuntimeException("静态文件不可编辑");
        }

        FileContentVO result = new FileContentVO();
        result.setPath(path);

        String postId = null;
        String slug = null;
        boolean postFound = false;
        boolean isOwner = false;

        // Determine which post to update
        if (path.startsWith("/home/aston/articles/")) {
            slug = path.substring("/home/aston/articles/".length());
            if (slug.endsWith(".md")) {
                slug = slug.substring(0, slug.length() - 3);
            }
            Optional<Post> post = postRepository.findBySlugAndStatus(slug, "PUBLISHED");
            if (post.isPresent()) {
                postFound = true;
                postId = post.get().getId();
                // 【越权检查】只有作者才能修改自己的文章
                if (post.get().getAuthorId().equals(userId)) {
                    isOwner = true;
                } else {
                    throw new RuntimeException("权限不足：只能编辑自己的文章");
                }
            }
        } else if (path.startsWith("/home/aston/drafts/")) {
            slug = path.substring("/home/aston/drafts/".length());
            if (slug.endsWith(".md")) {
                slug = slug.substring(0, slug.length() - 3);
            }
            Optional<Post> post = postRepository.findBySlugAndStatus(slug, "DRAFT");
            if (post.isPresent()) {
                postFound = true;
                postId = post.get().getId();
                // 【越权检查】只有作者才能修改自己的草稿
                if (post.get().getAuthorId().equals(userId)) {
                    isOwner = true;
                } else {
                    throw new RuntimeException("权限不足：只能编辑自己的草稿");
                }
            }
        }

        if (!postFound) {
            throw new RuntimeException("文章不存在: " + path);
        }

        if (!isOwner || postId == null) {
            throw new RuntimeException("权限不足：无法编辑此文件");
        }

        // 执行保存
        Post post = postRepository.findById(postId).orElse(null);
        if (post != null) {
            post.setContent(content);
            postRepository.save(post);
            result.setName(post.getTitle() + ".md");
            result.setContent(content);
            result.setPostId(postId);
            result.setStatus(post.getStatus());
            result.setEditable(true);
            result.setType("markdown");
            return result;
        }

        throw new RuntimeException("保存失败：文章不存在");
    }

    @Override
    public boolean canEdit(String userId) {
        return userId != null && !userId.isEmpty();
    }

    private FileEntryVO createDirectoryEntry(String name, String permissions, String owner, String group, long size) {
        FileEntryVO entry = new FileEntryVO();
        entry.setName(name);
        entry.setType("directory");
        entry.setPermissions(permissions);
        entry.setOwner(owner);
        entry.setGroup(group);
        entry.setSize(size);
        entry.setDate("Apr 15 10:30");
        return entry;
    }

    private FileEntryVO createFileEntry(String name, String permissions, String owner, String group, long size, String slug) {
        FileEntryVO entry = new FileEntryVO();
        entry.setName(name);
        entry.setType("file");
        entry.setPermissions(permissions);
        entry.setOwner(owner);
        entry.setGroup(group);
        entry.setSize(size);
        entry.setDate("Apr 15 10:30");
        entry.setSlug(slug);
        return entry;
    }

    private FileEntryVO createPostEntry(Post post, String permissions) {
        FileEntryVO entry = new FileEntryVO();
        String fileName = slugToFileName(post.getSlug()) + ".md";
        entry.setName(fileName);
        entry.setType("file");
        entry.setPermissions(permissions);
        entry.setOwner("aston");
        entry.setGroup("aston");
        entry.setSize((long) (post.getContent() != null ? post.getContent().length() : 0));
        entry.setDate(post.getPublishedAt() != null ? post.getPublishedAt().format(DATE_FORMATTER) : post.getUpdatedAt().format(DATE_FORMATTER));
        entry.setSlug(post.getSlug());
        entry.setStatus(post.getStatus());
        return entry;
    }

    private String slugToFileName(String slug) {
        // Convert slug like "hello-world" to "Hello World.md"
        String[] parts = slug.split("-");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part.length() > 0) {
                sb.append(Character.toUpperCase(part.charAt(0)));
                if (part.length() > 1) {
                    sb.append(part.substring(1));
                }
                sb.append(" ");
            }
        }
        return sb.toString().trim();
    }

    private String getAboutContent() {
        return "# 关于我\n" +
            "\n" +
            "## Aston\n" +
            "\n" +
            "一名热爱技术的全栈开发者，专注于现代 Web 技术栈。\n" +
            "\n" +
            "### 技术栈\n" +
            "\n" +
            "- **后端**: Java (Spring Boot), Python\n" +
            "- **前端**: React, Next.js, TypeScript\n" +
            "- **数据库**: MySQL, PostgreSQL\n" +
            "- **DevOps**: Docker, Nginx, Linux\n" +
            "\n" +
            "### 联系方式\n" +
            "\n" +
            "- GitHub: github.com/aston\n" +
            "- Email: aston@example.com\n" +
            "\n" +
            "---\n" +
            "\n" +
            "*最后更新: 2026年4月*\n";
    }

    private String getPortfolioContent() {
        return "# 个人作品集\n" +
            "\n" +
            "## Web 应用\n" +
            "\n" +
            "### 博客系统\n" +
            "- 全栈博客平台\n" +
            "- Next.js 15 + Spring Boot 4.0\n" +
            "- Docker 容器化部署\n" +
            "\n" +
            "### 更多项目\n" +
            "持续更新中...\n" +
            "\n" +
            "---\n" +
            "*Aston's Portfolio*\n";
    }

    private String getBlogSystemContent() {
        return "# 博客系统技术文档\n" +
            "\n" +
            "## 系统架构\n" +
            "\n" +
            "### 前端\n" +
            "- Next.js 15 App Router\n" +
            "- TypeScript\n" +
            "- TailwindCSS\n" +
            "- Lucide Icons\n" +
            "\n" +
            "### 后端\n" +
            "- Spring Boot 4.0\n" +
            "- Java 21\n" +
            "- Spring Security + JWT\n" +
            "\n" +
            "### 数据库\n" +
            "- MySQL 8.0\n" +
            "- JPA/Hibernate\n" +
            "\n" +
            "### 部署\n" +
            "- Docker Compose\n" +
            "- Nginx\n" +
            "- 阿里云服务器\n" +
            "\n" +
            "---\n" +
            "*Built with passion by Aston*\n";
    }
}
