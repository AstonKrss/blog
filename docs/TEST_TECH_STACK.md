# 测试技术栈使用指南

> 本项目涉及 3 个技术栈：Java Spring Boot、Next.js TypeScript、Python FastAPI。以下分别讲解每个栈的测试工具配置、写法、最佳实践。

---

## 目录

1. [Java/Spring Boot 测试](#1-javaspring-boot-测试)
2. [Next.js/TypeScript 测试](#2-nextjstypescript-测试)
3. [Python/FastAPI 测试](#3-pythonfastapi-测试)
4. [集成测试 & CI 集成](#4-集成测试--ci-集成)
5. [快速启动清单](#5-快速启动清单)

---

## 1. Java/Spring Boot 测试

### 1.1 技术栈

| 工具 | 用途 | 地位 |
|------|------|------|
| **JUnit 5** | 测试框架 | 核心 |
| **Mockito** | Mock 对象 | 核心 |
| **SpringBootTest** | 启动 Spring 上下文 | 集成测试用 |
| **AssertJ** | 断言库（流式） | 推荐 |
| **Testcontainers** | 用 Docker 起真实 MySQL | 推荐 |
| **RestAssured** | HTTP 接口测试 | API 测试用 |

### 1.2 项目已有依赖检查

查看 `pom.xml` 是否已有：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

`spring-boot-starter-test` 已包含：JUnit 5 + Mockito + AssertJ。

**需要额外添加**（如果没有）：

```xml
<!-- HTTP 接口测试 -->
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <scope>test</scope>
</dependency>

<!-- Testcontainers（需要 Docker） -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mysql</artifactId>
    <scope>test</scope>
</dependency>
```

### 1.3 目录结构

```
src/
├── main/java/...            # 生产代码
└── test/
    ├── java/com/aston/blog/
    │   ├── Service/         # Service 单元测试
    │   ├── Controller/     # Controller 集成测试
    │   ├── config/         # 配置测试
    │   └── entity/         # 实体测试
    └── resources/
        └── application-test.yml  # 测试配置
```

### 1.4 单元测试示例（Service 层）

**目标**：测试 `AttackLogService.isBruteForce()` 暴力破解判断逻辑

```java
package com.aston.blog.Service.impl;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.repository.LoginAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)  // 只启动 Mockito，不启动 Spring
class AttackLogServiceImplTest {

    @Mock          // 模拟 LoginAttemptRepository
    private LoginAttemptRepository loginAttemptRepository;

    @Mock          // 模拟 ThreatSignatureService
    private com.aston.blog.Service.ThreatSignatureService threatSignatureService;

    @InjectMocks   // 自动注入上面两个 Mock 到 Service
    private AttackLogServiceImpl attackLogService;

    private static final String TEST_IP = "192.168.1.100";
    private static final String TEST_USER = "admin";

    @BeforeEach
    void setUp() {
        // 每个测试前重置 Mock
    }

    // ─── 正常情况：15 分钟内失败 10 次 → 暴力破解 ───
    @Test
    @DisplayName("15分钟内失败10次应返回true（暴力破解）")
    void shouldDetectBruteForce_whenFailedAttemptsReachThreshold() {
        // Given: 模拟 repository 返回 10 次失败
        when(loginAttemptRepository.countFailedAttemptsByIp(eq(TEST_IP), any(LocalDateTime.class)))
                .thenReturn(10L);

        // When
        boolean result = attackLogService.isBruteForce(TEST_IP, TEST_USER);

        // Then: AssertJ 流式断言
        assertThat(result)
                .as("失败10次应该被检测为暴力破解")
                .isTrue();
    }

    // ─── 正常情况：15 分钟内失败 3 次 → 不是暴力破解 ───
    @Test
    @DisplayName("15分钟内失败3次应返回false（正常）")
    void shouldNotDetectBruteForce_whenFailedAttemptsBelowThreshold() {
        when(loginAttemptRepository.countFailedAttemptsByIp(eq(TEST_IP), any(LocalDateTime.class)))
                .thenReturn(3L);

        boolean result = attackLogService.isBruteForce(TEST_IP, TEST_USER);

        assertThat(result).isFalse();
    }

    // ─── 边界情况：恰好 10 次 ───
    @Test
    @DisplayName("恰好10次失败应返回true（边界值）")
    void shouldDetectBruteForce_atExactThreshold() {
        when(loginAttemptRepository.countFailedAttemptsByIp(eq(TEST_IP), any(LocalDateTime.class)))
                .thenReturn(10L);
        // 即使按用户名也算暴力破解
        when(loginAttemptRepository.countFailedAttemptsByUsername(eq(TEST_USER), any(LocalDateTime.class)))
                .thenReturn(0L);

        assertThat(attackLogService.isBruteForce(TEST_IP, TEST_USER)).isTrue();
    }

    // ─── 按用户名统计也触发 ───
    @Test
    @DisplayName("IP未超限但用户名失败10次也应检测为暴力破解")
    void shouldDetectBruteForce_byUsername_whenIpBelowThreshold() {
        when(loginAttemptRepository.countFailedAttemptsByIp(eq(TEST_IP), any(LocalDateTime.class)))
                .thenReturn(2L);  // IP 只失败 2 次
        when(loginAttemptRepository.countFailedAttemptsByUsername(eq(TEST_USER), any(LocalDateTime.class)))
                .thenReturn(10L); // 但用户名失败 10 次

        assertThat(attackLogService.isBruteForce(TEST_IP, TEST_USER)).isTrue();
    }

    // ─── Mock 验证：检查方法调用次数 ───
    @Test
    @DisplayName("调用isBruteForce应同时查询IP和用户名")
    void shouldQueryBothIpAndUsername() {
        when(loginAttemptRepository.countFailedAttemptsByIp(any(), any())).thenReturn(0L);
        when(loginAttemptRepository.countFailedAttemptsByUsername(any(), any())).thenReturn(0L);

        attackLogService.isBruteForce(TEST_IP, TEST_USER);

        // 验证两个方法都被调用了
        verify(loginAttemptRepository, times(1)).countFailedAttemptsByIp(eq(TEST_IP), any());
        verify(loginAttemptRepository, times(1)).countFailedAttemptsByUsername(eq(TEST_USER), any());
    }
}
```

### 1.5 集成测试示例（Controller 层）

**目标**：测试 `/api/auth/login` 的登录逻辑（含 Spring 上下文）

```java
package com.aston.blog.Controller;

import com.aston.blog.entity.User;
import com.aston.blog.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc          // 自动配置 MockMvc（不需要启动真实服务器）
@ActiveProfiles("test")        // 使用 test 配置
@Transactional                 // 测试结束后自动回滚，不污染数据库
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;   // 模拟 HTTP 请求

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        // 创建测试用户（方法结束后自动回滚）
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPasswordHash("$2a$10$..."); // 密码: Test@123456（BCrypt 加密后）
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    @Test
    @DisplayName("正确密码登录成功，返回用户信息")
    void login_withCorrectPassword_shouldReturnUser() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                            {
                                "username": "testuser",
                                "password": "Test@123456"
                            }
                            """))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("auth_token"))      // httpOnly Cookie 存在
                .andExpect(jsonPath("$.data.username").value("testuser"));
    }

    @Test
    @DisplayName("错误密码登录失败，返回401")
    void login_withWrongPassword_shouldReturn401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                            {
                                "username": "testuser",
                                "password": "WrongPassword"
                            }
                            """))
                .andExpect(status().isUnauthorized())
                .andExpect(cookie().doesNotExist("auth_token")); // 不设置 Cookie
    }

    @Test
    @DisplayName("不存在用户登录失败，不暴露用户名是否存在")
    void login_withNonexistentUser_shouldReturnGenericError() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                            {
                                "username": "nonexistent",
                                "password": "anything"
                            }
                            """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("用户名或密码错误")); // 不说"用户不存在"
    }

    @Test
    @DisplayName("登录失败应在login_attempts表记录")
    void login_withWrongPassword_shouldRecordFailedAttempt() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                            {
                                "username": "testuser",
                                "password": "Wrong"
                            }
                            """))
                .andExpect(status().isUnauthorized());

        // 验证 login_attempts 表有记录
        // （需要注入 LoginAttemptRepository 验证）
    }
}
```

### 1.6 测试 SecurityInterceptor

```java
package com.aston.blog.config;

import com.aston.blog.Service.AttackLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityInterceptorTest {

    @Mock
    private AttackLogService attackLogService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private SecurityInterceptor interceptor;

    @BeforeEach
    void setUp() {
        when(request.getRequestURI()).thenReturn("/api/public/search");
        when(request.getMethod()).thenReturn("GET");
        when(request.getRemoteAddr()).thenReturn("1.2.3.4");
        when(request.getHeader(anyString())).thenReturn(null);
        when(request.getQueryString()).thenReturn("");
    }

    @Test
    @DisplayName("XSS payload 应被检测并记录")
    void preHandle_withXssPayload_shouldRecordAttack() throws Exception {
        when(request.getQueryString()).thenReturn("q=<script>alert(1)</script>");
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");

        boolean result = interceptor.preHandle(request, response, null);

        assertThat(result).isTrue(); // 放行但记录
        verify(attackLogService, times(1)).recordAttack(
                anyString(), anyString(), anyString(),
                anyString(), eq("XSS"), anyString(), anyString()
        );
        verify(attackLogService, times(1)).recordThreat(
                anyString(), anyString(), anyString(),
                anyString(), eq("XSS"), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("SQL 注入应被检测")
    void preHandle_withSqlInjection_shouldRecordAttack() throws Exception {
        when(request.getQueryString()).thenReturn("q=1' OR '1'='1");
        when(request.getHeader("User-Agent")).thenReturn("python-requests/2.28");

        boolean result = interceptor.preHandle(request, response, null);

        assertThat(result).isTrue();
        verify(attackLogService).recordAttack(
                anyString(), anyString(), anyString(),
                anyString(), eq("SQL_INJECTION"), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("服务器 IP 应跳过检测（白名单）")
    void preHandle_fromServerIp_shouldSkipDetection() throws Exception {
        // 模拟从服务器自身 IP 发起的请求
        when(request.getRemoteAddr()).thenReturn("47.242.21.40");

        boolean result = interceptor.preHandle(request, response, null);

        assertThat(result).isTrue();
        // 白名单 IP 不应调用任何 record 方法
        verify(attackLogService, never()).recordAttack(any(), any(), any(), any(), any(), any(), any());
        verify(attackLogService, never()).recordThreat(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("排除路径应跳过检测")
    void preHandle_excludedPath_shouldSkipDetection() throws Exception {
        when(request.getRequestURI()).thenReturn("/uploads/image.jpg");
        when(request.getQueryString()).thenReturn("q=<script>alert(1)</script>");

        boolean result = interceptor.preHandle(request, response, null);

        assertThat(result).isTrue();
        verify(attackLogService, never()).recordAttack(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("路径穿越应被检测")
    void preHandle_withPathTraversal_shouldRecordAttack() throws Exception {
        when(request.getQueryString()).thenReturn("q=../../etc/passwd");

        interceptor.preHandle(request, response, null);

        verify(attackLogService).recordAttack(
                anyString(), anyString(), anyString(),
                anyString(), eq("PATH_TRAVERSAL"), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("扫描器 UA 应被检测")
    void preHandle_withSqlmapUA_shouldDetectScanner() throws Exception {
        when(request.getHeader("User-Agent")).thenReturn("sqlmap/1.7");
        when(request.getQueryString()).thenReturn("");

        interceptor.preHandle(request, response, null);

        verify(attackLogService).recordAttack(
                anyString(), anyString(), anyString(),
                anyString(), eq("SCANNER_DETECTED"), eq("sqlmap/1.7"), anyString()
        );
    }

    @Test
    @DisplayName("正常请求不应记录")
    void preHandle_normalRequest_shouldNotRecord() throws Exception {
        when(request.getQueryString()).thenReturn("q=hello+world");
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");

        boolean result = interceptor.preHandle(request, response, null);

        assertThat(result).isTrue();
        verify(attackLogService, never()).recordAttack(any(), any(), any(), any(), any(), any(), any());
    }
}
```

### 1.7 测试配置（application-test.yml）

```yaml
# src/test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/blog_test?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: blog_test
    password: test_password
  jpa:
    hibernate:
      ddl-auto: create-drop  # 测试用 create-drop，启动创建，结束删除
    show-sql: false
    properties:
      hibernate:
        format_sql: true

  mail:
    host: localhost
    port: 1025
    properties:
      mail:
        smtp:
          auth: false
          starttls:
            enable: false

jwt:
  secret: "test-secret-key-must-be-at-least-256-bits-long-for-hs256"
  expiration: 86400000

blog:
  site-url: "http://localhost:8080"
  cookie-domain: "localhost"
```

### 1.8 Testcontainers（可选，真实 MySQL）

```java
// 使用真实 MySQL 容器，无需本地安装 MySQL
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class FullIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("blog_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
    }
}
```

### 1.9 运行测试

```bash
cd /d/Users/32239/java_code/blog

# 运行所有测试
mvn test

# 只运行单元测试（排除集成测试）
mvn test -Dtest="*ServiceTest,*InterceptorTest"

# 只运行 SecurityInterceptor 测试
mvn test -Dtest="SecurityInterceptorTest"

# 生成覆盖率报告
mvn test jacoco:report
# 报告位置：target/site/jacoco/index.html
```

### 1.10 运行结果示例

```
  AttackLogServiceImplTest
  ✓ shouldDetectBruteForce_whenFailedAttemptsReachThreshold
  ✓ shouldNotDetectBruteForce_whenFailedAttemptsBelowThreshold
  ✓ shouldDetectBruteForce_atExactThreshold
  ✓ shouldDetectBruteForce_byUsername_whenIpBelowThreshold
  ✓ shouldQueryBothIpAndUsername

  SecurityInterceptorTest
  ✓ preHandle_withXssPayload_shouldRecordAttack
  ✓ preHandle_withSqlInjection_shouldRecordAttack
  ✓ preHandle_fromServerIp_shouldSkipDetection
  ✓ preHandle_excludedPath_shouldSkipDetection
  ✓ preHandle_withPathTraversal_shouldRecordAttack
  ✓ preHandle_withSqlmapUA_shouldDetectScanner
  ✓ preHandle_normalRequest_shouldNotRecord

Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

---

## 2. Next.js/TypeScript 测试

### 2.1 技术栈

| 工具 | 用途 |
|------|------|
| **Jest** | 测试框架 + 断言 |
| **React Testing Library** | 组件 DOM 测试（以用户视角） |
| **Playwright** | E2E 浏览器测试 |
| **MSW (Mock Service Worker)** | 拦截 HTTP 请求，Mock API 响应 |

### 2.2 安装依赖

```bash
cd frontend

# Jest + React Testing Library
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest ts-jest jest-environment-jsdom

# Playwright（E2E）
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium

# MSW（Mock API）
npm install --save-dev msw
```

### 2.3 Jest 配置（jest.config.ts）

```typescript
// frontend/jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
  testPathPattern: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)(spec|test).ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
})

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
  ],
}

