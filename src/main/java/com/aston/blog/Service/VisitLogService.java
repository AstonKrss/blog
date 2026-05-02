package com.aston.blog.Service;

import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;

public interface VisitLogService {
    void logVisit(String ipAddress, String userAgent, String referer, String path);

    Page<com.aston.blog.entity.VisitLog> getRecentLogs(int page, int size);

    VisitAnalyticsVO getAnalytics(LocalDateTime since);

    /** 过去5分钟内的唯一IP数（即在线人数估算） */
    long countOnlineVisitors();
}