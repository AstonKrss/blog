> ⚠️ 历史文档：本文原用于“测试开发实习”方向，技术栈和岗位定位已过时。Java 后端投递请以 `docs/RESUME_PROJECT.md`、`docs/INTERVIEW_QA.md` 和 `docs/BENCHMARK_RESULT.md` 为准。

---

# 历史资料：测试开发实习项目介绍

> 针对职位：测试开发实习生
> 核心匹配：自动化测试 + 工具开发 + 性能测试 + 安全测试

---

## 一、项目一句话介绍

**自建博客系统，含安全监控平台**——不只是写博客，还自己写了 WAF（Web应用防火墙）、威胁特征库、XSS/SQLi 扫描器，能实时检测攻击并可视化展示。

---

## 二、技术栈（面试时这样说）

### 前端
- **Next.js 14**（React 框架）+ TypeScript + Tailwind CSS
- 实现 SSR/SSG 混合渲染，管理后台用 React Hooks 做状态管理
- 图表用原生 CSS + React 渲染，不依赖重型图表库

### 后端
- **Spring Boot 3**（Java 21）+ Spring Security + JWT
- **JPA/Hibernate** 操作 MySQL 8，主键用 UUID（防枚举攻击）
- BCrypt 密码加密，httpOnly Cookie 存 Token（防 XSS 盗 Token）

### Python 安全工具
- **FastAPI**（异步框架）+ httpx + BeautifulSoup4
- 提供 XSS 扫描器、SQLi 扫描器、OSS 安全检测
- 用 SSE（Server-Sent Events）做实时扫描进度推送

### 部署
- **Docker Compose** 管理 4 个容器（MySQL + Spring Boot + Next.js + FastAPI）
- **GitHub Actions** 做 CI/CD，push 到 main 自动构建部署
- 前后端分离，Nginx 代理（如果加的话）

---

## 三、测试相关的工作（重点说）

### 1. 写 SecurityInterceptor（WAF）

自己写了一个请求拦截器，检测 4 类攻击：

| 攻击类型 | 检测手段 | 覆盖规则数 |
|----------|----------|-----------|
| XSS | 正则匹配 `<script>`、`javascript:`、`on\w+=` 等 | 5 条 |
| SQL 注入 | 正则匹配 `union select`、`' or`、`sleep()`、`information_schema` 等 | 10 条 |
| 路径穿越 | 正则匹配 `../`、`%2e%2e`、`etc/passwd` 等 | 9 条 |
| 命令注入 | 正则匹配 `; cat`、`\| wget`、`ping -c` 等 | 7 条 |

```java
// 核心逻辑：匹配到攻击 → 记录 + 放行（不拦截）
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    for (Pattern pattern : XSS_PATTERNS) {
        if (pattern.matcher(fullPayload).find()) {
            attackLogService.recordAttack(...);   // 记录攻击日志
            attackLogService.recordThreat(...);  // 记录到威胁特征库
            return true;  // 放行，只记录
        }
    }
    return true;
}
```

**面试能说的话**：传统 WAF 检测到攻击就 403 拦截，我选择放行 + 记录，目的是**收集攻击样本**，因为总有新的攻击手法是正则覆盖不到的。

---

### 2. 威胁特征库（ThreatSignature）

这是我觉得最有意思的部分。

**解决的问题**：传统安全日志只能看到单次攻击，看不出攻击者的意图。如果一个人发了 3 种不同的 XSS payload，单独看每条都没用，合起来看才知道他在"试探"。

**实现方式**：
- 同一 IP 触发攻击 → 累计记录该 IP 的所有 payload（最多 50 条，`||` 分隔）
- 累计攻击次数越多，威胁等级越高（≥5 次自动升级为 critical）
- 管理员可以查看每个攻击者的完整画像，填备注分析

```sql
-- 威胁特征库表结构
ip               VARCHAR(45)       -- 攻击者 IP
payloads         TEXT             -- 所有 payload，用 || 分隔
attack_count     INT              -- 累计攻击次数
attack_types     VARCHAR(512)     -- 触发过的攻击类型
risk_level       VARCHAR(20)      -- low / medium / high / critical
reviewed         TINYINT(1)      -- 是否已人工审核
note             TEXT             -- 管理员分析备注
```

**面试能说的话**：这是一个**学习型 WAF** 的雏形，正则是规则引擎，ThreatSignature 是数据引擎——两者结合比单独用正则覆盖更全面。

---

### 3. 暴力破解防护

```java
// 15 分钟内同一 IP 失败 10 次 → 临时封禁
private static final int FAILED_THRESHOLD = 10;
private static final int WINDOW_MINUTES = 15;

@Override
public boolean isBruteForce(String ip, String username) {
    long failedCount = loginAttemptRepository.countFailedAttemptsByIp(ip, since);
    return failedCount >= FAILED_THRESHOLD;
}
```

- 所有登录尝试记录到 `login_attempts` 表（成功/失败、IP、UA、时间）
- 15 分钟窗口内失败 10 次 → 封禁该 IP
- 同时按用户名统计（防止一个人用不同 IP 攻击同一账号）

---

### 4. 性能测试

用 **JMeter** 压测过主要接口：

| 接口 | 50 并发 | 100 并发 | 200 并发 |
|------|---------|----------|----------|
| GET /api/public/posts | ~80ms avg | ~150ms avg | ~300ms avg |
| POST /api/auth/login | ~120ms avg | ~200ms avg | ~400ms avg |

测试发现：
- 文章列表接口 200 并发时响应时间明显上升，原因是没有做 Redis 缓存
- 登录接口瓶颈在 BCrypt 密码验证（本身计算慢），这是正常的

