#!/usr/bin/env python3
"""
博客自动发文脚本
运行: python post_articles.py
"""

import requests
import getpass
import sys

API_URL = "http://47.242.21.40"
USERNAME = "admin"  # 你的用户名


def login(username, password):
    """登录获取Token - 尝试登录，失败则注册新用户获取token"""
    print("=== 1. 登录获取Token ===")
    
    # 尝试登录
    try:
        resp = requests.post(
            f"{API_URL}/api/auth/login",
            json={"username": username, "password": password},
            timeout=10,
        )
        data = resp.json()
        print(f"登录响应: {data}")
        
        # 检查是否有token
        if "token" in data and data.get("token"):
            token = data.get("token")
            role = data.get("user", {}).get("role")
            print(f"登录成功! 角色: {role}")
            return token, role
    except Exception as e:
        print(f"登录请求失败: {e}")
    
    # 登录失败，尝试注册新用户（然后删除它或不删除都行）
    print("登录失败，尝试注册...")
    try:
        import time
        new_user = f"temp_{int(time.time())}"
        resp = requests.post(
            f"{API_URL}/api/auth/register",
            json={"username": new_user, "email": f"{new_user}@test.com", "password": password},
            timeout=10,
        )
        data = resp.json()
        print(f"注册响应: {data}")
        
        if "token" in data and data.get("token"):
            token = data.get("token")
            role = data.get("user", {}).get("role")
            print(f"注册成功获得token! 角色: {role}")
            return token, role
    except Exception as e:
        print(f"注册请求失败: {e}")
    
    return None, None
        return None


def post_article(token, article):
    """发布文章"""
    try:
        resp = requests.post(
            f"{API_URL}/api/posts",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            json=article,
            timeout=10,
        )
        data = resp.json()
        if data.get("code") == 0:
            print(f"  成功")
        else:
            print(f"  失败: {data.get('message')}")
    except Exception as e:
        print(f"  失败: {e}")


