#!/bin/bash

# 博客自动发文脚本
# 使用方法: ./post_article.sh <用户名> <密码>
# 
# 示例: ./post_article.sh myuser mypassword

API_URL="http://47.242.21.40"
USERNAME="$1"
PASSWORD="$2"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    echo "用法: $0 <用户名> <密码>"
    echo "示例: $0 admin password123"
    exit 1
fi

echo "=== 1. 登录获取Token ==="
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ROLE=$(echo $LOGIN_RESPONSE | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "登录失败: $LOGIN_RESPONSE"
    exit 1
fi

echo "登录成功! 角色: $USER_ROLE"
echo "Token: ${TOKEN:0:20}..."

# ========== 文章1: Linux相关 ==========
echo ""
echo "=== 2. 发布文章: Linux常用命令 ==="
curl -s -X POST "$API_URL/api/posts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Linux常用命令汇总",
        "slug": "linux-common-commands",
        "content": "# Linux常用命令汇总\n\n## 文件操作\n\n```bash\n# 查看文件\nls -la\n\n# 查看文件内容\ncat file.txt\n\n# 查找文件\nfind / -name \"*.txt\"\n```\n\n## 网络操作\n\n```bash\n# 查看网络连接\nnetstat -tuln\n\n# 查看进程\nps aux\n\n# 杀死进程\nkill -9 PID\n```\n\n## 系统操作\n\n```bash\n# 查看磁盘使用\ndf -h\n\n# 查看内存\nfree -m\n\n# 查看CPU\ntop\n```\n\n## 常用技巧\n\n1. 使用 `|` 管道组合命令\n2. 使用 `&` 后台运行\n3. 使用 `Ctrl+R` 搜索历史\n4. 使用 `alias` 创建命令别名\n\n> 掌握这些命令可以大幅提升Linux操作效率。",
        "excerpt": "汇总Linux常用命令，包括文件操作、网络操作、系统操作等",
        "status": "PUBLISHED",
        "tags": ["Linux", "运维", "命令"]
    }'
echo ""

# ========== 文章2: 登录与安全 ==========
echo "=== 3. 发布文章: 登录与防止越权 ==="
curl -s -X POST "$API_URL/api/posts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Spring Boot登录与防止越权实战",
        "slug": "login-and-prevent-authorization",
        "content": "# Spring Boot登录与防止越权实战\n\n## 传统登录的问题\n\n很多系统只有简单的登录验证，但忽略了：\n- JWT签名验证\n- 角色权限检查\n- 资源归属验证\n\n## 正确的安全流程\n\n```java\n// 1. JWT过滤器验证签名\nif (jwtUtil.validateToken(token, username)) {\n    // 设置SecurityContext\n    SecurityContextHolder.getContext()\n        .setAuthentication(authToken);\n}\n\n// 2. Controller层检查角色\nString role = getUserRole(request);\nif (!\"ADMIN\".equals(role)) {\n    return Result.error(403, \"无权限\");\n}\n\n// 3. Service层验证资源归属\nif (!post.getAuthorId().equals(userId)) {\n    throw new RuntimeException(\"无权限操作\");\n}\n```\n\n## 多层防御机制\n\n1. **JWT层**: ���证签名+过期\n2. **Filter层**: 设置SecurityContext\n3. **Controller层**: 角色检查\n4. **Service层**: 资源归属验证\n5. **数据库层**: isAdmin()二次验证\n\n## 关键点\n\n- 永远不要只依赖前端验证\n- 前端只是提升用户体验\n- 真正的安全控制在后端\n- 对敏感操作要做二次验证",
        "excerpt": "讲解Spring Boot中如何正确实现登录验证和防止越权访问",
        "status": "PUBLISHED",
        "tags": ["Spring Boot", "安全", "JWT"]
    }'
echo ""

