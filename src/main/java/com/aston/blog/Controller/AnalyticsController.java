package com.aston.blog.Controller;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.common.Result;
import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private VisitLogService visitLogService;

    @GetMapping("/visits")
    public Result<VisitAnalyticsVO> getVisitAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since,
            HttpServletRequest request) {
        
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        
        if (since == null) {
            since = LocalDateTime.now().minusDays(7);
        }
        
        return Result.success(visitLogService.getAnalytics(since));
    }

    private String getUserRole(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getAuthorities() != null) {
                return auth.getAuthorities().stream()
                        .filter(a -> a.getAuthority().startsWith("ROLE_"))
                        .map(a -> a.getAuthority().substring(5))
                        .findFirst()
                        .orElse(null);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}