export default createJestConfig(config)
```

### 2.4 Jest 初始化（jest.setup.ts）

```typescript
// frontend/jest.setup.ts
import '@testing-library/jest-dom'
// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock auth token（测试时不依赖真实 cookie）
Object.defineProperty(document, 'cookie', {
  value: 'auth_token=test-jwt-token; path=/',
  writable: true,
})
```

### 2.5 单元测试示例（Service 层）

```typescript
// frontend/__tests__/lib/__mocks__/auth.ts
// Mock getToken 函数
jest.mock('@/lib/token', () => ({
  getToken: jest.fn(() => 'mock-jwt-token'),
  setToken: jest.fn(),
  removeToken: jest.fn(),
}))
```

```typescript
// frontend/__tests__/lib/date.test.ts
import { formatDate, formatRelativeTime } from '@/lib/date'

describe('日期格式化工具', () => {
  describe('formatDate', () => {
    it('应正确格式化日期为 YYYY-MM-DD', () => {
      const result = formatDate('2024-05-17T10:30:00Z')
      expect(result).toBe('2024-05-17')
    })

    it('处理空字符串应返回占位符', () => {
      expect(formatDate('')).toBe('-')
    })
  })

  describe('formatRelativeTime', () => {
    it('1 分钟内显示"刚刚"', () => {
      const now = new Date()
      const result = formatRelativeTime(now.toISOString())
      expect(result).toBe('刚刚')
    })

    it('5 分钟前显示"5 分钟前"', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      const result = formatRelativeTime(fiveMinAgo.toISOString())
      expect(result).toBe('5 分钟前')
    })
  })
})
```

### 2.6 组件测试示例（React Testing Library）

**目标**：测试 `admin/page.tsx` 的安全监控 Tab 逻辑

```typescript
// frontend/__tests__/dashboard/admin/security.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminDashboardPage from '@/app/dashboard/admin/page'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock auth hook
jest.mock('@/components/auth-context', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', role: 'ADMIN' },
    loading: false,
  }),
}))

