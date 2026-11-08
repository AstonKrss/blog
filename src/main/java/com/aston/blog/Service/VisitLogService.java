package com.aston.blog.Service;

import com.aston.blog.event.VisitLogRecordedEvent;
import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

public interface VisitLogService {
    /** 只更新在线人标记，失败不影响请求。 */
    void markOnline(String ipAddress);

    /** 单条消费落库入口，保留给兼容路径和单元测试。 */
    void persistVisit(VisitLogRecordedEvent event);

    /** 批量消费落库入口；整批事务提交后，消费者才发送 ACK。 */
    void persistVisits(List<VisitLogRecordedEvent> events);

    Page<com.aston.blog.entity.VisitLog> getRecentLogs(int page, int size);

    VisitAnalyticsVO getAnalytics(LocalDateTime since);

    /** 过去5分钟内的唯一IP数（即在线人数估算） */
    long countOnlineVisitors();
}