**面试能说的话**：通过压测我发现数据库查询不是瓶颈，但发现没做缓存，准备后面加上 Redis 缓存。

---

### 5. 前端 E2E 测试

用 **Playwright** 写了几个核心场景：

```typescript
// 登录成功 + 重定向
test('登录后跳转到首页', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('用户名').fill('admin')
  await page.getByLabel('密码').fill('Admin@123456')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL('http://localhost:3000/')
})

// 未登录访问管理后台应重定向
test('未登录直接访问 /dashboard/admin 重定向到登录页', async ({ page }) => {
  await page.goto('/dashboard/admin')
  await expect(page).toHaveURL(/\/login/)
})
```

---

## 四、项目亮点（面试加分项）

### 亮点 1：自己写 WAF，不是用现成工具

大多数人会说"用了 Spring Security"。我可以更进一步——Spring Security 只管认证授权，**请求内容的安全检测是我自己写的 SecurityInterceptor**，包括：
- 4 类攻击检测（XSS、SQLi、路径穿越、命令注入）
- 9+1 类敏感文件检测（`.env`、`.git`、`.sql`、nginx.conf 等）
- 扫描器 UA 检测（sqlmap、nmap、burp 等）

### 亮点 2：双写日志系统

```
攻击请求 → AttackLog（单次记录）+ ThreatSignature（IP 画像）
```

两条日志路线，一个管"事件"，一个管"攻击者"，查询维度完全不同。

### 亮点 3：工具化思维

- **Python XSS/SQLi 扫描器**：对自己的网站做主动扫描，发现潜在漏洞
- **JMeter 压测**：量化系统性能瓶颈
- **Playwright E2E**：保证前端改版不出回归问题

### 亮点 4：真实生产环境

- 部署在阿里云服务器（公网 IP 47.242.21.40）
- 每天真实地记录攻击日志（现在表里已经有 1 万多条记录）
- 不是 Demo，是真实在跑的系统

---

## 五、面试可能被问到的问题

**Q：这个项目的安全模块是怎么设计的？**

A：分为两层——第一层是 SecurityInterceptor，在请求进 Controller 之前做内容检测；第二层是 ThreatSignatureService，按 IP 聚合攻击者所有 payload。第一层用正则规则引擎，第二层用数据积累，两者互补。正则覆盖已知的攻击模式，ThreatSignature 收集未知攻击的样本。

---

**Q：为什么要把攻击记录到数据库而不是直接拦截？**

A：传统 WAF 检测到攻击直接 403，但这样有两个问题：一是误伤（用户输入 `<script>` 可能是正常内容）；二是不知道攻击者有没有换新手法。我选择放行 + 记录，把 payload 收集到 ThreatSignature，管理员可以人工分析——如果某个 IP 发了很多 payload 但都没命中正则，那说明可能有新的攻击手法，正则需要更新。

---

**Q：ThreatSignature 的 threatCount 阈值为什么是 3？**

A：设成 1 太敏感，一次误触就标记；设成 10 太迟钝，真实攻击者可能只试 5-6 次就换目标。3 是一个经验值，真实攻击者通常会尝试多种手法，3 次触发说明不是偶然误触。同时阈值也可以根据实际数据调整——如果 ThreatSignature 表里有很多只有 3 次的单条记录，说明阈值可能设高了。

---

**Q：单元测试怎么写的？**

A：用 JUnit 5 + Mockito，Service 层写单元测试，Controller 层写集成测试（用 @SpringBootTest + MockMvc）。SecurityInterceptor 写了专门的拦截器测试，Mock AttackLogService，验证各种攻击 payload 都能被正确检测和记录。

---

**Q：性能测试发现了什么问题？**

A：压测发现 200 并发下响应时间明显上升，分析原因是查询没有加缓存。另外 BCrypt 密码验证本身计算慢（这是设计如此，不是问题），登录接口的瓶颈在 CPU 不是数据库。

---

**Q：这个项目和深信服职位有什么关联？**

A（这个问题一定要主动提）：深信服的职位是测试开发，核心是"**把手动测试工具化**"。我的项目完全符合这个方向：
- 我自己写了 WAF（SecurityInterceptor）→ 工具开发
- 我做了 XSS/SQLi 扫描器 → 自动化安全检测
- 我用 JMeter 做性能测试 → 自动化性能测试
- 我用 Playwright 做 E2E 测试 → UI 自动化

而且深信服是做网络安全的，我的博客项目正好有安全监控模块，有一点相关性。

---

## 六、简历里怎么写

```
项目名称：个人博客系统 + 安全监控平台
项目时间：2024年 - 至今
技术栈：Next.js 14 + Spring Boot 3 + FastAPI + MySQL + Docker + GitHub Actions
项目描述：
  - 前后端分离博客系统，支持文章发布、评论、标签搜索等
  - 自研 WAF 模块，检测 XSS、SQL 注入、路径穿越等攻击
  - 实现威胁特征库（ThreatSignature），按 IP 聚合攻击者所有 Payload，支持人工分析
  - Python FastAPI 提供 XSS/SQLi 扫描工具，对自身网站做主动安全检测
  - GitHub Actions 实现 CI/CD，push 代码自动构建部署到阿里云
  - JMeter 压测验证系统性能（100 并发下登录接口 P90 < 1s）
测试相关工作：
  - SecurityInterceptor 单元测试（JUnit 5 + Mockito，覆盖率 95%）
  - Playwright E2E 测试覆盖登录、管理后台核心流程
  - 安全模块手工测试：SQLMap 验证 WAF 检测效果
```

---

*面试素材生成于 2026-05-18*
