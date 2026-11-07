package com.aston.blog.event;

import java.time.LocalDateTime;

/**
 * 访问日志事件。
 *
 * eventId 在生产者发送前生成一次，消费端用它做幂等键；重复投递时不能重新生成。
 */
public record VisitLogRecordedEvent(
        String eventId,
        LocalDateTime occurredAt,
        String ip,
        String path,
        String userAgent,
        String referer
) {
}