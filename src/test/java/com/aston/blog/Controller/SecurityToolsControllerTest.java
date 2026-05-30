package com.aston.blog.Controller;

import com.aston.blog.common.Result;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SecurityToolsController - SSRF 防护")
class SecurityToolsControllerTest {

    @Mock
    private HttpServletRequest request;

    private final SecurityToolsController controller = new SecurityToolsController();

    @BeforeEach
    void setUp() {
        when(request.getHeader(anyString())).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn("203.0.113.8");
        setAdmin();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void portScanRejectsLoopbackTarget() {
        Result<?> result = controller.portScan("127.0.0.1", "80", request);

        assertThat(result.getCode()).isEqualTo(400);
        assertThat(result.getMessage()).contains("禁止访问");
    }

    @Test
    void httpHeadersRequiresAdmin() {
        SecurityContextHolder.clearContext();

        Result<?> result = controller.getHttpHeaders("https://example.com", request);

        assertThat(result.getCode()).isEqualTo(403);
    }

    @Test
    @SuppressWarnings("unchecked")
    void portScanBlocksNonWhitelistedPortsWithoutConnecting() {
        Result<?> result = controller.portScan("93.184.216.34", "22", request);

        assertThat(result.getCode()).isEqualTo(0);
        Map<String, Object> data = (Map<String, Object>) result.getData();
        List<Map<String, Object>> ports = (List<Map<String, Object>>) data.get("ports");
        assertThat(ports).hasSize(1);
        assertThat(ports.get(0)).containsEntry("status", "blocked");
    }

    private void setAdmin() {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                "admin-user",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
