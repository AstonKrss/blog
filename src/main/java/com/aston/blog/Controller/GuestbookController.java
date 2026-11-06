package com.aston.blog.Controller;

import com.aston.blog.Service.GuestbookService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.GuestbookDTO;
import com.aston.blog.vo.guestbook.GuestbookVO;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api")
public class GuestbookController {

    private static final Logger log = LoggerFactory.getLogger(GuestbookController.class);
    private static final int GUESTBOOK_RATE_LIMIT = 5;
    private static final Duration GUESTBOOK_RATE_WINDOW = Duration.ofMinutes(10);

    private final GuestbookService guestbookService;
    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;

    public GuestbookController(GuestbookService guestbookService, StringRedisTemplate redisTemplate, MeterRegistry meterRegistry) {
        this.guestbookService = guestbookService;
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    // 获取留言列表（公开接口）
    @GetMapping("/public/guestbook")
    public Result<List<GuestbookVO>> getGuestbooks() {
        return Result.success(guestbookService.getAllGuestbooks());
    }

    // 添加留言（公开接口）
    @PostMapping("/guestbook")
    public ResponseEntity<Result<GuestbookVO>> addGuestbook(
            @Valid @RequestBody GuestbookDTO dto,
            HttpServletRequest request) {
        String clientIp = getClientIp(request);
        if (isRateLimited(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Result.error(429, "留言过于频繁，请10分钟后再试"));
        }

        GuestbookVO guestbook = guestbookService.addGuestbook(
                dto.getNickname(),
                dto.getContent(),
                dto.getContact());
        return ResponseEntity.ok(Result.success(guestbook));
    }

    private boolean isRateLimited(String clientIp) {
        String key = "rate:guestbook:" + clientIp;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, GUESTBOOK_RATE_WINDOW);
            }
            return count != null && count > GUESTBOOK_RATE_LIMIT;
        } catch (RuntimeException e) {
            // 限流是附加保护，Redis 故障时降级放行，避免留言功能整体不可用
            meterRegistry.counter("redis.rate_limit.failures", "scope", "guestbook").increment();
            log.warn("留言限流检查失败，fail-open clientIp={} reason={}", clientIp, e.getMessage());
            return false;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        // 当前后端直接暴露给浏览器，不能信任可伪造的 X-Forwarded-For；
        // 若以后接入可信反向代理，需要改为只信任代理网段的转发头。
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr == null || remoteAddr.isBlank() ? "unknown" : remoteAddr;
    }
}