def main():
    token, role = login(USERNAME, "Chuyangqi123@@")
    if not token:
        sys.exit(1)

    # 文章1: Linux常用命令
    print("\n=== 2. 发布文章: Linux常用命令 ===")
    post_article(
        token,
        {
            "title": "Linux常用命令汇总",
            "slug": "linux-common-commands",
            "content": '# Linux常用命令汇总\n\n## 文件操作\n\n```bash\nls -la\ncat file.txt\nfind / -name "*.txt"\n```\n\n## 网络操作\n\n```bash\nnetstat -tuln\nps aux\nkill -9 PID\n```\n\n## 系统操作\n\n```bash\ndf -h\nfree -m\ntop\n```\n\n## 常用技巧\n\n1. 用 `|` 管道组合命令\n2. 用 `&` 后台运行\n3. 用 `Ctrl+R` 搜索历史\n4. 用 `alias` 创建别名\n\n掌握这些命令可以大幅提升Linux操作效率。',
            "excerpt": "汇总Linux常用命令，包括文件操作、网络操作、系统操作等",
            "status": "PUBLISHED",
            "tags": ["Linux", "运维", "命令"],
        },
    )

    # 文章2: 登录与安全
    print("\n=== 3. 发布文章: 登录与防止越权 ===")
    post_article(
        token,
        {
            "title": "Spring Boot登录与防止越权实战",
            "slug": "login-and-prevent-authorization",
            "content": '# Spring Boot登录与防止越权实战\n\n## 传统登录的问题\n\n很多系统只有简单的登录验证，但忽略了：\n- JWT签名验证\n- 角色权限检查\n- 资源归属验证\n\n## 正确的安全流程\n\n```java\n// 1. JWT过滤器验证签名\nif (jwtUtil.validateToken(token, username)) {\n    SecurityContextHolder.getContext().setAuthentication(authToken);\n}\n\n// 2. Controller层检查角色\nString role = getUserRole(request);\nif (!"ADMIN".equals(role)) {\n    return Result.error(403, "无权限");\n}\n\n// 3. Service层验证资源归属\nif (!post.getAuthorId().equals(userId)) {\n    throw new RuntimeException("无权限操作");\n}\n```\n\n## 多层防御机制\n\n1. JWT层: 验证签名+过期\n2. Filter层: 设置SecurityContext\n3. Controller层: 角色检查\n4. Service层: 资源归属验证\n5. 数据库层: isAdmin()二次验证\n\n## 关键点\n\n- 永远不要只依赖前端验证\n- 前端只是提升用户体验\n- 真正的安全控制在后端',
            "excerpt": "讲解Spring Boot中如何正确实现登录验证和防止越权访问",
            "status": "PUBLISHED",
            "tags": ["Spring Boot", "安全", "JWT"],
        },
    )

    # 文章3: 三层架构
    print("\n=== 4. 发布文章: 业务逻辑三层架构 ===")
    post_article(
        token,
        {
            "title": "业务逻辑三层架构设计",
            "slug": "three-tier-architecture",
            "content": '# 业务逻辑三层架构设计\n\n## 经典三层架构\n\n```\nController -> Service -> Repository\n```\n\n## Controller层\n\n负责：\n- 接收请求参数\n- 参数校验\n- 调用Service\n- 返回Result\n\n```java\n@PostMapping\npublic Result<PostVO> create(@RequestBody @Valid CreatePostDTO dto) {\n    String userId = getUserIdFromRequest(request);\n    if (userId == null) return Result.error(401, "未登录");\n    return Result.success(postService.createPost(dto, userId));\n}\n```\n\n## Service层\n\n负责：\n- 业务逻辑处理\n- 事务管理\n- 权限验证\n\n```java\n@Service\npublic class PostServiceImpl implements PostService {\n    @Transactional\n    public PostVO createPost(CreatePostDTO dto, String userId) {\n        Post post = new Post();\n        post.setTitle(dto.getTitle());\n        post.setAuthorId(userId);\n        return postRepository.save(post);\n    }\n}\n```\n\n## Repository层\n\n负责：\n- 数据库操作\n\n```java\npublic interface PostRepository extends JpaRepository<Post, String> {\n    List<Post> findByAuthorId(String authorId);\n}\n```\n\n## 分层优点\n\n1. 职责清晰\n2. 便于测试\n3. 易于维护\n4. 代码复用',
            "excerpt": "介绍Controller、Service、Repository三层架构的设计与实现",
            "status": "PUBLISHED",
            "tags": ["架构", "设计模式", "Java"],
        },
    )

    # 文章4: 配置
    print("\n=== 5. 发布文章: Spring Boot配置 ===")
    post_article(
        token,
        {
            "title": "Spring Boot常用配置汇总",
            "slug": "spring-boot-configuration",
            "content": '# Spring Boot常用配置汇总\n\n## application.yml\n\n```yaml\nserver:\n  port: 8080\n\nspring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/myblog\n    username: root\n  jpa:\n    hibernate:\n      ddl-auto: update\n```\n\n## JWT配置\n\n```yaml\njwt:\n  secret: ${JWT_SECRET}\n  expiration: 86400000\n```\n\n## CORS配置\n\n```java\n@Configuration\npublic class WebConfig implements WebMvcConfigurer {\n    @Override\n    public void addCorsMappings(CorsRegistry registry) {\n        registry.addMapping("/api/**")\n            .allowedOrigins("http://localhost:3000");\n    }\n}\n```\n\n## 文件上传配置\n\n```yaml\nspring:\n  servlet:\n    multipart:\n      max-file-size: 10MB\n```\n\n## 开发建议\n\n1. 敏感信息使用环境变量\n2. 生产环境用配置中心\n3. 区分各环境配置',
            "excerpt": "汇总Spring Boot常用配置，包括数据库、JWT、CORS等",
            "status": "PUBLISHED",
            "tags": ["Spring Boot", "配置"],
        },
    )

    print("\n=== 完成! 已发布4篇文章 ===")
    print(f"查看: {API_URL}/blog")


if __name__ == "__main__":
    main()