# ========== 文章3: 三层架构 ==========
echo "=== 4. 发布文章: 业务逻辑三层架构 ==="
curl -s -X POST "$API_URL/api/posts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "业务逻辑三层架构设计",
        "slug": "three-tier-architecture",
        "content": "# 业务逻辑三层架构设计\n\n## 经典三层架构\n\n```\n┌─────────────────┐\n│   Controller    │  接收请求、返回响应\n├─────────────────┤\n│    Service     │  业务逻辑处理\n├─────────────────┤\n│  Repository    │  数据访问(Dao)\n└─────────────────┘\n```\n\n## Controller层\n\n负责：\n- 接收请求参数\n- 参数校验\n- 调用Service\n- 返回Result\n\n```java\n@PostMapping\npublic Result<PostVO> create(@RequestBody @Valid CreatePostDTO dto) {\n    String userId = getUserIdFromRequest(request);\n    if (userId == null) return Result.error(401, \"未登录\");\n    \n    return Result.success(postService.createPost(dto, userId));\n}\n```\n\n## Service层\n\n负责：\n- 业务逻辑处理\n- 事务管理\n- 权限验证\n\n```java\n@Service\npublic class PostServiceImpl implements PostService {\n    \n    @Transactional\n    public PostVO createPost(CreatePostDTO dto, String userId) {\n        // 业务逻辑\n        Post post = new Post();\n        post.setTitle(dto.getTitle());\n        post.setAuthorId(userId);\n        \n        return postRepository.save(post);\n    }\n}\n```\n\n## Repository层\n\n负责：\n- 数据库操作\n- SQL执行\n\n```java\npublic interface PostRepository extends JpaRepository<Post, String> {\n    List<Post> findByAuthorId(String authorId);\n}\n```\n\n## 分层优点\n\n1. **职责清晰** - 各层只做自己的事\n2. **便于测试** - 可以单独测试每层\n3. **易于维护** - 修改不影响其他层\n4. **代码复用** - Service可被多处调用",
        "excerpt": "介绍Controller、Service、Repository三层架构的设计与实现",
        "status": "PUBLISHED",
        "tags": ["架构", "设计模式", "Java"]
    }'
echo ""

# ========== 文章4: 配置 ==========
echo "=== 5. 发布文章: Spring Boot配置 ==="
curl -s -X POST "$API_URL/api/posts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Spring Boot常用配置汇总",
        "slug": "spring-boot-configuration",
        "content": "# Spring Boot常用配置汇总\n\n## application.yml 基础配置\n\n```yaml\nserver:\n  port: 8080\n  servlet:\n    context-path: /\n\nspring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/myblog\n    username: root\n    password: ${DB_PASSWORD}\n  jpa:\n    hibernate:\n      ddl-auto: update\n    show-sql: true\n```\n\n## JWT配置\n\n```yaml\njwt:\n  secret: ${JWT_SECRET}\n  expiration: 86400000  # 24小时\n```\n\n## CORS跨域配置\n\n```java\n@Configuration\npublic class WebConfig implements WebMvcConfigurer {\n    @Override\n    public void addCorsMappings(CorsRegistry registry) {\n        registry.addMapping(\"/api/**\")\n            .allowedOrigins(\"http://localhost:3000\")\n            .allowedMethods(\"GET\", \"POST\", \"PUT\", \"DELETE\");\n    }\n}\n```\n\n## 文件上传配置\n\n```yaml\nspring:\n  servlet:\n    multipart:\n      max-file-size: 10MB\n      max-request-size: 10MB\n```\n\n## 开发建议\n\n1. 敏感信息使用环境变量\n2. 生产环境使用配置中心\n3. 区分开发/测试/生产配置\n4. 使用application-local.yml覆盖默认配置",
        "excerpt": "汇总Spring Boot常用配置，包括数据库、JWT、CORS等",
        "status": "PUBLISHED",
        "tags": ["Spring Boot", "配置"]
    }'
echo ""

echo ""
echo "=== 完成! 已发布4篇文章 ==="
echo "查看文章: $API_URL/blog"