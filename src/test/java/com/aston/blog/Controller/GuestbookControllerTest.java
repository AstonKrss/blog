package com.aston.blog.Controller;

import com.aston.blog.Service.GuestbookService;
import com.aston.blog.dto.GuestbookDTO;
import com.aston.blog.vo.guestbook.GuestbookVO;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuestbookControllerTest {

    @Mock
    private GuestbookService guestbookService;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private HttpServletRequest request;

    private SimpleMeterRegistry registry;
    private GuestbookController controller;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(request.getHeader(anyString())).thenReturn(null);
        lenient().when(request.getRemoteAddr()).thenReturn("203.0.113.9");
        registry = new SimpleMeterRegistry();
        controller = new GuestbookController(guestbookService, redisTemplate, registry);
    }

    @Test
    void redisFailureFailsOpenAndRecordsMetric() {
        GuestbookDTO dto = new GuestbookDTO();
        dto.setNickname("tester");
        dto.setContent("hello");
        dto.setContact("");

        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("redis down"));
        when(guestbookService.addGuestbook(anyString(), anyString(), any()))
                .thenReturn(new GuestbookVO());

        var response = controller.addGuestbook(dto, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(registry.counter("redis.rate_limit.failures", "scope", "guestbook").count())
                .isEqualTo(1);
    }
    @Test
    void sixthMessageFromSameIpShouldBeRateLimited() {
        GuestbookDTO dto = new GuestbookDTO();
        dto.setNickname("tester");
        dto.setContent("hello");
        dto.setContact("");

        GuestbookVO guestbook = new GuestbookVO();
        when(guestbookService.addGuestbook(anyString(), anyString(), any()))
                .thenReturn(guestbook);
        when(valueOperations.increment(anyString())).thenReturn(1L, 2L, 3L, 4L, 5L, 6L);

        for (int i = 0; i < 5; i++) {
            assertThat(controller.addGuestbook(dto, request).getStatusCode()).isEqualTo(HttpStatus.OK);
        }
        var response = controller.addGuestbook(dto, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(429);
        verify(guestbookService, times(5)).addGuestbook(anyString(), anyString(), any());
    }
}
