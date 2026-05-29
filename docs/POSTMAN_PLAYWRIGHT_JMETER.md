# Postman · Playwright · JMeter 实战指南

> 围绕本项目（Blog）讲解三个核心工具，边做边学，零基础可上手。

---

## 目录

1. [Postman：接口测试](#1-postman接口测试)
2. [Playwright：浏览器自动化](#2-playwright浏览器自动化)
3. [JMeter：性能测试](#3-jmeter性能测试)
4. [三步走：从零到实战](#4-三步走从零到实战)

---

## 1. Postman：接口测试

### 1.1 安装

下载地址：https://www.postman.com/downloads/

注册账号（可跳过，但推荐登录方便同步 Collection）。

---

### 1.2 认识界面

```
┌─────────────────────────────────────────────────┐
│  Collections（左侧）    │   Request（右侧）       │
│  📁 Blog API            │   GET  http://...       │
│    📁 Auth             │   Params | Headers      │
│      Login             │   Body | Tests          │
│      Register          │   [Send] ▶              │
│    📁 Posts            │                          │
│    📁 Security         │   Response:             │
│                        │   { code: 0, data: {...} }│
└─────────────────────────────────────────────────┘
```

- **Collection**：一个项目 = 一个 Collection
- **Request**：一个接口 = 一个 Request
- **Environment**：多环境变量（dev/test/prod）

---

### 1.3 第一步：创建 Collection 和 Environment

**Step 1：新建 Collection**

```
左侧 → 点击 "+" → 命名为 "Blog API"
```

**Step 2：创建环境变量**

```
右上角 ⚙️ → Manage Environments → Add

Development（开发）:
  base_url:  http://localhost:8080

Test（测试服务器）:
  base_url:  http://47.242.21.40:8080

Production（线上）:
  base_url:  https://aston.website
```

切换环境后，所有 `{{base_url}}` 自动替换。

---

### 1.4 接口测试实战

#### 测试 1：登录

```
Collection: Blog API
新建 Request → 命名为 "Login"

Method: POST
URL: {{base_url}}/api/auth/login
Headers:
  Content-Type: application/json
Body（raw JSON）:
{
  "username": "testuser",
  "password": "Test@123456"
}
```

点 **Send** → 看 Response，确认返回：

```json
{
  "code": 0,
  "data": {
    "username": "testuser",
    "role": "AUTHOR"
  }
}
```

**写断言（Tests）**：

```javascript
// 点开 "Tests" 标签，输入以下脚本

// 1. 检查状态码是 200
pm.test("状态码 200", function () {
    pm.response.to.have.status(200);
});

// 2. 检查 code 是 0（成功）
pm.test("code 为 0", function () {
    var json = pm.response.json();
    pm.expect(json.code).to.eql(0);
});

// 3. 检查有 username 字段
pm.test("返回有 username", function () {
    var json = pm.response.json();
    pm.expect(json.data).to.have.property('username');
});

// 4. 检查 auth_token Cookie 存在
pm.test("auth_token Cookie 存在", function () {
    pm.expect(pm.cookies.get("auth_token")).to.exist;
});
```

点 Send → 底部 "Test Results" 显示 4/4 通过 ✅

---

#### 测试 2：错误密码

```
新建 Request → "Login - 错误密码"

Body:
{
  "username": "testuser",
  "password": "WrongPassword"
}
```

断言：

```javascript
pm.test("错误密码返回 401", function () {
    pm.response.to.have.status(401);
});

pm.test("不设置 auth_token", function () {
    pm.expect(pm.cookies.get("auth_token")).to.be.undefined;
});
```

---

#### 测试 3：发布文章（需登录 Token）

**方法 A：用 Cookie（自动带）**

登录 Request 的 Tests 里保存 Cookie，后续请求自动携带：

```javascript
// 登录的 Tests 里加这行
pm.collectionVariables.set("login_cookie", pm.cookies.get("auth_token"));
```

后续 Request 里：
```
Headers:
  Cookie: auth_token={{login_cookie}}
```

**方法 B：用 Bearer Token（推荐）**

登录 Response 返回 JWT，存为变量：

```javascript
// 登录的 Tests 里
var json = pm.response.json();
if (json.data && json.data.token) {
    pm.collectionVariables.set("jwt_token", json.data.token);
}
// 注意：本项目 Token 存在 httpOnly Cookie，不在 body 里返回
// 所以改用 Authorization Header
```

对于本项目，Cookie 方式更准确（因为用的是 httpOnly Cookie）。

---

#### 测试 4：获取文章列表

```
Method: GET
URL: {{base_url}}/api/public/posts
Params:
  page: 0
  size: 10
```

断言：

```javascript
pm.test("返回文章列表", function () {
    var json = pm.response.json();
    pm.expect(json.code).to.eql(0);
    pm.expect(json.data.content).to.be.an('array');
});

pm.test("文章有 title", function () {
    var json = pm.response.json();
    if (json.data.content.length > 0) {
        pm.expect(json.data.content[0]).to.have.property('title');
    }
});

pm.test("响应时间 < 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

#### 测试 5：发表评论（含 XSS 检测）

```
Method: POST
URL: {{base_url}}/api/public/comments/p-001
Headers:
  Content-Type: application/json
Body:
{
  "content": "<script>alert(1)</script>",
  "authorName": "测试访客"
}
```

断言：

```javascript
pm.test("评论提交成功", function () {
    pm.response.to.have.status(200);
});

// 验证 attack_logs 表是否记录（手动去数据库查）
// SELECT * FROM attack_logs WHERE attack_type = 'XSS';
```

---

#### 测试 6：搜索接口 XSS 检测

```
Method: GET
URL: {{base_url}}/api/public/search
Params:
  q: <script>alert(1)</script>
```

断言：

```javascript
pm.test("XSS 请求正常返回（不拦截）", function () {
    pm.response.to.have.status(200);
});

// 验证记录
pm.test("攻击被记录", function () {
    var json = pm.response.json();
    pm.expect(json.code).to.eql(0);  // 不拦截，只记录
});
// 手动查 attack_logs 验证
```

---

#### 测试 7：安全工具 - XSS 扫描

```
Method: POST
URL: {{base_url}}/api/security/web/xss/scan
Headers:
  Content-Type: application/json
  Cookie: auth_token={{login_cookie}}
Body:
{
  "url": "http://47.242.21.40:8080/api/public/search?q=<script>alert(1)</script>"
}
```

断言：

```javascript
pm.test("扫描返回结果", function () {
    var json = pm.response.json();
    pm.expect(json).to.have.property('data');
});
```

---

### 1.5 参数化（数据驱动）

**目的**：同一接口，用不同数据批量测。

创建 CSV 文件 `login_data.csv`：

```
username,password,expect_code,expect_msg
testuser,Test@123456,200,成功
testuser,WrongPass,401,错误
nonexist,any,401,错误
```

Request 里：

```
Body（raw JSON）:
{
  "username": "{{username}}",
  "password": "{{password}}"
}
```

点右侧 **Runner**（批量运行）：

```
Collection: Blog API
Iteration: 3（CSV 有 3 行）
Data: login_data.csv
```

Postman 自动用每行数据跑一次，所有断言逐行验证。

---

### 1.6 生成测试报告

安装 Newman（Postman CLI）：

```bash
npm install -g newman
```

导出 Collection：

```
Postman 左侧 → 右键 Collection → Export → 保存为 blog-api.postman_collection.json
```

生成 HTML 报告：

```bash
newman run blog-api.postman_collection.json \
  -e "Test Environment.postman_environment.json" \
  --reporters html \
  --reporter-html-export report.html

# 打开 report.html 即可看到漂亮的测试报告
```

---

## 2. Playwright：浏览器自动化

### 2.1 安装

```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

安装后，创建配置文件：

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,  // 无头模式，不打开浏览器窗口
    screenshot: 'only-on-failure',  // 失败时自动截图
    video: 'retain-on-failure',     // 失败时自动录屏
  },
  // 本地开发时，Playwright 自动启动 dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

---

### 2.2 写第一个测试

创建目录和文件：

```bash
mkdir -p frontend/e2e
touch frontend/e2e/auth.spec.ts
```

```typescript
// frontend/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('认证流程', () => {

  test('正确登录后跳转到首页', async ({ page }) => {
    await page.goto('/login')

    // 填写表单
    await page.getByLabel('用户名').fill('testuser')
    await page.getByLabel('密码').fill('Test@123456')
    await page.getByRole('button', { name: '登录' }).click()

    // 等待跳转到首页
    await expect(page).toHaveURL('http://localhost:3000/')

    // 验证用户名出现在页面
    await expect(page.locator('body')).toContainText('testuser')
  })

  test('错误密码显示错误提示', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('用户名').fill('testuser')
    await page.getByLabel('密码').fill('WrongPass')
    await page.getByRole('button', { name: '登录' }).click()

    // 等待错误信息出现
    await expect(page.getByText(/错误|失败|不对/).first()).toBeVisible()
  })

  test('未登录直接访问管理后台应重定向', async ({ page }) => {
    await page.goto('/dashboard/admin')

    // 应重定向到登录页
    await expect(page).toHaveURL(/\/login/)
  })
})
```

运行测试：

```bash
cd frontend
npx playwright test
# 或只运行认证测试
npx playwright test e2e/auth.spec.ts
```

---

### 2.3 核心语法速查

```typescript
// ─── 打开页面 ───
await page.goto('/login')
await page.goto('http://localhost:3000/blog')

// ─── 定位元素（优先级从高到低）───
await page.getByLabel('用户名')           // 最佳：aria-label
await page.getByRole('button', {name:'登录'})  // 语义化
await page.getByText('提交')              // 文本匹配
await page.locator('#submit-btn')         // ID
await page.locator('.btn-primary')        // CSS 类名
await page.locator('input[name=username]') // 属性选择器

// ─── 操作 ───
await page.fill('input', '输入文字')     // 填入文字（清空后填）
await page.type('input', '一个字一个字')  // 逐字输入
await page.click('button')                // 点击
await page.press('input', 'Enter')        // 按键盘
await page.check('input[type=checkbox]')  // 勾选
await page.selectOption('select', 'CN')   // 下拉选择

// ─── 等待 ───
await page.waitForURL('/')                 // 等待 URL 变化
await page.waitForSelector('.result')       // 等待元素出现
await page.waitForResponse('**/api/posts')  // 等待某个请求完成
await expect(page).toHaveURL('/')          // 断言 URL
await expect(page.locator('.error')).toBeVisible()  // 断言元素可见

// ─── 获取内容 ───
const title = await page.locator('h1').textContent()
const count = await page.locator('button').count()

// ─── 截图 & 录屏 ───
await page.screenshot({ path: 'debug.png' })
await page.screenshot({ fullPage: true })  // 整页截图
// 失败时自动截（配置里已设置）
```

---

### 2.4 实战：测试安全监控页面

```typescript
// frontend/e2e/security.spec.ts
import { test, expect } from '@playwright/test'

test.describe('安全监控', () => {

  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.getByLabel('用户名').fill('admin')
    await page.getByLabel('密码').fill('Admin@123456')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL('http://localhost:3000/')
  })

  test('进入管理后台安全监控 Tab', async ({ page }) => {
    await page.goto('/dashboard/admin')

    // 点击安全监控 Tab
    await page.getByRole('button', { name: '安全监控' }).click()

    // 验证页面加载
    await expect(page.getByText('全部攻击')).toBeVisible()
    await expect(page.getByText('XSS')).toBeVisible()
  })

  test('攻击趋势图显示柱子', async ({ page }) => {
    await page.goto('/dashboard/admin')
    await page.getByRole('button', { name: '安全监控' }).click()

    // 等待图表加载（最多 5 秒）
    await page.waitForSelector('[title*="日:"]', { timeout: 5000 })

    // 统计柱子数量（7 天应有 7 根）
    const bars = page.locator('[title*="日:"]')
    const count = await bars.count()
    console.log('趋势图柱子数量:', count)
  })

  test('点击 XSS 筛选后日志列表变化', async ({ page }) => {
    await page.goto('/dashboard/admin')
    await page.getByRole('button', { name: '安全监控' }).click()

    // 点击 XSS 卡片
    const xssCard = page.getByText('XSS').locator('..')
    await xssCard.click()

    // 验证筛选标签出现
    await expect(page.getByText('XSS 筛选中')).toBeVisible()

    // 清除筛选
    await page.getByText('清除筛选').click()
    await expect(page.getByText('XSS 筛选中')).not.toBeVisible()
  })

  test('威胁特征库展示攻击者详情', async ({ page }) => {
    await page.goto('/dashboard/admin')
    await page.getByRole('button', { name: '安全监控' }).click()

    // 滚动到威胁特征库区域
    await page.getByText('威胁特征库').scrollIntoViewIfNeeded()

    // 如果有数据，检查 IP 和 payload 显示
    const threatSection = page.getByText('威胁特征库').locator('..')
    const hasThreats = await threatSection.locator('[data-testid="threat-item"]').count()
    if (hasThreats > 0) {
      await expect(threatSection.getByText(/[\d.]+/)).toBeVisible()  // IP
      await expect(threatSection.getByText(/次攻击/)).toBeVisible()
    }
  })
})
```

---

### 2.5 页面对象模式（POM）— 最佳实践

把页面元素封装成类，测试代码更干净：

```typescript
// frontend/e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  get usernameInput() {
    return this.page.getByLabel('用户名')
  }
  get passwordInput() {
    return this.page.getByLabel('密码')
  }
  get submitButton() {
    return this.page.getByRole('button', { name: '登录' })
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}

// frontend/e2e/pages/AdminSecurityPage.ts
export class AdminSecurityPage {
  constructor(private page: Page) {}

  get securityTab() {
    return this.page.getByRole('button', { name: '安全监控' })
  }

  async filterByType(type: string) {
    await this.securityTab.click()
    const card = this.page.getByText(type).locator('..')
    await card.click()
  }
}

// frontend/e2e/security-pom.spec.ts
import { test } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { AdminSecurityPage } from '../pages/AdminSecurityPage'

test('POM 写法：测试 XSS 筛选', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.login('admin', 'Admin@123456')

  const securityPage = new AdminSecurityPage(page)
  await securityPage.filterByType('XSS')
})
```

---

### 2.6 Mock（拦截请求，不依赖后端）

```typescript
test('前端数据正确展示（Mock 模式）', async ({ page }) => {
  // 拦截 API 返回假数据
  await page.route('**/api/admin/security/stats', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: {
          totalAttacks: 999,
          xssCount: 88,
          sqlInjectionCount: 77,
        }
      })
    })
  })

  await page.goto('/dashboard/admin')
  await page.getByRole('button', { name: '安全监控' }).click()

  // 验证 Mock 数据显示
  await page.waitForSelector('text=999')
  await expect(page.getByText('999')).toBeVisible()
})
```

---

### 2.7 运行与调试

```bash
# 运行所有 E2E 测试
npx playwright test

# 只运行某个文件
npx playwright test e2e/auth.spec.ts

# 带界面运行（可以看到浏览器操作）
npx playwright test --headed

# 单个测试（调试用）
npx playwright test e2e/auth.spec.ts:10
# 数字是测试所在的行号

# 查看 Playwright 生成的报告
npx playwright show-report
# 或打开 playwright-report/index.html
```

---

## 3. JMeter：性能测试

### 3.1 安装

下载地址：https://jmeter.apache.org/download_jmeter.cgi

**Windows**：下载 `apache-jmeter-5.6.3.zip`，解压，运行 `bin/jmeter.bat`
**Mac/Linux**：

```bash
brew install jmeter
# 或
wget https://jmeter.apache.org/apache-jmeter-5.6.3.tgz
tar -xzf apache-jmeter-5.6.3.tgz
```

---

### 3.2 认识界面

```
┌──────────────────────────────────────────────────────┐
│ Test Plan（测试计划）                                 │
│  └─ Thread Group（线程组 = 并发用户）                  │
│      ├─ HTTP Request Defaults（默认配置）             │
│      ├─ Login（Once Only Controller）                │
│      │   └─ HTTP Request: POST /api/auth/login      │
│      │       └─ Response Assertion                  │
│      ├─ Browse Posts（循环 10 次）                   │
│      │   └─ HTTP Request: GET /api/public/posts     │
│      └─ View Results Tree（看详情）                  │
│         Summary Report（汇总）                       │
└──────────────────────────────────────────────────────┘
```

---

### 3.3 测试场景设计

**场景 1：登录接口 100 并发压测**

```
目标：测试 100 人同时登录，系统能承受吗？
```

**Step 1：新建测试计划**

```
JMeter 打开 → 文件 → 新建 → Test Plan 命名为 "Blog 性能测试"
```

**Step 2：添加线程组（模拟用户）**

```
右键 Test Plan → 添加 → 线程（用户）→ 线程组

线程数（用户数）: 100          # 同时 100 个人
Ramp-up 时间（秒）: 20         # 20 秒内启动所有 100 人
循环次数: 3                    # 每人执行 3 轮
调度器:
  持续时间（秒）: 60           # 或持续压 60 秒
```

**Step 3：添加 HTTP 请求默认值（公共配置）**

```
右键线程组 → 添加 → 配置元件 → HTTP 请求默认值

协议: http
服务器名称或IP: 47.242.21.40
端口: 8080
```

**Step 4：添加登录请求**

```
右键线程组 → 添加 → Sampler（采样器）→ HTTP 请求

名称: Login - 正确密码
方法: POST
路径: /api/auth/login
内容编码: UTF-8
Parameters（勾选 "编码"）:
  username  = testuser
  password  = Test@123456
Headers:
  Content-Type = application/json
Body:
{
  "username": "testuser",
  "password": "Test@123456"
}
```

**Step 5：添加响应断言**

```
右键 Login 请求 → 添加 → 断言 → 响应断言

Apply to: Main sample only
响应字段: 响应代码
匹配: equals
测试模式: 200
```

**Step 6：添加结果查看器**

```
右键线程组 → 添加 → 监听器 → Summary Report（汇总报告）
右键线程组 → 添加 → 监听器 → View Results Tree（详细结果，用于调试）
右键线程组 → 添加 → 监听器 → Response Times Over Time（响应时间趋势）
右键线程组 → 添加 → 监听器 → Transactions per Second（TPS）
```

---

### 3.4 测试场景 2：模拟真实用户行为

```
一个人进来 → 登录 → 浏览文章列表 → 查看文章详情 → 搜索 → 退出
```

```
Test Plan
└─ Thread Group（50 用户）
    ├─ Once Only Controller（每人只执行 1 次）
    │   └─ HTTP Request: Login
    ├─ Interleave Controller（轮流执行）
    │   ├─ HTTP Request: GET 文章列表（权重 5）
    │   ├─ HTTP Request: GET 文章详情（权重 3）
    │   └─ HTTP Request: 搜索（权重 2）
    └─ Once Only Controller（每人只执行 1 次）
        └─ HTTP Request: Logout
```

---

### 3.5 CSV 参数化（数据驱动压测）

**准备 CSV 文件 `users.csv`**：

```
username,password
testuser,Test@123456
testuser,Test@123456
testuser,Test@123456
author1,Author1@123456
author1,Author1@123456
```

**添加 CSV 数据配置**：

```
线程组 → 添加 → 配置元件 → CSV Data Set Config

文件名: /path/to/users.csv          # 绝对路径
变量名: username,password           # 和 HTTP 请求里的 {{username}} 对应
分隔符: ,
遇到文件结束符停止循环: true
是否允许带引号: true
Recycle on EOF: true                # 循环使用数据
```

**HTTP 请求参数化**：

```
Body:
{
  "username": "${username}",
  "password": "${password}"
}
```

---

### 3.6 关联（提取登录 Token 用于后续请求）

```
目的：登录拿到 Token，后续请求带上
```

**Step 1：登录后提取 Token**

```
登录请求 → 添加 → 后置处理器 → JSON 提取器

名称: token
JSON 路径表达式: $.data.token
匹配数字（0=随机）: 1
```

**Step 2：后续请求使用 Token**

```
其他 HTTP 请求 → Headers:
  Authorization: Bearer ${token}
```

---

### 3.7 运行测试

**GUI 模式（调试用）**：

```
点击工具栏 ▶ 运行按钮
查看 Summary Report：
  - Samples: 总请求数
  - Average: 平均响应时间（ms）
  - Min/Max: 最小/最大响应时间
  - Error %: 错误率
  - Throughput: TPS（每秒请求数）
```

**非 GUI 模式（正式压测）**：

```bash
# Windows
cd apache-jmeter-5.6.3/bin
jmeter -n -t "D:\Blog 性能测试.jmx" \
  -l results.jtl \
  -e -o output-report

# Mac/Linux
./bin/jmeter -n -t ~/blog-test.jmx \
  -l results.jtl \
  -e -o output-report

# 参数说明：
# -n     非 GUI 模式
# -t     测试计划文件
# -l     结果文件（.jtl）
# -e     生成 HTML 报告
# -o     报告输出目录（目录要为空或不存在）
```

打开 `output-report/index.html` 查看精美报告。

---

### 3.8 报告指标解读

| 指标 | 含义 | 本项目参考值 |
|------|------|------------|
| **Samples** | 总请求数 = 线程数 × 循环次数 | 越多越好 |
| **Average** | 平均响应时间 | < 200ms 优秀，< 500ms 良好 |
| **Median** | 中位数响应时间（50% 用户） | 接近 Average 越好 |
| **P90** | 90% 用户的响应时间 | < 1s 良好 |
| **P95** | 95% 用户的响应时间 | < 2s 良好 |
| **P99** | 99% 用户的响应时间 | < 3s 良好 |
| **Error %** | 请求失败率 | < 1% 可接受 |
| **Throughput** | 每秒处理请求数（TPS） | 越高越好 |
| **KB/sec** | 吞吐量（带宽） | 越大越好 |

---

## 4. 三步走：从零到实战

### 第一天：Postman（2 小时）

```
目标：能跑通本项目所有接口
```

1. 下载安装 Postman
2. 新建 Collection "Blog API"
3. 创建 Environment（dev / test / prod）
4. 按本文档 1.4 节，依次测试：
   - Login（正确 + 错误密码）
   - 获取文章列表
   - 发表评论（含 XSS payload）
   - 安全工具 XSS 扫描
5. 写断言（Tests），保存所有 Request
6. 导出 Collection 备用

---

### 第二天：Playwright（3 小时）

```
目标：覆盖登录和管理后台的 E2E 测试
```

1. 安装 Playwright
2. 写 `auth.spec.ts`（3 个测试用例）
3. 写 `security.spec.ts`（安全监控页面）
4. 运行 `npx playwright test`，看结果
5. 如果失败，用 `--headed` 模式看浏览器操作
6. 把失败的截图和录屏保存下来

---

### 第三天：JMeter（3 小时）

```
目标：压测登录接口，摸清系统极限
```

1. 下载安装 JMeter
2. 按 3.3 节，搭一个最简单的测试计划：
   - 10 个线程，循环 3 次
   - POST /api/auth/login
   - 看 Summary Report
3. 逐步加压：10 → 50 → 100 → 200
4. 记录每个压力级别的 Average、P90、Error %
5. 生成 HTML 报告，分析性能瓶颈
6. 对比本地开发环境 vs 生产服务器的性能差距

---

### 验收标准

| 工具 | 验收 |
|------|------|
| **Postman** | 能导出 Collection，在 CI 里用 Newman 跑通 |
| **Playwright** | `npx playwright test` 全部通过，失败自动截图 |
| **JMeter** | 100 并发 3 轮循环，Error % < 1%，P90 < 1s |

---

### 快速命令速查

```bash
# Postman
newman run collection.json -e env.json --reporters html --reporter-html-export report.html

# Playwright
npx playwright test                    # 运行所有测试
npx playwright test auth.spec.ts      # 只跑某个文件
npx playwright test --headed          # 可见浏览器
npx playwright test --ui              # 图形界面
npx playwright show-report            # 查看报告

# JMeter
jmeter -n -t plan.jmx -l results.jtl -e -o report/
jmeter -g results.jtl -o html-report/  # 已有 jtl，生成报告
```

---

*指南生成于 2026-05-18 · 工具版本：Postman 10+, Playwright 1.44+, JMeter 5.6.3*