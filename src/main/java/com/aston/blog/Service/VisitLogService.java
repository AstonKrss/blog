package com.aston.blog.Service;

import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;

public interface VisitLogService {
    void logVisit(String ipAddress, String userAgent, String referer, String path);

    Page<com.aston.blog.entity.VisitLog> getRecentLogs(int page, int size);

    VisitAnalyticsVO getAnalytics(LocalDateTime since);
}