package com.aston.blog.Service.impl;

import com.aston.blog.Service.VisitLogService;
import com.aston.blog.entity.VisitLog;
import com.aston.blog.repository.VisitLogRepository;
import com.aston.blog.util.IpLocationUtil;
import com.aston.blog.vo.analytics.VisitAnalyticsVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VisitLogServiceImpl implements VisitLogService {

    @Autowired
    private VisitLogRepository visitLogRepository;

    @Override
    @Async
    public void logVisit(String ipAddress, String userAgent, String referer, String path) {
        try {
            VisitLog log = new VisitLog();
            log.setIpAddress(ipAddress);
            log.setUserAgent(userAgent);
            log.setReferer(referer);
            log.setPath(path);

            // 使用IP归属地工具查询
            IpLocationUtil.IpInfo ipInfo = IpLocationUtil.lookup(ipAddress);
            log.setCountry(ipInfo.getCountry());
            log.setProvince(ipInfo.getProvince());
            log.setCity(ipInfo.getCity());
            log.setIsp(ipInfo.getIsp());

            visitLogRepository.save(log);
        } catch (Exception e) {
            // 记录失败不影响正常请求
        }
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

        long total = visitLogRepository.countSince(since);
        vo.setTotalVisits(total);

        List<Object[]> ips = visitLogRepository.topIpsSince(since);
        vo.setUniqueIps(ips.size());

        // 按城市统计（更精确）
        vo.setTopCountries(convertToMapList(visitLogRepository.countByCitySince(since), "city", "count"));
        vo.setTopIsps(convertToMapList(visitLogRepository.countByIspSince(since), "isp", "count"));
        vo.setTopPages(convertToMapList(visitLogRepository.countByPathSince(since), "path", "count"));
        vo.setTopIps(convertToMapList(ips, "ip", "count"));

        // 处理每小时分布
        List<Object[]> hours = visitLogRepository.countByHourSince(since);
        List<Map<String, Object>> hourly = new ArrayList<>();
        for (Object[] h : hours) {
            Map<String, Object> item = new HashMap<>();
            item.put("hour", h[0]);
            item.put("count", ((Long) h[1]).intValue());
            hourly.add(item);
        }
        vo.setHourlyDistribution(hourly);

        return vo;
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