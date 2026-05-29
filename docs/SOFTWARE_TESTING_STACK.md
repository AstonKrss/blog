# 软件测试技术栈完全指南

> 涵盖：测试工具链、自动化框架选型、接口测试、性能测试、CI/CD 集成、测试管理流程。配合本项目讲解每个工具的实际用法。

---

## 目录

1. [软件测试全景图](#1-软件测试全景图)
2. [接口测试工具](#2-接口测试工具)
3. [Web 自动化测试](#3-web-自动化测试)
4. [性能测试](#4-性能测试)
5. [移动端测试](#5-移动端测试)
6. [持续集成（CI/CD）](#6-持续集成cicd)
7. [测试管理](#7-测试管理)
8. [数据库测试](#8-数据库测试)
9. [安全测试](#9-安全测试)
10. [测试框架对比总结](#10-测试框架对比总结)
11. [学习路径与建议](#11-学习路径与建议)

---

## 1. 软件测试全景图

### 1.1 测试类型分层

```
┌─────────────────────────────────────────────────────┐
│                    E2E 测试                          │
│          Selenium / Playwright / Cypress             │
├─────────────────────────────────────────────────────┤
│              接口/集成测试                            │
│     Postman / Rest Assured / JMeter / httpx          │
├─────────────────────────────────────────────────────┤
│               单元测试（开发写）                       │
│      JUnit / pytest / Go test / NUnit / Jest         │
├─────────────────────────────────────────────────────┤
│            静态测试 / 代码扫描                         │
│          SonarQube / ESLint / Checkstyle             │
└─────────────────────────────────────────────────────┘
```

### 1.2 测试工具地图

| 测试目标 | 常用工具 | 适用场景 |
|----------|----------|----------|
| **接口测试** | Postman, JMeter, Rest Assured, httpx | API 功能、自动化回归 |
| **Web UI 自动化** | Selenium, Playwright, Cypress | 页面功能回归 |
| **性能/压力测试** | JMeter, Gatling, LoadRunner, Locust | TPS、响应时间、并发 |
| **移动端测试** | Appium, UI Automator, Espresso | Android/iOS 应用 |
| **接口 Mock** | Charles, Fiddler, WireMock, Postman Mock | 前后端分离、依赖隔离 |
| **测试管理** | TestRail, Zephyr, Jira | 用例管理、缺陷跟踪 |
| **CI/CD 集成** | Jenkins, GitHub Actions, GitLab CI | 自动化流水线 |
| **代码质量** | SonarQube, Jacoco, Istanbul | 覆盖率、代码异味 |
| **BDD 行为驱动** | Cucumber, Behave, SpecFlow | 业务人员参与测试 |
| **混沌测试** | Chaos Monkey, Gremlin | 故障注入 |

### 1.3 本项目的技术栈对应

| 测试类型 | 本项目对应工具 |
|----------|---------------|
| 单元测试 | JUnit 5 + Mockito（Java），Jest（前端），pytest（Python） |
| 接口测试 | Postman（手动）+ Rest Assured / httpx（自动化） |
| Web 自动化 | Playwright（前端 E2E） |
| 性能测试 | JMeter（可做，本项目暂无） |
| 安全测试 | 自建 SecurityInterceptor + Python 扫描器 |
| CI/CD | GitHub Actions |

---

## 2. 接口测试工具

### 2.1 Postman（最通用）

**定位**：API 调试 + 接口测试 + Mock Server + 自动化脚本

#### 基本操作

```
1. 新建 Collection（集合）= 测试套件
2. 新建 Request = 单个测试用例
3. 设置 Method + URL + Headers + Body
4. 点击 Send 发送请求
5. 查看 Response（Body / Cookies / Headers / Time）
```

#### 本项目接口测试示例

**测试项**：POST `/api/auth/login` 登录

```
Method: POST
URL: {{base_url}}/api/auth/login
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "username": "testuser",
  "password": "Test@123456"
}
```

**断言脚本**（Tests 标签）：

```javascript
// 检查状态码
pm.test("状态码 200", function () {
    pm.response.to.have.status(200);
});

// 检查响应包含用户信息
pm.test("包含 username", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.username).to.eql("testuser");
});

// 检查 Cookie 存在
pm.test("auth_token Cookie 存在", function () {
    var cookie = pm.cookies.get("auth_token");
    pm.expect(cookie).to.exist;
});

// 检查返回时间 < 500ms
pm.test("响应时间 < 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

**批量参数化测试**（CSV 数据驱动）：

```csv
# login_data.csv
username,password,expect_status,expect_message
testuser,Test@123456,200,登录成功
testuser,WrongPass,401,用户名或密码错误
nonexist,nonexist,401,用户名或密码错误
```

Postman 引用变量：`{{username}}` 自动从 CSV 读取。

#### 环境变量（多环境切换）

| 环境 | base_url | 说明 |
|------|----------|------|
| Development | `http://localhost:8080` | 本地开发 |
| Test | `http://47.242.21.40:8080` | 测试服务器 |
| Production | `https://aston.website` | 线上 |

```
# Pre-request Script（自动设置 token）
if (pm.request.method === "POST" || pm.request.method === "PUT") {
    if (pm.environment.get("auth_token")) {
        pm.request.headers.add({
            key: "Authorization",
            value: "Bearer " + pm.environment.get("auth_token")
        });
    }
}
```

#### 生成测试报告

```bash
# 使用 Newman（Postman CLI）导出报告
npm install -g newman
newman run "Blog API.postman_collection.json" \
  --environment "Dev Environment.postman_environment.json" \
  --reporters html,json,junit \
  --reporter-junit-export report.xml \
  --reporter-html-export report.html
```

### 2.2 JMeter（性能 + 接口）

**定位**：性能测试为主（并发用户、吞吐量），也可做接口功能测试

#### 本项目接口测试示例

**测试计划结构**：

```
Test Plan
├── Thread Group（线程组 = 并发用户）
│   ├── CSV Data Set Config（参数化数据）
│   ├── Login - 正确密码（Once Only Controller 只执行1次）
│   │   └── HTTP Request (POST /api/auth/login)
│   │       └── Response Assertion（断言 200）
│   ├── Search Posts（循环执行 10 次）
│   │   └── HTTP Request (GET /api/public/search?q=java)
│   └── Logout（循环后执行 1 次）
└── View Results Tree / Summary Report
```

**配置说明**：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 线程数 | 100 | 模拟 100 个并发用户 |
| Ramp-up 时间 | 10s | 10 秒内启动所有线程 |
| 循环次数 | 3 | 每个用户执行 3 轮 |
| 持续时间 | 60s | 或者持续压 60 秒 |

**参数化（CSV）**：

```csv
# attack_data.csv（模拟攻击者）
ip,path,payload,attackType
1.2.3.4,/api/public/search,<script>alert(1)</script>,XSS
5.6.7.8,/api/public/search,1' or '1'='1,SQL_INJECTION
```

**JMeter 非 GUI 模式运行**：

```bash
jmeter -n -t blog_test.jmx \
  -l results.jtl \
  -e -o output/ \
  -j jmeter.log

# 参数：
# -n 非 GUI 模式
# -t 测试计划文件
# -l 结果文件
# -e 生成 HTML 报告
# -o 报告输出目录
```

**生成 HTML 报告**：

```
Dashboard（仪表盘）
├── APDEX (性能满意度)
├── Requests Summary（请求统计）
├── Response Times（响应时间分布）
├── Active Threads Over Time（线程变化）
├── Transactions per Second（TPS）
└── Response Codes（状态码分布）
```

### 2.3 Rest Assured（Java 自动化接口测试）

**定位**：用 Java 代码写接口测试，直接集成到 Maven/Gradle 项目

#### 本项目实战

```java
package com.aston.blog;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class AuthApiTest {

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = "http://localhost:8080";
    }

    // ─── 登录测试 ───
    @Test
    @DisplayName("正确密码登录成功")
    void login_success() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "username": "testuser",
                    "password": "Test@123456"
                }
                """)
        .when()
            .post("/api/auth/login")
        .then()
            .statusCode(200)
            .body("data.username", equalTo("testuser"))
            .cookie("auth_token", notNullValue()); // httpOnly Cookie
    }

    @Test
    @DisplayName("错误密码返回 401")
    void login_wrongPassword() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "username": "testuser",
                    "password": "WrongPass"
                }
                """)
        .when()
            .post("/api/auth/login")
        .then()
            .statusCode(401)
            .body("message", containsString("用户名或密码错误"))
            .cookie("auth_token", nullValue());
    }

    // ─── 文章列表测试 ───
    @Test
    @DisplayName("获取公开文章列表")
    void getPublicPosts() {
        given()
            .queryParam("page", 0)
            .queryParam("size", 10)
        .when()
            .get("/api/public/posts")
        .then()
            .statusCode(200)
            .body("code", equalTo(0))
            .body("data.content", notNullValue())
            .body("data.totalElements", greaterThanOrEqualTo(0));
    }

    // ─── 安全拦截器测试 ───
    @Test
    @DisplayName("XSS payload 应被检测并记录")
    void security_xssDetected() {
        given()
            .queryParam("q", "<script>alert(1)</script>")
            .header("User-Agent", "Mozilla/5.0")
        .when()
            .get("/api/public/search")
        .then()
            .statusCode(200) // 放行，只记录
            .body("code", equalTo(0)); // 正常返回（不拦截）

        // 验证 attack_logs 表有记录（需查数据库或调用 admin 接口）
    }

    // ─── Token 认证测试 ───
    @Test
    @DisplayName("带 Token 才能访问管理接口")
    void admin_requiresAuth() {
        given()
            .header("Authorization", "Bearer fake.token.here")
        .when()
            .get("/api/admin/security/stats")
        .then()
            .statusCode(401); // 无效 Token 应 401
    }

    @Test
    @DisplayName("创建文章需要认证")
    void createPost_requiresAuth() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "title": "测试文章",
                    "content": "正文内容"
                }
                """)
        .when()
            .post("/api/posts")
        .then()
            .statusCode(401); // 未登录
    }
}
```

---

## 3. Web 自动化测试

### 3.1 工具选型对比

| 维度 | Selenium | Playwright | Cypress |
|------|----------|------------|---------|
| **语言支持** | Java/Python/JS/C# | JS/TS/Python/C#/Java | JS/TS |
| **浏览器** | 全主流 | 全主流 + Mobile | 全主流 |
| **执行速度** | 较慢 | 快（并行） | 快 |
| **原生支持 API** | 无 | 有（网络拦截） | 有 |
| **等待机制** | 手动显式等待 | 自动等待 | 自动等待 |
| **移动端** | 需 Appium | 支持 | 不支持 |
| **学习曲线** | 中等 | 低 | 低 |
| **推荐指数** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**结论**：新项目推荐 **Playwright**，速度最快，API 最现代，TypeScript 原生支持。

### 3.2 Playwright 深入用法

#### 元素定位策略

```python
# python/playwright 用法
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # ─── 8 种定位方式 ───
    page.locator("button#submit")           # 1. ID
    page.locator(".btn-primary")            # 2. CSS 类名
    page.locator("text=登录")               # 3. 文本内容
    page.locator("input[name=username]")    # 4. 属性选择器
    page.locator("form >> text=登录")        # 5. 组内文本
    page.locator("button").filter(has_text="提交")  # 6. 过滤
    page.locator("xpath=//button[@type='submit']")  # 7. XPath
    page.get_by_label("用户名")             # 8. 无障碍标签（最佳实践）

    page.goto("http://localhost:3000/login")
    page.get_by_label("用户名").fill("testuser")
    page.get_by_label("密码").fill("Test@123456")
    page.get_by_role("button", name="登录").click()

    assert page.url == "http://localhost:3000/"
```

#### 页面对象模型（POM）— 最佳实践

```python
# tests/pages/login_page.py
class LoginPage:
    def __init__(self, page):
        self.page = page
        self.username_input = page.get_by_label("用户名")
        self.password_input = page.get_by_label("密码")
        self.submit_btn = page.get_by_role("button", name="登录")
        self.error_msg = page.locator(".error-message")

    def login(self, username, password):
        self.username_input.fill(username)
        self.password_input.fill(password)
        self.submit_btn.click()

    def get_error(self):
        return self.error_msg.text_content()


# tests/pages/admin_security_page.py
class AdminSecurityPage:
    def __init__(self, page):
        self.page = page
        self.xss_card = page.locator("text=XSS").locator("..")  # 父级 button

    def filter_xss_attacks(self):
        self.xss_card.click()

    def get_total_attacks(self):
        return self.page.locator("text=全部攻击").locator("..").locator("p").first


# tests/test_security.py
def test_xss_filter_in_admin(page):
    login_page = LoginPage(page)
    login_page.login("admin", "Admin@123456")

    page.goto("http://localhost:3000/dashboard/admin")
    page.click("text=安全监控")

    security_page = AdminSecurityPage(page)
    security_page.filter_xss_attacks()

    # 等待过滤后的日志加载
    page.wait_for_selector('[data-testid="attack-log-row"]')
```

#### 网络请求拦截

```python
# 拦截并 Mock API 响应
def test_mock_attack_logs(page):
    # Mock 攻击统计数据
    page.route(
        "**/api/admin/security/stats",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "code": 0,
                "data": {
                    "totalAttacks": 9999,
                    "xssCount": 100,
                    "sqlInjectionCount": 50,
                }
            })
        )
    )

    page.goto("http://localhost:3000/dashboard/admin")
    page.click("text=安全监控")

    # 验证 Mock 数据展示
    assert page.locator("text=9999").is_visible()
```

#### 截图 + 视频

```python
# 配置（playwright.config.ts）
import { defineConfig } from '@playwright/test'

export default defineConfig({
    screenshot: 'only-on-failure',    # 失败时截图
    video: 'retain-on-failure',       # 失败时录屏
    trace: 'retain-on-failure',       # 失败时保留执行轨迹（可回放）
})

# 手动截图
page.screenshot(path="debug.png")
page.screenshot(full_page=True)       # 整页截图
```

### 3.3 Selenium（Java 项目）

```java
// Maven 依赖
// <dependency>
//     <groupId>org.seleniumhq.selenium</groupId>
//     <artifactId>selenium-java</artifactId>
//     <version>4.18.0</version>
// </dependency>

package com.aston.blog.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class LoginE2ETest {

    private WebDriver driver;

    @BeforeEach
    void setup() {
        driver = new ChromeDriver();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
    }

    @AfterEach
    void teardown() {
        if (driver != null) driver.quit();
    }

    @Test
    @DisplayName("登录成功后 URL 变为首页")
    void loginSuccess_redirects() {
        driver.get("http://localhost:3000/login");
        driver.findElement(By.id("username")).sendKeys("testuser");
        driver.findElement(By.id("password")).sendKeys("Test@123456");
        driver.findElement(By.tagName("button")).submit();

        // 显式等待 URL 变化
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        wait.until(ExpectedConditions.urlToBe("http://localhost:3000/"));

        assertTrue(driver.getCurrentUrl().contains("/"));
    }

    @Test
    @DisplayName("错误密码显示提示")
    void wrongPassword_showsError() {
        driver.get("http://localhost:3000/login");
        driver.findElement(By.id("username")).sendKeys("testuser");
        driver.findElement(By.id("password")).sendKeys("WrongPass");
        driver.findElement(By.tagName("button")).submit();

        // 等待错误信息出现
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        By errorSelector = By.cssSelector(".error, .text-red-500");
        wait.until(ExpectedConditions.visibilityOfElementLocated(errorSelector));

        String errorText = driver.findElement(errorSelector).getText();
        assertTrue(errorText.contains("密码") || errorText.contains("错误"));
    }
}
```

---

## 4. 性能测试

### 4.1 JMeter 完整使用流程

#### 压测本项目登录接口

```
线程组配置：
  - 线程数: 200（模拟 200 并发用户）
  - Ramp-up: 20s（20 秒内均匀启动所有线程）
  - 持续时间: 60s（压 60 秒）
  - 调度器: 勾选

HTTP 请求默认值：
  - 协议: https
  - 服务器: 47.242.21.40
  - 端口: 8080

采样器 1 - 登录:
  POST /api/auth/login
  Body: {"username":"testuser","password":"Test@123456"}

采样器 2 - 获取文章列表:
  GET /api/public/posts?page=0&size=20

监听器：
  - Summary Report（汇总）
  - View Results Tree（详细）
  - Response Times Over Time（响应时间趋势）
  - Throughput Over Time（TPS 趋势）
  - jp@gc - Graphs Generator（综合图表）
```

#### 关键指标解读

| 指标 | 含义 | 本项目目标 |
|------|------|-----------|
| **TPS** | 每秒事务数 | > 100（登录），> 500（公开接口） |
| **响应时间 Avg** | 平均响应时间 | < 500ms |
| **响应时间 P90** | 90% 请求的响应时间 | < 1s |
| **响应时间 P99** | 99% 请求的响应时间 | < 2s |
| **错误率** | 失败请求占比 | < 1% |
| **CPU** | 服务器 CPU 利用率 | < 80% |
| **内存** | JVM 堆使用率 | < 80% |

### 4.2 Gatling（Scala，高级）

```scala
// Gatling 脚本（Scala）
// 适合：代码管理、团队协作、CI 集成

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class BlogSimulation extends Simulation {

  val baseUrl = "http://47.242.21.40:8080"

  val httpConf = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")

  val loginScenario = scenario("登录压测")
    .exec(
      http("登录")
        .post("/api/auth/login")
        .body(StringBody("""{"username":"testuser","password":"Test@123456"}"""))
        .check(status.is(200))
    )
    .pause(1)  // 等待 1 秒

  val browseScenario = scenario("浏览文章")
    .exec(
      http("文章列表")
        .get("/api/public/posts")
        .check(status.is(200))
    )

  setUp(
    loginScenario.inject(
      rampUsers(100).during(10.seconds)  // 10 秒内启动 100 用户
    ),
    browseScenario.inject(
      constantUsersPerSec(50).during(60.seconds)  // 每秒 50 用户持续 60 秒
    )
  ).protocols(httpConf)
   .assertions(
     global.responseTime.percentile(95).lt(1000),  // P95 < 1s
     global.successfulRequests.percent.gt(99)       // 成功率 > 99%
   )
}
```

```bash
# 运行
gatling.sh -sf simulations/ -bf simulations/ -ro report/
```

### 4.3 Locust（Python，Python 开发者友好）

```python
# locust_test.py
from locust import HttpUser, task, between, events
import random

class BlogUser(HttpUser):
    wait_time = between(1, 3)  # 每个任务间隔 1-3 秒
    host = "http://47.242.21.40:8080"

    def on_start(self):
        """用户启动时执行（登录）"""
        response = self.client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "Test@123456"
        })
        if response.status_code == 200:
            self.token = response.cookies.get("auth_token")

    @task(3)  # 权重 3，访问频率最高
    def browse_posts(self):
        self.client.get("/api/public/posts?page=0&size=10")

    @task(1)
    def view_post(self):
        self.client.get("/api/public/posts/spring-boot-security-guide")

    @task(1)
    def search(self):
        self.client.get("/api/public/search?q=java")

# 运行
# locust -f locust_test.py --host=http://47.242.21.40:8080
# Web 界面：http://localhost:8089
# 无头模式：
# locust -f locust_test.py --host=http://47.242.21.40:8080 \
#         --headless -u 200 -r 20 -t 60s --csv stats
```

---

## 5. 移动端测试

### 5.1 Appium（跨平台）

```python
# appium_test.py
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

desired_caps = {
    "platformName": "Android",
    "deviceName": "emulator-5554",
    "app": "/path/to/blog.apk",
    "automationName": "UiAutomator2",
    "noReset": True,  # 不重置应用状态
}

driver = webdriver.Remote("http://localhost:4723/wd/hub", desired_caps)

# 登录测试
driver.find_element(AppiumBy.ID, "com.aston.blog:id/username").send_keys("testuser")
driver.find_element(AppiumBy.ID, "com.aston.blog:id/password").send_keys("Test@123456")
driver.find_element(AppiumBy.ID, "com.aston.blog:id/loginButton").click()

# 等待页面跳转
wait = WebDriverWait(driver, 10)
wait.until(EC.url_contains("/dashboard"))

print("登录成功")
driver.quit()
```

---

## 6. 持续集成（CI/CD）

### 6.1 GitHub Actions 完整测试流水线

```yaml
# .github/workflows/test.yml
name: CI - Full Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # 每周日凌晨 3 点定时全量回归
    - cron: '0 3 * * 0'

env:
  JAVA_VERSION: '21'
  NODE_VERSION: '20'

jobs:
  # ─── 第 1 阶段：代码质量检查 ───
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # SonarQube 扫描
      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@v2
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

  # ─── 第 2 阶段：Java 单元 + 集成测试 ───
  java-test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: blog_test
          MYSQL_USER: test
          MYSQL_PASSWORD: test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'

      - name: Maven 测试
        run: mvn test -Dspring.profiles.active=ci
        env:
          SPRING_DATASOURCE_URL: jdbc:mysql://localhost:3306/blog_test
          SPRING_DATASOURCE_USERNAME: test
          SPRING_DATASOURCE_PASSWORD: test
          JWT_SECRET: ${{ secrets.JWT_SECRET }}

      - name: 上传测试报告
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: java-test-reports
          path: target/surefire-reports/
          retention-days: 30

  # ─── 第 3 阶段：前端测试 ───
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install
        run: cd frontend && npm ci

      - name: Unit Tests + 覆盖率
        run: cd frontend && npm test -- --ci --coverage --coverageThreshold='{"global":{"branches":60,"functions":60,"lines":70,"statements":70}}'

      - name: Playwright E2E
        run: cd frontend && npx playwright test
        env:
          BASE_URL: ${{ secrets.TEST_BASE_URL }}

      - name: 上传覆盖率报告
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: frontend-coverage
          path: frontend/coverage/

  # ─── 第 4 阶段：Python 测试 ───
  python-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install
        run: pip install -r python/requirements.txt pytest pytest-asyncio pytest-cov httpx

      - name: Pytest
        run: pytest python/tests/ -v --cov=. --cov-fail-under=60

      - name: Upload Coverage
        uses: codecov/codecov-action@v4

  # ─── 第 5 阶段：性能测试（定时触发） ───
  performance-test:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      - name: JMeter
        run: |
          wget -q https://dlcdn.apache.org//jmeter/apache-jmeter-5.6.3.tgz
          tar -xzf apache-jmeter-5.6.3.tgz
      - name: Run Performance Test
        run: |
          apache-jmeter-5.6.3/bin/jmeter -n \
            -t tests/blog_load_test.jmx \
            -l results.jtl \
            -e -o report/
      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: performance-report
          path: report/

  # ─── 第 6 阶段：汇总结果 ───
  report:
    runs-on: ubuntu-latest
    needs: [java-test, frontend-test, python-test]
    if: always()
    steps:
      - name: Check Results
        run: |
          echo "Java Tests: ${{ needs.java-test.result }}"
          echo "Frontend Tests: ${{ needs.frontend-test.result }}"
          echo "Python Tests: ${{ needs.python-test.result }}"
          # 任何阶段失败则 CI 失败
          if [[ "${{ needs.java-test.result }}" == "failure" ]] || \
             [[ "${{ needs.frontend-test.result }}" == "failure" ]] || \
             [[ "${{ needs.python-test.result }}" == "failure" ]]; then
            exit 1
          fi
```

### 6.2 Jenkins（企业自建）

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        SPRING_DATASOURCE_URL = credentials('db-url')
        SPRING_DATASOURCE_PASSWORD = credentials('db-password')
    }

    stages {
        stage('Code Quality') {
            steps {
                sh 'mvn sonar:sonar -Dsonar.projectKey=blog'
            }
        }

        stage('Java Tests') {
            steps {
                sh 'mvn test -Dspring.profiles.active=ci'
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                    jacoco changeBuildStatus: true, execPattern: 'target/**/*.exec'
                }
            }
        }

        stage('Frontend Tests') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm test -- --ci'
                    sh 'npx playwright test --reporter=html'
                }
            }
        }

        stage('Performance Test') {
            when {
                branch 'main'
                triggeredBy 'TimerTrigger'
            }
            steps {
                sh 'jmeter -n -t tests/load_test.jmx -l results.jtl -e -o report/'
            }
            post {
                always {
                    publishHTML([allowMissing: false,
                                 alwaysLinkToLastBuild: true,
                                 keepAll: true,
                                 reportDir: 'report/',
                                 reportFiles: 'index.html',
                                 reportName: 'Performance Report'])
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'ssh deploy@server "cd /opt/blog && docker compose pull && docker compose up -d"'
            }
        }
    }
}
```

---

## 7. 测试管理

### 7.1 测试用例管理流程

```
需求分析 → 测试计划 → 用例设计 → 用例评审 → 测试执行 → 缺陷管理 → 测试报告
     ↑                              ↓
  需求变更 ←────────────────────────┘
```

### 7.2 Jira + Zephyr（企业主流）

**Jira** 是缺陷跟踪系统，**Zephyr** 是测试管理插件，两者结合：

| 操作 | 说明 |
|------|------|
| 创建 Test Cycle | 定义一轮测试（例：v2.1.0 回归测试） |
| 导入 Test Cases | 将 TestRail / Excel 的用例导入 |
| 执行测试 | 每个用例标记：Pass / Fail / Blocked / WIP |
| 提交缺陷 | Fail 的用例一键创建 Jira Bug |
| 生成报告 | 测试覆盖率、通过率、缺陷趋势 |

### 7.3 TestRail（轻量）

**TestRail** 专注于测试用例管理：

```
项目 → Test Suites（测试套件）→ Test Cases（用例）→ Test Runs（执行轮次）

每个用例包含：
├── 标题 + 描述
├── 预置条件（Given）
├── 测试步骤（When）
├── 预期结果（Then）
├── 优先级（P0-P4）
├── 标签（smoke, regression, security）
└── 附件（截图、文件）
```

### 7.4 本项目的测试管理方案

```
docs/TEST_GUIDE.md（用例文档）
  ├── TC-AUTH-001 ~ TC-AUTH-011（认证）
  ├── TC-SEC-001 ~ TC-SEC-012（安全）
  ├── TC-POST-001 ~ TC-POST-010（文章）
  └── ...
      ↓
  执行后记录结果
      ↓
  缺陷记录到 GitHub Issues（带标签 bug:security, bug:auth）
      ↓
  修复后重新执行对应用例
```

---

## 8. 数据库测试

### 8.1 SQL 注入测试（手工）

```sql
-- 本项目 SecurityInterceptor 覆盖的攻击：

-- 1. 字符串拼接型 SQL 注入
?q=1' OR '1'='1
?q=1' UNION SELECT username,password FROM users--

-- 2. 布尔盲注
?q=test' AND 1=1--
?q=test' AND 1=2--

-- 3. 时间盲注
?q=test' AND SLEEP(3)--

-- 4. 报错注入
?q=test' AND EXTRACTVALUE(1,CONCAT(0x7e,version()))--

-- 5. 联合查询
?q=0 UNION SELECT 1,2,3,4,5--
```

### 8.2 数据一致性测试

```sql
-- 验证点赞数和 like 表总数一致
SELECT
    p.id,
    p.title,
    p.like_count AS post_like_count,
    COUNT(pl.id) AS actual_likes
FROM posts p
LEFT JOIN post_likes pl ON p.id = pl.post_id
GROUP BY p.id
HAVING p.like_count != COUNT(pl.id);

-- 验证评论数和 comment 表总数一致
SELECT
    p.id,
    p.title,
    p.comment_count,
    COUNT(c.id)
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id
HAVING p.comment_count != COUNT(c.id);
```

---

## 9. 安全测试

### 9.1 安全测试工具链

| 工具 | 用途 | 使用场景 |
|------|------|----------|
| **Burp Suite** | Web 渗透测试 | 截包、改包、重放、扫描 |
| **SQLMap** | SQL 注入自动检测 | 检测本项目各接口 |
| **Nikto** | Web 服务器扫描 | 扫描敏感文件、CVE |
| **OWASP ZAP** | 自动化漏洞扫描 | 爬虫 + 扫描 |
| **Nmap** | 端口扫描 | 检查服务器开放端口 |
| **Hydra** | 暴力破解 | 测试登录接口抗暴力能力 |
| **Xsstrike** | XSS 扫描 | 检测本项目 XSS 防护 |

### 9.2 实际安全测试步骤（本项目）

```bash
# 1. SQLMap 检测 SQL 注入
sqlmap -u "http://47.242.21.40:8080/api/public/search?q=1" \
  --level=5 --risk=3 --batch \
  --cookie="auth_token=xxx" \
  --dbs  # 枚举数据库

# 2. 检测到注入后，验证拦截器是否记录
sqlmap -u "http://47.242.21.40:8080/api/public/search?q=test" \
  --batch --level=3
# 检查 attack_logs 表是否有记录

# 3. Hydra 暴力破解测试（限速测试，避免真实攻击）
hydra -l admin -P rockyou.txt \
  47.242.21.40 http-post-form \
  "/api/auth/login:username=^USER^&password=^PASS^:F=错误的"

# 4. OWASP ZAP 扫描
zap-cli quick-scan http://47.242.21.40:8080 --spider --ajax-spider

# 5. Nmap 端口扫描
nmap -sV -sC -p 1-10000 47.242.21.40
```

### 9.3 本项目 SecurityInterceptor 对抗测试

```python
# bypass_test.py - 绕过测试
# 目的：测试 SecurityInterceptor 的正则是否能被绕过

bypass_payloads = {
    "XSS": [
        "<scr<script>alert(1)</script>",         # 嵌套标签
        "<script/src=//evil.com/a.js>",          # 外部脚本
        "<img src=x onerror=eval(atob('YWxlcnQoMSk='))>",  # Base64 编码
        "<svg><script>alert&#40;1&#41;</script></svg>",  # HTML 实体编码
        "javascript&colon;alert(1)",             # HTML 实体
    ],
    "SQLi": [
        "1%27%20OR%201%3D1--",                   # URL 编码
        "1/**/OR/**/1=1--",                      # 内联注释绕过
        "1'||(SELECT+password+FROM+users+LIMIT+1)--",  # UNION
        "1';DROP+TABLE+users--",                 # 危险操作（测试是否拦截）
    ]
}

# 结论：如果绕过成功 -> 更新 SecurityInterceptor 正则
#      payload 被记录到 threat_signatures -> 人工分析
```

---

## 10. 测试框架对比总结

### 10.1 单元测试框架

| 框架 | 语言 | 特点 | 本项目用 |
|------|------|------|----------|
| **JUnit 5** | Java | 最成熟，生态最广 | ✅ |
| **TestNG** | Java | 比 JUnit 更灵活（依赖测试、数据驱动） | |
| **pytest** | Python | 简单强大，插件丰富 | ✅ |
| **unittest** | Python | Python 标准库 | |
| **Jest** | JS/TS | 快、Mock 强大 | ✅ |
| **Vitest** | JS/TS | Vite 原生，比 Jest 快 | |
| **Go test** | Go | 标准库，够用 | |

### 10.2 接口测试框架

| 框架 | 语言 | 优点 | 缺点 |
|------|------|------|------|
| **Postman** | - | 零编码，团队协作，Mock | 不适合复杂逻辑 |
| **Rest Assured** | Java | 与项目集成，Java 开发者友好 | 语法较啰嗦 |
| **httpx** | Python | 异步支持，语法简洁 | 需 pytest 配合 |
| **Karate** | JVM | BDD + API 测试，一套语法 | 较小众 |

### 10.3 UI 自动化框架

| 框架 | 语言 | 优点 | 缺点 |
|------|------|------|------|
| **Playwright** | 多语言 | 快、自动等待、网络拦截 | 较新 |
| **Cypress** | JS/TS | 快、实时重载、录制 | 不支持多标签页 |
| **Selenium** | 多语言 | 历史最久、生态最全 | 慢、写法老 |
| **Puppeteer** | JS | Chrome 原生、截图强 | 只支持 Chrome |

### 10.4 性能测试工具

| 工具 | 语言 | 优点 | 缺点 |
|------|------|------|------|
| **JMeter** | Java | 功能最全、插件多 | 资源占用大 |
| **Gatling** | Scala | 报告最美观、代码管理 | 需要 Scala |
| **Locust** | Python | Python 开发者友好、Web UI | 并发能力中等 |
| **k6** | JS | 云原生、结果美观 | 较新 |
| **LoadRunner** | - | 企业级、功能最全 | 收费、重 |

---

## 11. 学习路径与建议

### 11.1 零基础学习路径

```
第一阶段（1-2周）：接口测试
  Postman 基础 → Postman 进阶（断言、变量、Collection）
  → JMeter 基础（线程组、采样器、监听器）
  → 搭建本项目接口测试套件

第二阶段（2-3周）：自动化入门
  Playwright 基础（定位、等待、断言）
  → Page Object 模式
  → 本项目登录、搜索、评论流程自动化
  → CI 集成（GitHub Actions）

第三阶段（2-3周）：性能测试
  JMeter 深入（参数化、关联、分布式）
  → 本项目登录接口性能测试
  → 分析 TPS、响应时间、P99
  → JMeter + Grafana 可视化

第四阶段（2周）：安全测试
  Burp Suite 基础（截包、重放）
  → SQLMap 检测本项目
  → OWASP ZAP 扫描
  → 分析 SecurityInterceptor 覆盖率

第五阶段（持续）：测试管理
  GitHub Issues 缺陷管理
  → 测试报告生成
  → SonarQube 代码质量
```

### 11.2 面试高频问题

**Q：Postman 如何做接口自动化？**
> 用 Newman（Postman CLI）+ GitHub Actions，Collection 配合 Environment 变量，Tests 写 JavaScript 断言，参数化用 CSV，报告导出 JUnit XML 格式。

**Q：Selenium 和 Playwright 的区别？**
> Playwright 是微软出的新一代框架，比 Selenium 快 2-3 倍，自动等待机制更智能（不需手动 `sleep`），原生支持网络拦截和文件系统操作。Selenium 胜在生态和历史积累，适合复杂的传统 Web 项目。

**Q：接口测试和 UI 测试如何选择？**
> 接口测试覆盖业务逻辑，70% 的 Bug 能在接口层发现。UI 测试覆盖前端交互和用户体验。推荐**接口优先**（Postman/Rest Assured），**UI 作为补充**（Playwright），两层覆盖。

**Q：性能测试如何确定并发用户数？**
> 参考公式：`并发用户 = PV / 时间段 × 会话时长 / 时间段`。例：日活 10000，假设每个会话平均 10 分钟，则 `10000 / (8小时×3600秒) × 600秒 ≈ 200` 并发用户。

**Q：JMeter 结果如何判断是否通过？**
> 核心指标：TPS > 目标值，响应时间 P95 < 阈值，错误率 < 1%。配合 Assertions（响应断言、持续时间断言）。

**Q：什么是 Page Object 模式？**
> 将页面元素定位和操作封装到一个类（Page Object），测试用例只调用方法，不直接写 `find_element`。好处是页面改版时只改 Page Object，不动测试用例。

**Q：自动化测试覆盖率一般多少？**
> 没有固定标准。业界参考：核心功能 > 80%，一般功能 > 50%，边缘功能 > 30%。关键是覆盖**用户高频路径**和**高风险功能**（登录、支付、安全相关），而不是追求数字。

**Q：测试左移是什么意思？**
> 在需求阶段就让测试介入，尽早发现缺陷。不是等开发提测才开始测试，而是从需求评审、用例设计阶段就参与，降低后期修复成本。

---

*文档生成于 2026-05-17*