package com.aston.blog.config;

import com.aston.blog.Service.VisitLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class VisitLoggingInterceptor implements HandlerInterceptor {

    @Autowired
    private VisitLogService visitLogService;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        try {
            String path = request.getRequestURI();
            if (path.startsWith("/api/") && !path.equals("/api/auth/login") && !path.equals("/api/auth/register")) {
                String ip = getClientIp(request);
                String userAgent = request.getHeader("User-Agent");
                String referer = request.getHeader("Referer");
                
                visitLogService.logVisit(ip, userAgent, referer, path);
            }
        } catch (Exception e) {
            // 忽略日志错误
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}