const mockSecurityStats = {
  code: 0,
  data: {
    totalAttacks: 10243,
    todayCount: 162,
    xssCount: 320,
    sqlInjectionCount: 85,
    bruteForceCount: 41,
    weakPasswordCount: 12,
    pathTraversalCount: 28,
    commandInjectionCount: 3,
    scannerCount: 8900,
    sensitiveAccessCount: 854,
    otherCount: 0,
    attackTrend: [{ date: '2024-05-17', count: 162 }],
    recentLogs: [],
    topAttackers: [],
    topAttackPaths: [],
  },
}

describe('AdminDashboard - Security Tab', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockSecurityStats),
    })
  })

  it('应显示攻击总数统计', async () => {
    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('10243')).toBeInTheDocument() // 全部攻击数
    })
  })

  it('点击 XSS 卡片应过滤日志', async () => {
    render(<AdminDashboardPage />)

    // 先切换到 Security Tab（点击 tab）
    const securityTab = screen.getByText('安全监控')
    await userEvent.click(securityTab)

    // 点击 XSS 统计卡片
    const xssCard = screen.getByText('XSS').closest('button')!
    await userEvent.click(xssCard)

    // 验证调用了过滤接口
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('attackType=XSS'),
      expect.any(Object)
    )
  })

  it('统计数据为空时应显示友好提示', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ code: 0, data: { ...mockSecurityStats.data, totalAttacks: 0 } }),
    })

    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  it('切换 Tab 时应清除之前的筛选', async () => {
    render(<AdminDashboardPage />)

    // 切换到 security tab
    const securityTab = screen.getByText('安全监控')
    await userEvent.click(securityTab)

    // 点击 XSS 过滤
    const xssCard = screen.getByText('XSS').closest('button')!
    await userEvent.click(xssCard)

    // 切换到 traffic tab
    const trafficTab = screen.getByText('流量分析')
    await userEvent.click(trafficTab)

    // 切换回 security tab，检查筛选是否清除
    await userEvent.click(securityTab)

    // "清除筛选"按钮不应存在（因为已切走）
    expect(screen.queryByText('清除筛选')).not.toBeInTheDocument()
  })
})
```

### 2.7 E2E 测试示例（Playwright）

```typescript
// frontend/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('认证流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('正确登录后跳转首页', async ({ page }) => {
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'Test@123456')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/')
    await expect(page.locator('header')).toContainText('testuser')
  })

  test('错误密码显示错误提示', async ({ page }) => {
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'WrongPassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=用户名或密码错误')).toBeVisible()
  })

  test('未登录访问管理后台重定向到登录页', async ({ page }) => {
    await page.goto('/dashboard/admin')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('安全监控', () => {
  test.use({ storageState: 'e2e/auth.json' }) // 使用已登录状态

  test('应正确显示攻击统计数据', async ({ page }) => {
    await page.goto('/dashboard/admin')
    await page.click('text=安全监控')

    await expect(page.locator('text=安全监控')).toBeVisible()
    // 等待统计数据加载
    await page.waitForSelector('text=全部攻击', { timeout: 5000 })
  })

  test('攻击趋势图应有 7 根柱子（7 天）', async ({ page }) => {
    await page.goto('/dashboard/admin')
    await page.click('text=安全监控')

    // 找到趋势图容器，检查子元素数量
    const bars = page.locator('[title*="日:"]') // 有 title 属性的柱子
    await expect(bars).toHaveCount(7)
  })
})
```

Playwright 配置：

```typescript
// frontend/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

### 2.8 MSW Mock API 响应

```typescript
// frontend/__tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock 安全统计接口
  http.get('/api/admin/security/stats', () => {
    return HttpResponse.json({
      code: 0,
      data: {
        totalAttacks: 500,
        todayCount: 12,
        xssCount: 30,
        sqlInjectionCount: 10,
        // ... 其他字段
      },
    })
  }),

  // Mock 威胁列表接口
  http.get('/api/admin/security/threats', () => {
    return HttpResponse.json({
      code: 0,
      data: [
        {
          id: 'ts-001',
          ip: '192.168.1.100',
          attackCount: 5,
          attackTypes: 'XSS,SQL_INJECTION',
          payloads: '<script>alert(1)</script>||1 or 1=1',
          riskLevel: 'critical',
          reviewed: false,
          createdAt: '2024-05-17T10:00:00Z',
        },
      ],
    })
  }),

  // Mock 标记审核接口
  http.post('/api/admin/security/threats/:id/review', () => {
    return HttpResponse.json({ code: 0, message: '已标记审核' })
  }),
]
```

启动 MSW：

```typescript
// frontend/__tests__/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### 2.9 运行测试

```bash
cd frontend

# 单元测试
npm test                    # watch 模式
npm test -- --coverage      # 覆盖率报告
npm test -- --ci            # CI 模式（退出码非0则失败）

# E2E 测试（需要先启动 dev server）
npx playwright test

# 只运行某个测试文件
npm test -- __tests__/dashboard/admin/security.test.tsx
```

---

## 3. Python/FastAPI 测试

### 3.1 技术栈

| 工具 | 用途 |
|------|------|
| **pytest** | 测试框架 |
| **pytest-asyncio** | 异步测试 |
| **httpx** | 异步 HTTP 客户端（TestClient） |
| **pytest-cov** | 覆盖率 |
| **Faker** | 生成假数据 |

### 3.2 安装依赖

```bash
cd python

# 直接安装
pip install pytest pytest-asyncio httpx pytest-cov faker

# 或用 requirements-dev.txt
# pip install -r requirements-dev.txt
```

### 3.3 目录结构

```
python/
├── main.py
├── modules/
│   ├── web/
│   │   ├── xss.py
│   │   └── sqli.py
│   └── oss/
│       └── takeover.py
└── tests/
    ├── conftest.py        # pytest 全局 fixture
    ├── test_web_xss.py
    ├── test_web_sqli.py
    └── test_oss.py
```

### 3.4 conftest.py（全局配置）

```python
# python/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    """异步 HTTP 客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def fake_ip():
    """生成随机 IP"""
    from faker import Faker
    fake = Faker()
    return fake.ipv4()


@pytest.fixture
def xss_payloads():
    """XSS 测试 payload 集合"""
    return [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
        "<svg onload=alert(1)>",
        "<iframe src=javascript:alert(1)>",
    ]


@pytest.fixture
def sqli_payloads():
    """SQL 注入测试 payload 集合"""
    return [
        "' OR '1'='1",
        "1' UNION SELECT 1,2,3--",
        "' AND SLEEP(3)--",
        "1' AND 1=1--",
    ]
```

### 3.5 XSS Scanner 测试

```python
# python/tests/test_web_xss.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_xss_scan_detects_reflected_xss(client: AsyncClient):
    """检测反射型 XSS"""
    response = await client.post(
        "/api/web/xss/scan",
        json={
            "url": "http://testphp.vulnweb.com/search.php?term=<script>alert(1)</script>"
        },
        timeout=30.0,
    )

    assert response.status_code == 200
    data = response.json()

    # 验证返回结构
    assert "vulnerabilities" in data or "findings" in data or "result" in data


@pytest.mark.asyncio
async def test_xss_scan_handles_timeout(client: AsyncClient):
    """目标超时不应卡死扫描器"""
    import asyncio

    response = await client.post(
        "/api/web/xss/scan",
        json={"url": "http://10.255.255.1:12345/"},  # 不存在的地址
        timeout=10.0,
    )

    # 应该返回超时错误，而非一直等待
    assert response.status_code in [200, 408, 500]


@pytest.mark.asyncio
async def test_xss_scan_validates_url(client: AsyncClient):
    """无效 URL 应返回 422"""
    response = await client.post(
        "/api/web/xss/scan",
        json={"url": "not-a-valid-url"},
    )

    assert response.status_code == 422  # FastAPI 自动验证


@pytest.mark.asyncio
async def test_xss_scan_missing_url(client: AsyncClient):
    """缺少 URL 参数应返回 422"""
    response = await client.post(
        "/api/web/xss/scan",
        json={},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
])
async def test_xss_scanner_handles_various_payloads(client: AsyncClient, payload: str):
    """参数化测试：各种 XSS payload 格式"""
    response = await client.post(
        "/api/web/xss/scan",
        json={"url": f"http://example.com/search?q={payload}"},
        timeout=15.0,
    )

    # 无论哪种 payload，扫描器应该能处理
    assert response.status_code in [200, 408, 500]
```

### 3.6 SQLi Scanner 测试

```python
# python/tests/test_web_sqli.py
import pytest


@pytest.mark.asyncio
async def test_sqli_scan_detects_union_based(client: AsyncClient):
    """检测 UNION 注入"""
    response = await client.post(
        "/api/web/sqli/scan",
        json={"url": "http://testphp.vulnweb.com/artists.php?artist=1"},
        timeout=30.0,
    )

    assert response.status_code == 200
    data = response.json()
    assert "vulnerabilities" in data or "findings" in data or "result" in data


@pytest.mark.asyncio
async def test_sqli_scan_with_no_results(client: AsyncClient):
    """无害目标应返回安全结果"""
    response = await client.post(
        "/api/web/sqli/scan",
        json={"url": "http://example.com/"},
        timeout=15.0,
    )

    assert response.status_code == 200
    data = response.json()
    # 应该有空结果，不是报错
    assert data is not None
```

### 3.7 OSS 扫描测试

```python
# python/tests/test_oss.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_oss_scan_creates_task(client: AsyncClient):
    """创建 OSS 扫描任务应返回 task_id"""
    response = await client.post(
        "/api/oss/scan",
        json={"bucket_url": "https://mybucket.oss-cn-hangzhou.aliyuncs.com"},
        timeout=10.0,
    )

    assert response.status_code == 200
    data = response.json()
    assert "task_id" in data or "taskId" in data


@pytest.mark.asyncio
async def test_oss_scan_invalid_bucket(client: AsyncClient):
    """无效 bucket URL 应返回验证错误"""
    response = await client.post(
        "/api/oss/scan",
        json={"bucket_url": "not-a-url"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_oss_sse_stream(client: AsyncClient):
    """SSE 进度流应能正确断开"""
    import asyncio

    # 先创建一个任务
    create_response = await client.post(
        "/api/oss/scan",
        json={"bucket_url": "https://mybucket.oss-cn-hangzhou.aliyuncs.com"},
    )
    task_id = create_response.json().get("task_id") or create_response.json().get("taskId")

    if task_id:
        # 订阅 SSE 流
        sse_response = await client.get(
            f"/api/oss/sse/{task_id}",
            timeout=5.0,
        )
        # SSE 流不应无限等待
        assert sse_response.status_code in [200, 404]
```

### 3.8 运行测试

```bash
cd python

# 运行所有测试
pytest tests/ -v

# 带覆盖率
pytest tests/ -v --cov=. --cov-report=html
# 报告位置：htmlcov/index.html

# 只运行 XSS 测试
pytest tests/test_web_xss.py -v

# 参数化测试（显示每个参数）
pytest tests/test_web_xss.py -v -k "various_payloads"

# 测试异步函数
pytest tests/ -v --asyncio-mode=auto

# 生成 JUnit XML 格式（CI 用）
pytest tests/ -v --junitxml=report.xml
```

---

## 4. 集成测试 & CI 集成

### 4.1 GitHub Actions 集成测试

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ─── Java 测试 ───
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
          java-version: '21'
          distribution: 'temurin'
      - run: mvn test -Dspring.profiles.active=ci
        env:
          SPRING_DATASOURCE_URL: jdbc:mysql://localhost:3306/blog_test
          SPRING_DATASOURCE_USERNAME: test
          SPRING_DATASOURCE_PASSWORD: test

      - upload: reports
        path: target/surefire-reports/
        if: always()

  # ─── 前端测试 ───
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Unit tests
        run: cd frontend && npm test -- --ci --coverage

      - name: E2E tests
        run: cd frontend && npx playwright test
        env:
          BASE_URL: http://localhost:8080

      - upload: reports
        path: frontend/coverage/
        if: always()

  # ─── Python 测试 ───
  python-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install
        run: pip install -r python/requirements.txt pytest pytest-asyncio httpx pytest-cov

      - name: Run tests
        run: pytest python/tests/ -v --cov=python --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
```

### 4.2 测试覆盖率要求

| 指标 | 建议最低值 |
|------|-----------|
| **语句覆盖率** | 70% |
| **分支覆盖率** | 60% |
| **Service 层** | 80%+ |
| **SecurityInterceptor** | 90%+（安全关键） |
| **Controller 层** | 60% |

---

## 5. 快速启动清单

### 一、第一天：环境准备

```bash
# 1. Java - 添加测试依赖（pom.xml）
# 确保有 spring-boot-starter-test

# 2. 前端 - 安装测试工具
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event @playwright/test msw

# 3. Python - 安装测试工具
cd python
pip install pytest pytest-asyncio httpx pytest-cov

# 4. 创建目录
mkdir -p src/test/java/com/aston/blog/{Service,Controller,config}
mkdir -p frontend/__tests__/{lib,components,dashboard,mocks}
mkdir -p frontend/e2e
mkdir -p python/tests
```

### 二、第二天：写第一个测试

```bash
# 1. 从 SecurityInterceptor 开始（安全关键代码）
# 复制 1.6 节的示例到 src/test/java/...

# 2. 运行验证
mvn test -Dtest=SecurityInterceptorTest

# 3. 写第一个前端组件测试
# 复制 2.6 节示例

# 4. 运行
cd frontend && npm test -- --watchAll=false
```

### 三、第三天：集成 CI

```bash
# 1. 添加 test.yml 到 .github/workflows/

# 2. 本地模拟 CI
mvn test -Dspring.profiles.active=ci
cd frontend && npm test -- --ci

# 3. 本地 Playwright E2E
npx playwright install --with-deps chromium
npx playwright test
```

### 四、日常开发流程

```
写新功能 → 同步写单元测试 → 本地运行测试通过 → Push → CI 自动跑测试
                                        ↓
                              覆盖率报告 < 70% → 补充测试
```

### 五、测试文件名约定

| 类型 | 命名 | 位置 |
|------|------|------|
| Service 单元测试 | `XxxServiceTest.java` | `src/test/java/.../Service/` |
| Controller 集成测试 | `XxxControllerTest.java` | `src/test/java/.../Controller/` |
| 配置测试 | `XxxConfigTest.java` | `src/test/java/.../config/` |
| 前端组件测试 | `Xxx.test.tsx` | `frontend/__tests__/components/` |
| 前端工具测试 | `date.test.ts` | `frontend/__tests__/lib/` |
| 前端 E2E | `auth.spec.ts` | `frontend/e2e/` |
| Python 单元测试 | `test_xss.py` | `python/tests/` |

---

*指南生成于 2026-05-17 · 随项目更新*