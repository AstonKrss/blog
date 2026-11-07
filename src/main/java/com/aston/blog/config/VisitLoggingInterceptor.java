package com.aston.blog.config;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.messaging.VisitLogEventProducer;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class VisitLoggingInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(VisitLoggingInterceptor.class);

    private final VisitLogService visitLogService;
    private final VisitLogEventProducer visitLogEventProducer;
    private final MeterRegistry meterRegistry;

    @Value("${blog.visit-log.enabled:true}")
    private boolean visitLogEnabled;

    public VisitLoggingInterceptor(VisitLogService visitLogService,
            VisitLogEventProducer visitLogEventProducer,
            MeterRegistry meterRegistry) {
        this.visitLogService = visitLogService;
        this.visitLogEventProducer = visitLogEventProducer;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        if (!visitLogEnabled) {
            return;
        }
        try {
            String path = request.getRequestURI();
            if (path.startsWith("/api/") && !path.equals("/api/auth/login")
                    && !path.equals("/api/auth/register")) {
                String ip = getClientIp(request);
                String userAgent = request.getHeader("User-Agent");
                String referer = request.getHeader("Referer");

                visitLogService.markOnline(ip);
                visitLogEventProducer.publish(ip, userAgent, referer, path);
            }
        } catch (Exception e) {
            meterRegistry.counter("visit.log.interceptor.failures").increment();
            log.warn("访问日志采集失败，不影响业务请求 path={} reason={}",
                    request.getRequestURI(), e.getMessage());
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