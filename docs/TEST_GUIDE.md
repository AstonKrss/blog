# Blog 项目测试指南

> 本文档覆盖：功能测试用例设计、测试数据生成策略、设计思路、以及软件测试 / Java / Spring Boot / MySQL 相关的面试题与答案。

---

## 目录

1. [测试策略总览](#1-测试策略总览)
2. [模块测试用例](#2-模块测试用例)
3. [测试数据设计](#3-测试数据设计)
4. [设计思路解释](#4-设计思路解释)
5. [面试题与答案](#5-面试题与答案)

---

## 1. 测试策略总览

### 1.1 测试金字塔

```
        ┌─────────────┐
        │   E2E 测试   │  ← 少量，覆盖核心用户路径
       ┌┴─────────────┴┐
       │  集成/接口测试  │  ← 覆盖所有 API 端点
      ┌┴───────────────┴┐
      │    单元测试      │  ← 覆盖 Service 层、Utils、SecurityInterceptor
      └─────────────────┘
```

### 1.2 重点测试模块

| 优先级 | 模块 | 原因 |
|--------|------|------|
| P0 | 认证模块（登录/注册/Token） | 安全核心，漏洞影响最大 |
| P0 | SecurityInterceptor | WAF 防线，漏检导致攻击穿透 |
| P0 | 文章 CRUD + 权限控制 | 数据隔离，越权访问风险 |
| P1 | 评论系统 | XSS 注入、越权删除 |
| P1 | 文件上传 | 恶意文件、路径穿越 |
| P1 | 暴力破解防护 | LoginAttempt + IP 封禁 |
| P2 | 前端页面交互 | UI 行为正确性 |
| P2 | Python 安全工具 | 扫描器准确性 |

### 1.3 测试环境准备

```bash
# 启动测试数据库
docker compose -f compose.test.yaml up -d mysql

# 初始化测试数据（见第三章）
mysql -u test -p test_blog < SQL/init_test_data.sql

# 运行后端测试
mvn test -Dspring.profiles.active=test

# 运行前端测试
cd frontend && npm test
```

---

## 2. 模块测试用例

### 2.1 认证模块

#### TC-AUTH-001：正常登录

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-001 正常登录 |
| 前置条件 | 用户已注册，邮箱已验证 |
| 测试步骤 | 1. 打开登录页 `/login`<br>2. 输入正确用户名 + 密码<br>3. 点击登录 |
| 预期结果 | 1. 跳转首页<br>2. Header 显示用户名<br>3. `auth_token` cookie 存在且为 httpOnly<br>4. `/api/auth/me` 返回用户信息 |
| 测试数据 | `username: testuser`<br>`password: Test@123456` |

#### TC-AUTH-002：密码错误

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-002 密码错误 |
| 测试步骤 | 输入正确用户名 + 错误密码 |
| 预期结果 | 1. 返回"用户名或密码错误"<br>2. `auth_token` 不设置<br>3. `login_attempts` 表记录一条 `success=0` |
| 测试数据 | `password: WrongPass@123` |

#### TC-AUTH-003：账号不存在

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-003 账号不存在 |
| 测试步骤 | 输入不存在的用户名 |
| 预期结果 | 返回"用户名或密码错误"（不区分是为了防用户名枚举） |

#### TC-AUTH-004：暴力破解防护

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-004 暴力破解防护 |
| 前置条件 | 同 IP 在 15 分钟内失败 10 次 |
| 测试步骤 | 连续用错误密码登录 10 次后，再用正确密码登录 |
| 预期结果 | 第 11 次登录被拦截，返回"IP 已被临时封禁" |
| 测试数据 | 脚本循环调用 `/api/auth/login` |
| 设计原因 | 防止黑客用密码字典暴力破解 |

#### TC-AUTH-005：JWT Token 伪造

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-005 JWT Token 伪造 |
| 测试步骤 | 用一个伪造的 JWT Token 调用需认证的接口 |
| 预期结果 | 返回 401 Unauthorized |
| 测试数据 | `Authorization: Bearer fake.jwt.token` |

#### TC-AUTH-006：Token 过期

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-006 Token 过期 |
| 前置条件 | Token 已过期（默认 24h） |
| 测试步骤 | 用过期 Token 调用 `/api/auth/me` |
| 预期结果 | 返回 401 |
| 设计原因 | 确保 Token 有时效性，泄露后不会永久有效 |

#### TC-AUTH-007：Cookie vs Header 优先级

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-007 Cookie 与 Header 认证优先级 |
| 测试步骤 | 同时传递 Cookie 和 Authorization Header，看谁生效 |
| 预期结果 | Cookie 的 `auth_token` 优先于 Authorization Header |
| 设计原因 | 前端 Next.js 通过 Cookie 代理认证，减少 Token 泄漏风险 |

#### TC-AUTH-008：正常注册

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-008 正常注册 |
| 前置条件 | 邮箱可接收 SMTP 邮件 |
| 测试步骤 | 1. POST `/api/auth/send-code` 获取验证码<br>2. POST `/api/auth/register` 提交注册 |
| 预期结果 | 1. 收到邮件含 6 位验证码<br>2. 注册成功后自动登录 |
| 测试数据 | `email: test_register@example.com`<br>`username: newuser`<br>`password: NewUser@123` |

#### TC-AUTH-009：注册验证码错误

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-009 注册验证码错误 |
| 测试步骤 | 用错误的验证码提交注册 |
| 预期结果 | 返回"验证码错误或已过期" |
| 测试数据 | 验证码: `000000`（错误验证码） |

#### TC-AUTH-010：注册密码强度不足

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-010 注册密码强度不足 |
| 测试步骤 | 注册时输入弱密码（如 `123456`） |
| 预期结果 | 返回"密码强度不足"或注册失败 |
| 设计原因 | 防止用户使用 `123456` 等弱密码被暴力破解 |

#### TC-AUTH-011：邮箱验证码重放攻击

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-AUTH-011 同一验证码不能重复使用 |
| 测试步骤 | 1. 获取验证码 A<br>2. 用验证码 A 注册成功<br>3. 再次用验证码 A 注册 |
| 预期结果 | 第二次注册失败，验证码已失效 |
| 设计原因 | 防止验证码被截获后重复使用 |

---

### 2.2 安全拦截器（SecurityInterceptor）

#### TC-SEC-001：XSS 检测 — script 标签

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-001 XSS 检测 script 标签 |
| 测试步骤 | GET `/api/public/search?q=<script>alert(1)</script>` |
| 预期结果 | 1. 请求正常返回（不拦截，只记录）<br>2. `attack_logs` 表新增一条 `attack_type=XSS`<br>3. `threat_signatures` 表记录该 IP 的 payload |
| 设计原因 | 不拦截是为了收集攻击样本，改进正则规则 |

#### TC-SEC-002：XSS 检测 — javascript: 协议

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-002 XSS 检测 javascript: 协议 |
| 测试步骤 | GET `/api/public/search?q=javascript:alert(1)` |
| 预期结果 | 同上，记录 XSS 攻击 |

#### TC-SEC-003：XSS 检测 — 事件处理器

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-003 XSS 检测事件处理器 onerror |
| 测试步骤 | GET `/api/public/search?q=<img src=x onerror=alert(1)>` |
| 预期结果 | 记录 XSS 攻击 |

#### TC-SEC-004：SQL 注入 — union select

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-004 SQL 注入检测 union select |
| 测试步骤 | GET `/api/public/search?q=1' union select 1,2,3--` |
| 预期结果 | 记录 SQL_INJECTION 攻击 |

#### TC-SEC-005：SQL 注入 — 布尔盲注

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-005 SQL 注入布尔盲注 |
| 测试步骤 | GET `/api/public/search?q=test' and '1'='1` |
| 预期结果 | 记录 SQL_INJECTION 攻击 |

#### TC-SEC-006：SQL 注入 — sleep() 时间盲注

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-006 SQL 注入 sleep() 时间盲注 |
| 测试步骤 | GET `/api/public/search?q=test' and sleep(5)--` |
| 预期结果 | 记录 SQL_INJECTION 攻击 |
| 设计原因 | `sleep()` 是 SQL 注入特征，即使查询正常返回也要记录 |

#### TC-SEC-007：路径穿越

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-007 路径穿越检测 |
| 测试步骤 | GET `/api/public/search?q=../../etc/passwd` |
| 预期结果 | 记录 PATH_TRAVERSAL 攻击 |

#### TC-SEC-008：命令注入

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-008 命令注入检测 |
| 测试步骤 | GET `/api/public/search?q=; cat /etc/passwd` |
| 预期结果 | 记录 COMMAND_INJECTION 攻击 |

#### TC-SEC-009：扫描器 User-Agent 检测

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-009 扫描器 User-Agent 检测 |
| 测试步骤 | 用 sqlmap 的 UA 发送请求 |
| 预期结果 | 记录 SCANNER_DETECTED 攻击 |
| 测试数据 | `User-Agent: sqlmap/1.7` |

#### TC-SEC-010：敏感文件访问

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-010 敏感文件访问检测 |
| 测试步骤 | GET `/.env` 或 GET `/wp-config.php` |
| 预期结果 | 记录 SENSITIVE_ACCESS |

#### TC-SEC-011：服务器自身 IP 白名单

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-011 服务器 IP 不触发拦截 |
| 测试步骤 | 从 `47.242.21.40` 发送 XSS payload |
| 预期结果 | 不记录攻击（白名单放行） |

#### TC-SEC-012：威胁特征库累积

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-SEC-012 ThreatSignature 累积攻击者所有 payload |
| 前置条件 | 同一 IP 触发 3 次不同类型攻击 |
| 测试步骤 | 同一 IP 发送 XSS → SQLi → 路径穿越 |
| 预期结果 | `threat_signatures` 表该 IP 有 3 条 payload，`attack_types` 含 3 种类型 |
| 设计原因 | 即使新攻击绕过了正则，payload 也会被收集到威胁库供人工分析 |

---

### 2.3 文章模块

#### TC-POST-001：游客浏览文章

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-001 游客浏览文章 |
| 前置条件 | 无登录 |
| 测试步骤 | GET `/api/public/posts/my-first-post` |
| 预期结果 | 返回文章内容，包含正文、标签、目录结构 |

#### TC-POST-002：游客不能创建文章

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-002 未登录不能创建文章 |
| 测试步骤 | POST `/api/posts`（无 Token） |
| 预期结果 | 401 Unauthorized |

#### TC-POST-003：作者删除自己的文章

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-003 作者删除自己的文章 |
| 前置条件 | 以作者身份登录 |
| 测试步骤 | DELETE `/api/posts/{id}` |
| 预期结果 | 204 No Content，文章从列表消失 |

#### TC-POST-004：普通用户不能删除他人文章

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-004 越权删除他人文章 |
| 前置条件 | 以 READER 角色登录（非文章作者） |
| 测试步骤 | DELETE `/api/posts/{id}`（id 是别人的文章） |
| 预期结果 | 403 Forbidden |
| 设计原因 | 防止水平越权（Horizontal Privilege Escalation） |

#### TC-POST-005：普通用户不能删除管理员文章

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-005 越权删除管理员文章 |
| 前置条件 | 以普通用户登录 |
| 测试步骤 | DELETE `/api/posts/{admin_post_id}` |
| 预期结果 | 403 Forbidden |
| 设计原因 | 防止水平越权 |

#### TC-POST-006：管理员删除任意文章

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-006 管理员权限删除任意文章 |
| 前置条件 | 以 ADMIN 角色登录 |
| 测试步骤 | DELETE `/api/posts/{any_post_id}` |
| 预期结果 | 删除成功 |
| 设计原因 | ADMIN 有全局管理权限 |

#### TC-POST-007：文章点赞

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-007 点赞后 likeCount +1 |
| 测试步骤 | POST `/api/posts/{id}/like` |
| 预期结果 | 1. likeCount +1<br>2. 同一用户再次点赞，likeCount -1（取消点赞） |

#### TC-POST-008：同一用户重复点赞

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-008 同一用户重复点赞只生效一次 |
| 测试步骤 | 连续 POST `/api/posts/{id}/like` 两次 |
| 预期结果 | 第二次点赞无效，likeCount 不变（Toggle 机制） |

#### TC-POST-009：文章浏览量计数

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-009 访问文章后 viewCount +1 |
| 测试步骤 | GET `/api/public/posts/{slug}` |
| 预期结果 | `posts.view_count` +1 |

#### TC-POST-010：草稿文章不对外展示

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-POST-010 草稿不显示在公开列表 |
| 测试步骤 | 创建 status=DRAFT 的文章后，GET `/api/public/posts` |
| 预期结果 | 列表中不包含该草稿 |
| 设计原因 | 草稿在正式发布前不应被外界看到 |

---

### 2.4 评论模块

#### TC-CMT-001：游客发表评论

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-CMT-001 游客发表带信息的评论 |
| 测试步骤 | POST `/api/public/comments/{postId}`<br>Body: `{"content":"测试评论","authorName":"访客A"}` |
| 预期结果 | 评论创建成功，返回评论信息 |

#### TC-CMT-002：评论 XSS 过滤

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-CMT-002 评论内容含 XSS 脚本 |
| 测试步骤 | POST `/api/public/comments/{postId}`<br>Body: `{"content":"<script>alert(1)</script>"}` |
| 预期结果 | 1. 评论创建成功（存入数据库）<br>2. 前端渲染时需做 HTML 转义<br>3. 攻击被 SecurityInterceptor 记录 |
| 设计原因 | 评论内容在数据库中保留原样，渲染时做转义，防止存储型 XSS |

#### TC-CMT-003：回复评论（嵌套）

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-CMT-003 回复评论 |
| 测试步骤 | POST `/api/public/comments/{postId}`<br>Body: `{"content":"这是回复","parentId":"comment_uuid"}` |
| 预期结果 | 回复成功，parent_id 正确关联 |

#### TC-CMT-004：游客不能删除他人评论

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-CMT-004 未登录删除他人评论 |
| 测试步骤 | 无 Token 调用 DELETE `/api/comments/{id}` |
| 预期结果 | 401 Unauthorized |

---

### 2.5 文件上传

#### TC-UPLOAD-001：正常图片上传

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-UPLOAD-001 正常图片上传 |
| 测试步骤 | POST `/api/upload/image`，上传真实 JPG 文件 |
| 预期结果 | 1. 上传成功，返回文件 URL<br>2. 文件存在 `./uploads/` 目录 |
| 测试数据 | 准备一个 100KB 的 `test.jpg` |

#### TC-UPLOAD-002：文件大小限制

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-UPLOAD-002 超过 5MB 的文件被拒绝 |
| 测试步骤 | 上传 6MB 的 JPG 文件 |
| 预期结果 | 返回 413 Payload Too Large |

#### TC-UPLOAD-003：伪造文件类型（扩展名绕过）

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-UPLOAD-003 将恶意脚本伪装成 JPG 上传 |
| 测试步骤 | 将 `.php` 文件重命名为 `.jpg` 上传 |
| 预期结果 | 1. 扩展名检查通过<br>2. Magic bytes 检查失败（不是真实图片）<br>3. 上传被拒绝，返回 400 |
| 设计原因 | 只检查扩展名不够，必须检查文件头（Magic bytes）防止伪装的恶意文件 |

#### TC-UPLOAD-004：上传路径穿越

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-UPLOAD-004 上传文件名含 `../` |
| 测试步骤 | 上传文件名 `../../../evil.php` |
| 预期结果 | 文件名被清理，路径穿越被阻止 |

---

### 2.6 安全工具（Python）

#### TC-TOOL-001：XSS 扫描器准确性

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-TOOL-001 XSS 扫描器能检测出反射型 XSS |
| 测试步骤 | POST `/api/security/web/xss/scan`<br>Body: `{"url": "http://testphp.vulnweb.com/search.php?term=<script>alert(1)</script>"}` |
| 预期结果 | 返回扫描报告，标记出 `<script>` 为 XSS 漏洞 |

#### TC-TOOL-002：SQLi 扫描器准确性

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-TOOL-002 SQLi 扫描器检测盲注 |
| 测试步骤 | POST `/api/security/web/sqli/scan`<br>Body: `{"url": "http://testphp.vulnweb.com/artists.php?artist=1"}` |
| 预期结果 | 返回扫描报告，检测到 SQL 注入点 |

#### TC-TOOL-003：扫描超时处理

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-TOOL-003 目标无响应时扫描器不卡死 |
| 测试步骤 | POST XSS scan 到一个不存在的域名 |
| 预期结果 | 5 秒内返回超时错误，不阻塞后续请求 |

---

### 2.7 数据库与并发

#### TC-DB-001：点赞并发安全

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-DB-001 同时 100 人点赞同一文章，likeCount 正确 |
| 测试步骤 | 用 JMeter/Postman 并发 100 个点赞请求 |
| 预期结果 | likeCount = 100，无数据丢失 |
| 设计原因 | 检查是否有并发问题导致计数不准确 |

#### TC-DB-002：文章删除后评论残留

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-DB-002 删除文章后评论是否级联删除 |
| 测试步骤 | 1. 创建有评论的文章<br>2. 删除该文章 |
| 预期结果 | 文章和评论都被删除（或评论的 post_id 置空） |
| 设计原因 | 防止孤儿数据；ON DELETE CASCADE 或手动级联清理 |

#### TC-DB-003：UUID 主键唯一性

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-DB-003 并发生成 UUID 不会冲突 |
| 测试步骤 | 100 个并发注册请求 |
| 预期结果 | 所有用户都有唯一 UUID，无冲突 |

---

### 2.8 前端页面测试

#### TC-FE-001：未登录访问管理后台

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-FE-001 未登录访问 /dashboard/admin 重定向 |
| 测试步骤 | 直接访问 `/dashboard/admin` |
| 预期结果 | 重定向到 `/login` |

#### TC-FE-002：普通用户访问管理后台

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-FE-002 非管理员访问 /dashboard/admin 重定向 |
| 前置条件 | 以 READER 角色登录 |
| 测试步骤 | 访问 `/dashboard/admin` |
| 预期结果 | 重定向到 `/` |

#### TC-FE-003：Admin Dashboard 统计展示

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-FE-003 管理后台正确显示统计数据 |
| 测试步骤 | 登录 Admin，访问 `/dashboard/admin` |
| 预期结果 | 显示用户数、文章数、攻击统计等正确数据 |

#### TC-FE-004：攻击趋势图无数据时显示

| 项目 | 内容 |
|------|------|
| 用例名称 | TC-FE-004 攻击趋势图空数据友好展示 |
| 测试步骤 | 清除所有 attack_logs 后访问 security tab |
| 预期结果 | 显示"暂无攻击记录"而非空白或报错 |

---

## 3. 测试数据设计

### 3.1 SQL 初始化测试数据

```sql
-- ============================================
-- 测试用户（密码统一为: Test@123456）
-- BCrypt 加密后的密码: $2a$10$...
-- ============================================

INSERT INTO users (id, username, email, password_hash, display_name, role, email_verified)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin',      'admin@example.com',      '$2a$10$...', '管理员',    'ADMIN',   true),
  ('22222222-2222-2222-2222-222222222222', 'author1',   'author1@example.com',    '$2a$10$...', '作者小王',  'AUTHOR',  true),
  ('33333333-3333-3333-3333-333333333333', 'author2',   'author2@example.com',    '$2a$10$...', '作者小李',  'AUTHOR',  true),
  ('44444444-4444-4444-4444-444444444444', 'reader1',   'reader1@example.com',    '$2a$10$...', '读者张三',  'READER',  true),
  ('55555555-5555-5555-5555-555555555555', 'testuser',  'test@example.com',       '$2a$10$...', '测试用户',  'AUTHOR',  true);

-- ============================================
-- 标签
-- ============================================
INSERT INTO tags (id, name, slug, description)
VALUES
  ('t-001', 'Java',       'java',       'Java 编程语言'),
  ('t-002', 'Spring Boot','spring-boot','Spring Boot 框架'),
  ('t-003', 'MySQL',      'mysql',      'MySQL 数据库'),
  ('t-004', 'Docker',     'docker',     '容器化技术'),
  ('t-005', 'DevOps',     'devops',     '开发运维'),
  ('t-006', '前端',        'frontend',   '前端技术');

-- ============================================
-- 文章（status: DRAFT / PUBLISHED）
-- ============================================
INSERT INTO posts (id, slug, title, excerpt, content, author_id, status, view_count, like_count, published_at)
VALUES
  ('p-001', 'spring-boot-security-guide',    'Spring Boot 安全完全指南',    '深入讲解 JWT、CSRF、OAuth2...',   '长正文内容...', '22222222-2222-2222-2222-222222222222', 'PUBLISHED', 1250, 45, NOW()),
  ('p-002', 'mysql-optimization-tips',       'MySQL 性能优化 20 条技巧',    '从索引到慢查询，全面优化...',     '长正文内容...', '22222222-2222-2222-2222-222222222222', 'PUBLISHED', 890,  32, NOW()),
  ('p-003', 'docker-compose-best-practices', 'Docker Compose 最佳实践',     '生产环境使用 Docker Compose...',  '长正文内容...', '33333333-3333-3333-3333-333333333333', 'PUBLISHED', 670,  28, NOW()),
  ('p-004', 'my-draft-post',                 '我的草稿（不可见）',           '这是一篇草稿...',               '长正文内容...', '55555555-5555-5555-5555-555555555555', 'DRAFT',     0,    0,  NULL);

-- 文章-标签关联
INSERT INTO post_tags (post_id, tag_id) VALUES
  ('p-001', 't-001'), ('p-001', 't-002'), ('p-001', 't-003'),
  ('p-002', 't-003'),
  ('p-003', 't-004'), ('p-003', 't-005');

-- ============================================
-- 评论
-- ============================================
INSERT INTO comments (id, content, author_name, author_email, post_id, status, ip_address)
VALUES
  ('c-001', '写得很好，受益匪浅！',          '游客A', 'guest1@test.com', 'p-001', 'APPROVED', '1.2.3.4'),
  ('c-002', '请问有代码仓库地址吗？',         '游客B', 'guest2@test.com', 'p-001', 'APPROVED', '5.6.7.8'),
  ('c-003', '<script>alert(1)</script>',     '黑客',   'hacker@evil.com',  'p-001', 'APPROVED', '9.9.9.9'),
  ('c-004', '支持一下！',                    '游客C', 'guest3@test.com', 'p-002', 'APPROVED', '2.3.4.5');

-- 嵌套评论
INSERT INTO comments (id, content, author_name, author_email, post_id, parent_id, status, ip_address)
VALUES
  ('c-005', 'GitHub 地址：github.com/xxx', 'author1', 'author1@example.com', 'p-001', 'c-002', 'APPROVED', '22222222');

-- ============================================
-- 攻击日志（模拟攻击数据）
-- ============================================
INSERT INTO attack_logs (id, ip, path, method, payload, attack_type, user_agent, query_params)
VALUES
  ('a-001', '192.168.1.100', '/api/public/search', 'GET', '<script>alert(1)</script>', 'XSS',              'Mozilla/5.0',  'q=<script>alert(1)</script>'),
  ('a-002', '192.168.1.100', '/api/public/search', 'GET', "1' or '1'='1",              'SQL_INJECTION',  'sqlmap/1.7',   "q=1' or '1'='1"),
  ('a-003', '192.168.1.100', '/api/public/search', 'GET', '../../etc/passwd',           'PATH_TRAVERSAL', 'python-requests/2.28', 'q=../../etc/passwd'),
  ('a-004', '10.0.0.50',     '/api/public/search', 'GET', '; cat /etc/passwd',          'COMMAND_INJECTION', 'curl/7.68', 'q=; cat /etc/passwd'),
  ('a-005', '10.0.0.50',     '/.env',             'GET', '',                           'SENSITIVE_ACCESS',  'nmap/7.92',   ''),
  ('a-006', '172.16.0.10',   '/wp-admin',         'GET', '',                           'SENSITIVE_ACCESS',  'python-requests/2.28', ''),
  ('a-007', '172.16.0.10',   '/api/public/search', 'GET', '/admin/config',              'SENSITIVE_ACCESS',  'python-requests/2.28', 'q=/admin/config'),
  ('a-008', '1.2.3.4',       '/api/auth/login',   'POST', '',                          'BRUTE_FORCE',       'python-requests/2.28', ''),
  ('a-009', '1.2.3.4',       '/api/auth/login',   'POST', '',                          'BRUTE_FORCE',       'python-requests/2.28', ''),
  ('a-010','1.2.3.4',       '/api/auth/login',   'POST', '',                          'BRUTE_FORCE',       'python-requests/2.28', '');

-- 威胁特征（模拟重复攻击者）
INSERT INTO threat_signatures (id, ip, payloads, user_agent, attack_count, attack_types, reviewed, risk_level)
VALUES
  ('ts-001', '192.168.1.100', '<script>alert(1)</script>||1'' or ''1''=''1||../../etc/passwd', 'sqlmap/1.7', 3, 'XSS,SQL_INJECTION,PATH_TRAVERSAL', false, 'critical'),
  ('ts-002', '10.0.0.50',     '; cat /etc/passwd', 'curl/7.68', 2, 'COMMAND_INJECTION,SENSITIVE_ACCESS', false, 'high'),
  ('ts-003', '172.16.0.10',   '/wp-admin||/admin/config', 'python-requests/2.28', 2, 'SENSITIVE_ACCESS', false, 'medium');

-- ============================================
-- 登录尝试记录
-- ============================================
INSERT INTO login_attempts (id, ip, username, success, user_agent)
VALUES
  ('la-001', '1.2.3.4', 'admin',      false, 'python-requests/2.28'),
  ('la-002', '1.2.3.4', 'admin',      false, 'python-requests/2.28'),
  ('la-003', '1.2.3.4', 'testuser',  false, 'python-requests/2.28'),
  ('la-004', '47.242.21.40', 'testuser', true, 'Mozilla/5.0');

-- ============================================
-- 留言板
-- ============================================
INSERT INTO guestbook (id, nickname, content, contact)
VALUES
  ('gb-001', '访客A', '博客写得真好！',     'email@example.com'),
  ('gb-002', '访客B', '请问怎么联系博主？',  '微信: xxx');

-- ============================================
-- 友链申请
-- ============================================
INSERT INTO friend_links (id, name, url, status, email)
VALUES
  ('fl-001', '朋友的博客', 'https://friend.com', 'PENDING', 'friend@friend.com'),
  ('fl-002', '好用的工具站', 'https://tool.com', 'APPROVED', 'tool@tool.com');
```

### 3.2 API 测试数据（Postman / JMeter）

#### 认证测试集

```json
// POST /api/auth/login - 正确密码
{
  "username": "testuser",
  "password": "Test@123456"
}

// POST /api/auth/login - 错误密码
{
  "username": "testuser",
  "password": "WrongPass@123"
}

// POST /api/auth/register - 正常注册
{
  "username": "newtestuser",
  "email": "newtest@example.com",
  "password": "NewTest@123456",
  "code": "123456"
}

// POST /api/posts - 创建文章
{
  "title": "测试文章标题",
  "content": "## 简介\n\n这是正文内容...\n\n## 代码示例\n\n```java\nSystem.out.println(\"Hello\");\n```",
  "excerpt": "文章摘要",
  "tags": ["java", "spring-boot"],
  "status": "PUBLISHED"
}

// POST /api/public/comments/p-001 - 发表带 XSS 的评论
{
  "content": "好文！<img src=x onerror=alert(1)>",
  "authorName": "测试访客"
}

// 暴力破解测试（循环 10 次）
// POST /api/auth/login - body 每次相同
{
  "username": "admin",
  "password": "BruteForce@123"
}
```

---

## 4. 设计思路解释

### 4.1 为什么用 httpOnly Cookie 而非 localStorage 存 Token？

| 方案 | 优点 | 缺点 |
|------|------|------|
| httpOnly Cookie（当前方案） | XSS 无法读取 Token，防 CSRF（配 SameSite） | 需要处理 CORS |
| localStorage | 简单，API 调用方便 | XSS 可直接读取 Token |

**当前方案**：Token 存在 httpOnly Cookie 中，JavaScript 无法直接读取。前端 API 调用通过 Next.js 服务端代理（`/app/api/` 路由）转发，Token 自动随 Cookie 发送。这样即使前端有 XSS 漏洞，攻击者也拿不到 Token。

### 4.2 为什么攻击检测后不直接拦截（403）而是放行+记录？

传统 WAF 的做法是检测到攻击后直接 403。但这里选择**只记录不放行**有更深层的目的：

1. **收集攻击样本**：即使当前正则没覆盖的攻击方式，payload 也会被记录到 `threat_signatures`
2. **减少误伤**：合法用户偶尔输入 `<script>` 可能被误判，放行不影响体验
3. **改进规则**：运维人员可以根据真实攻击数据更新正则，形成正循环

**注意**：对于高危攻击（命令注入、路径穿越），实际生产中应该直接拦截。记录是为了分析，正拦截是保险。

### 4.3 为什么用 BCrypt 而不是 MD5/SHA1 存密码？

MD5 和 SHA1 是**哈希算法**（无密钥），可以用彩虹表快速破解。BCrypt 是**密码哈希算法**，自带盐（salt），且计算成本可调（cost factor），即使泄露数据库也无法快速破解。

```java
// BCrypt 工作原理：
// 每次盐随机生成，同一密码每次哈希结果不同
BCrypt.hashpw(password, BCrypt.gensalt())  // 加密
BCrypt.checkpw(input, hash)                  // 验证
```

### 4.4 为什么用 JWT 而不是 Session？

| | JWT | Session |
|--|-----|---------|
| 存储位置 | 客户端（Token 本身） | 服务端（Session 存储） |
| 扩展性 | 无状态，多实例共享 | 需要 Redis/DB 共享 Session |
| 注销 | 困难（Token 有效期无法撤销） | 简单（删除 Session 即可） |
| 适用场景 | 跨服务/微服务 | 单体应用，高安全要求 |

本项目用 JWT，因为：
- 前端 Next.js + 后端 Spring Boot 是两个独立服务
- JWT 适合跨域认证
- 配合 httpOnly Cookie 使用，降低了 Token 泄露风险

### 4.5 为什么 ThreatSignature 用 IP 作为唯一标识而不是用户 ID？

ThreatSignature 的目的是**追踪攻击者**。攻击者通常没有登录，所以没有 userId。但所有请求都有 IP（即使换了账号，IP 不变）。用 IP 追踪可以看到同一个攻击者尝试的所有攻击手法组合。

### 4.6 为什么评论的 XSS 不过滤到数据库？

有两条路线：
- **路线A（过滤入库）**：入库前转义 `<` → `&lt;`，数据库存安全内容，渲染时不用转义
- **路线B（不过滤入库）**：数据库存原内容，渲染时转义

当前项目是**路线B**（评论含 `<script>` 也能正常存储），因为：
- 数据库中的内容应该保持原始性
- 前端渲染时统一转义更可靠
- 如果其他地方（API、RSS）用到评论内容，也都会经过转义

### 4.7 为什么用 UUID 而非自增 ID 作为主键？

| | UUID | 自增 ID |
|--|------|--------|
| 安全性 | 无法枚举 | 可枚举，用户 ID 可被预测 |
| 分布式 | 无冲突 | 分库分表时冲突 |
| 存储 | 36 字符，更大索引 | 4/8 字节，更小更快 |
| 可读性 | 无业务含义 | 有业务含义 |

本项目是公网博客，自增 ID 会被枚举（`/api/posts/1`, `/api/posts/2`），攻击者可快速爬取所有内容。UUID 无规律，安全性更高。

---

## 5. 面试题与答案

### 5.1 Java 基础

**Q1：HashMap 和 Hashtable 的区别？**

A：
- `Hashtable` 线程安全（synchronized），`HashMap` 非线程安全
- `Hashtable` 不允许 null key/value，`HashMap` 允许一个 null key 和多个 null value
- `HashMap` 使用红黑树（JDK8+），Hashtable 使用链表
- 推荐用 `ConcurrentHashMap` 替代 Hashtable

**Q2：Java 中的值传递和引用传递？**

A：Java 永远是**值传递**。基本类型传递值的副本，引用类型传递引用的副本（地址的副本）。所以不可能通过方法改变外部引用指向新对象，但可以通过引用修改对象内部状态。

```java
void change(String s) { s = "new"; }       // 不生效
void change(List<String> list) { list.add("X"); } // 生效
```

**Q3：synchronized 和 ReentrantLock 的区别？**

A：
- `synchronized` 是 JVM 内置关键字，自动释放锁；`ReentrantLock` 是 API，需手动 unlock()
- `ReentrantLock` 支持tryLock()、公平锁、多条件Condition
- `synchronized` 不可中断；`ReentrantLock` 可中断
- 高并发下推荐 `ReentrantLock`，但简单场景用 `synchronized`

**Q4：JVM 内存结构（堆、栈、方法区）？**

A：
- **堆（Heap）**：所有对象实例和数组，GC 管理区域，分新生代（Eden+Survivor）和老年代
- **栈（Stack）**：线程私有，存储局部变量表、操作数栈、方法返回值，每个方法调用创建一个栈帧
- **方法区（Method Area）**：类信息（Class 对象）、常量、静态变量、JIT 编译后代码
- **程序计数器**：记录当前线程执行的字节码行号

**Q5：GC 常见算法？**

A：
- **标记-清除（Mark-Sweep）**：标记存活对象，清除未标记对象。会产生碎片
- **复制（Copying）**：将存活对象复制到另一半区域。空间浪费一半，无碎片
- **标记-整理（Mark-Compact）**：标记后移动存活对象到一端。避免碎片，需移动对象
- **分代收集**：新生代用复制算法（对象存活率低），老年代用标记-整理（存活率高）

### 5.2 Spring Boot

**Q6：Spring Boot 自动装配原理？**

A：`@SpringBootApplication` = `@EnableAutoConfiguration` + `@ComponentScan` + `@Configuration`。`EnableAutoConfiguration` 通过 `spring.factories`（或 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`）加载所有 `AutoConfiguration` 类，按条件（`@ConditionalOnClass` 等）决定是否生效。

**Q7：Spring Bean 的作用域？**

A：
- `singleton`（默认）：整个容器一个实例
- `prototype`：每次注入创建新实例
- `request`（Web）：每个 HTTP 请求一个实例
- `session`（Web）：每个 HTTP Session 一个实例
- `application`（Web）：ServletContext 生命周期内一个实例

**Q8：@Transactional 失效的场景？**

A：
- 方法内部调用（不走代理）
- 非 public 方法
- 异常被 catch 吞掉未抛出
- 多线程中调用
- 传播行为设置为 PROPAGATION_NOT_SUPPORTED
- rollbackFor 配置错误（默认只回滚 RuntimeException）

**Q9：Spring Boot 如何解决循环依赖？**

A：
- **构造函数循环依赖**：无法解决，启动即报错
- **Setter/Field 循环依赖**（单例）：通过**三级缓存**解决
  - 一级缓存：成品 Bean
  - 二级缓存：半成品 Bean（未属性填充）
  - 三级缓存：Lambda 表达式（ObjectFactory），用于创建代理

```java
// 三级缓存机制
singletonObjects = new ConcurrentHashMap<>();    // 成品
earlySingletonObjects = new ConcurrentHashMap<>(); // 半成品
singletonFactories = new ConcurrentHashMap<>();    // Lambda 工厂
```

**Q10：Spring MVC 请求处理流程？**

A：
1. 请求到达 `DispatcherServlet`
2. `HandlerMapping` 根据 URL 找 `HandlerExecutionChain`
3. `HandlerAdapter` 执行 Controller 方法
4. Controller 返回 `ModelAndView`
5. `ViewResolver` 解析视图名得到 View 对象
6. View 渲染 Model 数据，写入 Response

### 5.3 MySQL

**Q11：MySQL 索引失效的情况？**

A：
- 使用 `!=` 或 `<>` 
- `LIKE '%xxx'`（前缀通配符）
- 索引列参与计算或函数
- `OR` 前后不是同列索引
- 数据类型隐式转换（如字符串字段用数字查）
- `NOT IN`、`NOT EXISTS`
- `ORDER BY` 用了不在索引中的字段

**Q12：InnoDB 和 MyISAM 的区别？**

A：
- InnoDB 支持事务、行级锁、外键；MyISAM 不支持
- InnoDB 支持 MVCC；MyISAM 不支持
- InnoDB 聚簇索引（数据文件和索引文件在一起）；MyISAM 非聚簇索引
- InnoDB 崩溃恢复更强；MyISAM 表级锁，高并发写入差
- MyISAM 适合读多写少；InnoDB 是默认引擎

**Q13：什么是聚簇索引？InnoDB 和 MyISAM 如何存储数据？**

A：
- **InnoDB**：主键索引叶子节点存储完整行数据（聚簇），非主键索引叶子节点存主键值（回表查询）
- **MyISAM**：主键和非主键索引叶子节点都存数据行地址（非聚簇），和数据文件分开

**Q14：事务隔离级别？**

A：
| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|----------|------|-----------|------|
| READ UNCOMMITTED | ✅ 可能 | ✅ 可能 | ✅ 可能 |
| READ COMMITTED | ❌ | ✅ 可能 | ✅ 可能 |
| REPEATABLE READ（MySQL默认）| ❌ | ❌ | ❌（MVCC） |
| SERIALIZABLE | ❌ | ❌ | ❌ |

**Q15：MVCC 原理？**

A：Multi-Version Concurrency Control。在 REPEATABLE READ 下：
- 每次事务开始创建 ReadView，包含：活跃事务 ID 列表（`trx_ids`）、最小活跃事务 ID（`min_trx_id`）、事务ID（`creator_trx_id`）
- 读取数据时：数据的 `row_trx_id` vs ReadView
  - `row_trx_id < min_trx_id`：可见（事务已提交）
  - `row_trx_id > max_trx_id`：不可见（快照之后开始）
  - `row_trx_id in trx_ids`：不可见（活跃事务修改）
  - `row_trx_id == creator_trx_id`：可见（自己修改）

### 5.4 安全

**Q16：如何防止 SQL 注入？**

A：
1. **参数化查询**（PreparedStatement）：所有用户输入作为参数，不拼接 SQL
2. **ORM 框架**：JPA/MyBatis 的 `#{}` 自动参数化
3. **输入验证**：白名单过滤
4. **最小权限原则**：数据库用户不给 DROP 等危险权限
5. **错误信息**：生产环境不返回详细 SQL 错误

**Q17：如何防止 XSS？**

A：
1. **输入过滤**：白名单验证输入格式
2. **输出转义**：HTML 转义 `<>&"'` 等字符
3. **HTTP 头**：`X-XSS-Protection`、`Content-Security-Policy`
4. **HttpOnly Cookie**：防止 JS 读取敏感 Cookie
5. **区分上下文**：HTML 内容用转义，JavaScript 用 JSON，URL 用 URLEncode

**Q18：CSRF 攻击原理及防御？**

A：用户登录 A 网站后，访问恶意网站 B，B 中有自动提交的表单指向 A 的转账接口，自动携带 A 的 Cookie。

防御：
1. **SameSite Cookie**：设置为 `SameSite=Strict/Lax`，浏览器自动不携带跨站 Cookie
2. **CSRF Token**：表单中加入服务端生成的随机 Token，提交时验证
3. **Referer/Origin 头**：验证请求来源

**Q19：密码如何安全存储？**

A：
- ❌ 绝对不能用：明文、MD5、SHA1
- ✅ 推荐：BCrypt（cost factor=10-12）、Argon2（最佳，但 BCrypt 最成熟）
- PBKDF2 也可以但比 BCrypt 慢

```java
// Spring Security BCrypt
PasswordEncoder encoder = new BCryptPasswordEncoder();
String hash = encoder.encode("MyPassword123");
// 存入数据库
// 验证: encoder.matches(raw, hash)
```

**Q20：Session vs JWT 各自适用场景？**

A：
- **Session**：需要**强制注销**（删除 Session 即时生效），用户量不大（Session 存储成本低），单机或简单架构
- **JWT**：**跨域认证**，微服务架构（无状态），需要 Token 携带用户信息（角色等），注销要求不高（可用 Token 黑名单或短有效期）

本项目用 JWT + httpOnly Cookie，因为前后端分离且跨域。

### 5.5 项目相关

**Q21：这个项目的整体架构是怎样的？**

A：本项目是前后端分离架构：
- **前端**：Next.js 14（App Router），TypeScript，Tailwind CSS，提供 SSR/SSG 混合渲染
- **后端**：Spring Boot 3 + Spring Security，JWT 认证，JPA/Hibernate
- **Python**：FastAPI，提供安全工具（XSS/SQLi 扫描、OSS 安全检测）
- **数据库**：MySQL 8（InnoDB）
- **部署**：Docker Compose 管理 4 个容器（MySQL、Backend、Frontend、Python）

**Q22：SecurityInterceptor 的设计思路？**

A：作为 Web 应用防火墙（WAF）的简化实现，核心思路是：
1. **规则匹配**：用正则检测 XSS、SQLi、命令注入、路径穿越等常见攻击特征
2. **不拦截只记录**：收集攻击样本，用于改进规则（学习型 WAF）
3. **双写**：同时写 `attack_logs`（单次攻击）和 `threat_signatures`（攻击者画像，累积所有 payload）
4. **白名单**：服务器自身 IP 不触发，减少误报
5. **扩展性**：规则以数组/正则形式存储，易于新增规则

**Q23：ThreatSignature 的设计解决了什么问题？**

A：传统 WAF 只能检测已知攻击模式。ThreatSignature 解决的是"未知攻击"问题：
- 当攻击者换了新手法（正则没覆盖），常规日志只有单条记录，无法看出攻击意图
- ThreatSignature 把同一个 IP 的**所有 payload** 累积起来，即使每条单独看都没命中正则，累积起来可以人工分析出新攻击模式
- 3 次触发阈值：避免一次误触就标记，减少噪音

**Q24：为什么选择 FastAPI 而不是 Spring Boot 做安全工具？**

A：
- FastAPI 基于 Starlette/Uvicorn，异步 I/O，高并发下性能优于同步 Spring
- 自动生成 OpenAPI 文档，前后端联调方便
- Python 生态有大量安全工具库（requests、beautifulsoup4、lxml）
- 开发和部署更轻量（单个容器，不像 Spring Boot 需要完整 JDK 镜像）
- 适合 CPU/IO 密集型的网络扫描任务

**Q25：JWT Token 放在 Cookie 里如何防 CSRF？**

A：
1. Cookie 的 `SameSite=Strict` 防止跨站请求携带 Cookie
2. Spring Security 配置 CSRF 令牌
3. 本项目前端 Next.js 是服务端渲染，API 调用走服务端代理，天然防护
4. 重要操作（删除/修改）额外验证密码或 OTP

**Q26：如何保证接口幂等性？**

A：幂等 = 同一操作执行多次结果相同。
- **GET**：天然幂等
- **POST（创建）**：用 UUID 作为业务ID，重复提交返回相同结果
- **POST（点赞）**：先查数据库是否已点赞，再决定是 INSERT 还是忽略
- **PUT（更新）**：用版本号（乐观锁 `@Version`）或唯一约束
- **DELETE**：幂等，第二次删除返回 404 或成功

本项目点赞用 Toggle 模式（已赞则取消，未赞则添加），天然幂等。

**Q27：如何做分页？前端如何处理？**

A：
- 后端：Page/Slice + 总数，URL 参数 `?page=0&size=20`
- 前端：无限滚动（Intersection Observer）或页码导航
- 数据库：`LIMIT #{size} OFFSET #{page*size}`，确保有合适索引

**Q28：如何设计一个可靠的登录系统？**

A：
1. 密码 BCrypt 加密（加盐+成本因子）
2. 登录错误次数限制（5次/15分钟）→ 临时封禁 IP
3. 验证码（图形/短信/邮件）防机器人
4. JWT Token 有实效（24h），用 httpOnly Cookie 存储
5. 敏感操作二次验证（删除等）
6. 登录日志记录（IP、设备、时间）
7. 异常登录通知（异地登录告警）

### 5.6 测试相关

**Q29：如何设计测试用例？**

A：遵循 **GIVEN-WHEN-THEN** 原则：
- **Given**：前置条件（数据、环境）
- **When**：执行的操作
- **Then**：预期结果

还要考虑：
- 等价类划分：输入分成有效等价类和无效等价类
- 边界值分析：0、负数、空、最大值
- 异常情况：网络超时、服务宕机、数据库连接失败
- 正交测试：多因素组合，用正交表减少测试量

**Q30：单元测试和集成测试的区别？**

A：
| | 单元测试 | 集成测试 |
|--|---------|---------|
| 范围 | 单个方法/类 | 多个组件/模块 |
| 依赖 | Mock 所有外部依赖 | 真实依赖（DB、Redis） |
| 速度 | 快（毫秒级） | 慢（秒级） |
| 失败定位 | 精确到方法 | 需要排查多个组件 |
| 工具 | JUnit + Mockito | SpringBootTest + Testcontainers |

**Q31：如何测试 private 方法？**

A：
1. ❌ **不推荐**：用反射直接调用 private 方法
2. ✅ **推荐**：通过 public 方法间接测试 private 方法
3. ✅ **合理情况**：将 private 方法拆分到独立的工具类，单独测试
4. 问"为什么要测试 private 方法"——说明设计可能有问题，方法应尽量小且内聚

**Q32：Mock 和 Stub 的区别？**

A：
- **Stub**：预先编程好的假实现，返回预设数据，不验证调用
- **Mock**：验证调用行为（次数、顺序、参数），不仅返回值，还验证交互
- Mockito 既可以 Stub（`when().thenReturn()`）也可以 Mock（`verify()`）

```java
// Stub：返回预设值
when(repo.findById("1")).thenReturn(Optional.of(user));

// Mock：验证调用
verify(repo, times(2)).save(user);
verify(repo, never()).delete(anyString());
```

---

*文档生成于 2026-05-17 · 项目版本随代码更新*
