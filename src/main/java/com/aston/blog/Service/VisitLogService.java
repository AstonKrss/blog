package com.aston.blog.Service;

import com.aston.blog.event.VisitLogRecordedEvent;
import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;

public interface VisitLogService {
    /** 只更新在线人标记，失败不影响请求。 */
    void markOnline(String ipAddress);

    /** 消费端落库入口；实现必须保证 eventId 幂等。 */
    void persistVisit(VisitLogRecordedEvent event);

    Page<com.aston.blog.entity.VisitLog> getRecentLogs(int page, int size);

    VisitAnalyticsVO getAnalytics(LocalDateTime since);

    /** 过去5分钟内的唯一IP数（即在线人数估算） */
    long countOnlineVisitors();
}