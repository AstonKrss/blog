package com.aston.blog.Service.impl;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.event.VisitLogRecordedEvent;
import com.aston.blog.entity.VisitLog;
import com.aston.blog.repository.VisitLogAnalyticsRepository;
import com.aston.blog.repository.VisitLogRepository;
import com.aston.blog.util.IpLocationUtil;
import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VisitLogServiceImpl implements VisitLogService {

    private static final Logger log = LoggerFactory.getLogger(VisitLogServiceImpl.class);

    private final VisitLogRepository visitLogRepository;
    private final VisitLogAnalyticsRepository analyticsRepository;
    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;

    public VisitLogServiceImpl(VisitLogRepository visitLogRepository,
            VisitLogAnalyticsRepository analyticsRepository,
            StringRedisTemplate redisTemplate,
            MeterRegistry meterRegistry) {
        this.visitLogRepository = visitLogRepository;
        this.analyticsRepository = analyticsRepository;
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    // 在线判定窗口:5 分钟内有活动算"在线"
    private static final Duration ONLINE_TTL = Duration.ofMinutes(5);
    private static final String ONLINE_KEY_PREFIX = "online:ip:";

    @Override
    @Async
    public void markOnline(String ipAddress) {
        try {
            // 在线状态是低价值瞬时数据，失败时允许少计，不影响业务请求。
            redisTemplate.opsForValue().set(ONLINE_KEY_PREFIX + ipAddress, "1", ONLINE_TTL);
        } catch (Exception e) {
            meterRegistry.counter("redis.online.mark.failures").increment();
            log.warn("在线人数标记失败，允许降级 ip={} reason={}", ipAddress, e.getMessage());
        }
    }

    @Override
    public void persistVisit(VisitLogRecordedEvent event) {
        IpLocationUtil.IpInfo ipInfo = IpLocationUtil.lookup(event.ip());
        LocalDateTime occurredAt = event.occurredAt() == null ? LocalDateTime.now() : event.occurredAt();

        // 唯一键由数据库兜底；重复消息会执行无副作用更新，消费端随后照常 ACK。
        visitLogRepository.insertIfAbsent(
                event.eventId(),
                truncate(event.ip(), 45),
                truncate(event.userAgent(), 500),
                truncate(event.referer(), 500),
                truncate(event.path(), 255),
                truncate(ipInfo.getCountry(), 50),
                truncate(ipInfo.getProvince(), 50),
                truncate(ipInfo.getCity(), 50),
                truncate(ipInfo.getIsp(), 50),
                occurredAt);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    @Override
    public Page<VisitLog> getRecentLogs(int page, int size) {
        return visitLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    @Override
    public VisitAnalyticsVO getAnalytics(LocalDateTime since) {
        if (since == null) {
            since = LocalDateTime.now().minusDays(7);
        }

        VisitAnalyticsVO vo = new VisitAnalyticsVO();

        // 优先查小时聚合表，避免 visit_logs 增长后全表扫描。
        long total = analyticsRepository.totalVisits(since);
        if (total == 0 && visitLogRepository.countSince(since) > 0) {
            // 聚合尚未完成时回退到明细，保证后台面板不空白。
            return legacyAnalytics(since);
        }

        vo.setTotalVisits(total);
        vo.setUniqueIps(analyticsRepository.uniqueIps(since));
        vo.setTopCountries(convertToMapList(analyticsRepository.topCities(since), "city", "count"));
        vo.setTopIsps(convertToMapList(analyticsRepository.topIsps(since), "isp", "count"));
        vo.setTopPages(convertToMapList(analyticsRepository.topPages(since), "path", "count"));
        vo.setTopIps(convertToMapList(analyticsRepository.topIps(since), "ip", "count"));

        List<Map<String, Object>> hourly = new ArrayList<>();
        for (Object[] h : analyticsRepository.hourlyDistribution(since)) {
            Map<String, Object> item = new HashMap<>();
            item.put("hour", h[0]);
            item.put("count", ((Number) h[1]).intValue());
            hourly.add(item);
        }
        vo.setHourlyDistribution(hourly);
        return vo;
    }

    private VisitAnalyticsVO legacyAnalytics(LocalDateTime since) {
        VisitAnalyticsVO vo = new VisitAnalyticsVO();
        long total = visitLogRepository.countSince(since);
        vo.setTotalVisits(total);

        List<Object[]> ips = visitLogRepository.topIpsSince(since);
        vo.setUniqueIps(ips.size());
        vo.setTopCountries(convertToMapList(visitLogRepository.countByCitySince(since), "city", "count"));
        vo.setTopIsps(convertToMapList(visitLogRepository.countByIspSince(since), "isp", "count"));
        vo.setTopPages(convertToMapList(visitLogRepository.countByPathSince(since), "path", "count"));
        vo.setTopIps(convertToMapList(ips, "ip", "count"));

        List<Map<String, Object>> hourly = new ArrayList<>();
        for (Object[] h : visitLogRepository.countByHourSince(since)) {
            Map<String, Object> item = new HashMap<>();
            item.put("hour", h[0]);
            item.put("count", ((Number) h[1]).intValue());
            hourly.add(item);
        }
        vo.setHourlyDistribution(hourly);
        return vo;
    }

    @Override
    public long countOnlineVisitors() {
        // 用 SCAN 遍历 online:ip:* 的 key 数量,5 分钟内没活动的 IP key 已自动过期
        // SCAN 是非阻塞游标,O(N) 但不会卡 Redis;几千 IP 毫秒级
        long count = 0;
        ScanOptions options = ScanOptions.scanOptions()
                .match(ONLINE_KEY_PREFIX + "*")
                .count(100)
                .build();
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            while (cursor.hasNext()) {
                cursor.next();
                count++;
            }
        } catch (Exception e) {
            // Redis 挂了,降级返回 0(不影响主流程)
            meterRegistry.counter("redis.online.count.failures").increment();
            log.warn("在线人数统计失败，降级返回 0 reason={}", e.getMessage());
            return 0;
        }
        return count;
    }

    private List<Map<String, Object>> convertToMapList(List<Object[]> data, String key1, String key2) {
        return data.stream().limit(10).map(obj -> {
            Map<String, Object> map = new HashMap<>();
            map.put(key1, obj[0]);
            map.put(key2, ((Long) obj[1]).intValue());
            return map;
        }).collect(Collectors.toList());
    }
}
