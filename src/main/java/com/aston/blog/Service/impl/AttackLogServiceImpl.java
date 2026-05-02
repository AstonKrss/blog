package com.aston.blog.Service.impl;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.entity.AttackLog;
import com.aston.blog.entity.LoginAttempt;
import com.aston.blog.repository.AttackLogRepository;
import com.aston.blog.repository.LoginAttemptRepository;
import com.aston.blog.vo.security.SecurityStatsVO;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AttackLogServiceImpl implements AttackLogService {

    private static final int FAILED_THRESHOLD = 10;
    private static final int WINDOW_MINUTES = 15;
    private final Map<String, LocalDateTime> blockedIps = new ConcurrentHashMap<>();
    private final AttackLogRepository attackLogRepository;
    private final LoginAttemptRepository loginAttemptRepository;

    public AttackLogServiceImpl(AttackLogRepository attackLogRepository,
            LoginAttemptRepository loginAttemptRepository) {
        this.attackLogRepository = attackLogRepository;
        this.loginAttemptRepository = loginAttemptRepository;
    }

    @Override
    public void recordLoginAttempt(String ip, String username, boolean success, String userAgent) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setIp(ip);
        attempt.setUsername(username);
        attempt.setSuccess(success);
        attempt.setUserAgent(userAgent);
        loginAttemptRepository.save(attempt);
    }

    @Override
    public void recordAttack(String ip, String path, String method, String payload, String attackType, String userAgent,
            String queryParams) {
        AttackLog log = new AttackLog();
        log.setIp(ip);
        log.setPath(path);
        log.setMethod(method);
        log.setPayload(payload);
        log.setAttackType(attackType);
        log.setUserAgent(userAgent);
        log.setQueryParams(queryParams);
        attackLogRepository.save(log);
    }

    @Override
    public boolean isBruteForce(String ip, String username) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(WINDOW_MINUTES);
        long failedCount = loginAttemptRepository.countFailedAttemptsByIp(ip, since);
        if (failedCount >= FAILED_THRESHOLD) {
            return true;
        }
        // 也可以根据用户名统计
        long failedCountByUser = loginAttemptRepository.countFailedAttemptsByUsername(username, since);
        return failedCountByUser >= FAILED_THRESHOLD;
    }

    @Override
    public void blockIp(String ip) {
        blockedIps.put(ip, LocalDateTime.now().plusMinutes(WINDOW_MINUTES));
    }

    @Override
    public boolean isIpBlocked(String ip) {
        LocalDateTime until = blockedIps.get(ip);
        if (until == null)
            return false;
        if (until.isBefore(LocalDateTime.now())) {
            blockedIps.remove(ip);
            return false;
        }
        return true;
    }

    private int calculateRiskLevel(String attackType) {
        return switch (attackType) {
            case "COMMAND_INJECTION" -> 5; // 最高风险
            case "SQL_INJECTION" -> 4;
            case "BRUTE_FORCE" -> 3;
            case "XSS", "PATH_TRAVERSAL" -> 2;
            default -> 1;
        };
    }

    @Override
    public SecurityStatsVO getSecurityStats() {
        SecurityStatsVO stats = new SecurityStatsVO();
        stats.setTotalAttacks(attackLogRepository.count());
        stats.setTodayCount(attackLogRepository.countToday(LocalDateTime.now().withHour(0).withMinute(0).withSecond(0)));

        // 获取攻击类型分布
        stats.setXssCount(attackLogRepository.countByAttackType("XSS"));
        stats.setSqlInjectionCount(attackLogRepository.countByAttackType("SQL_INJECTION"));
        stats.setBruteForceCount(attackLogRepository.countByAttackType("BRUTE_FORCE"));
        stats.setWeakPasswordCount(attackLogRepository.countByAttackType("WEAK_PASSWORD_ATTACK"));
        stats.setPathTraversalCount(attackLogRepository.countByAttackType("PATH_TRAVERSAL"));
        stats.setCommandInjectionCount(attackLogRepository.countByAttackType("COMMAND_INJECTION"));
        stats.setScannerCount(attackLogRepository.countByAttackType("SCANNER"));
        stats.setSensitiveAccessCount(attackLogRepository.countByAttackType("SENSITIVE_ACCESS"));
        stats.setOtherCount(attackLogRepository.countByAttackType("OTHER"));

        // map
        List<Map<String, Object>> topAttackers = attackLogRepository.findTopAttackers().stream()
                .limit(10)
                .map(record -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("ip", record[0]);
                    map.put("count", record[1]);
                    map.put("lastAttack", record[2]);
                    return map;
                }).collect(Collectors.toList());
        stats.setTopAttackers(topAttackers);

        List<Map<String, Object>> topAttackPaths = attackLogRepository.findTopAttackPaths().stream()
                .limit(10)
                .map(record -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("path", record[0]);
                    map.put("count", record[1]);
                    return map;
                }).collect(Collectors.toList());
        stats.setTopAttackPaths(topAttackPaths);

        LocalDateTime startOfWeek = LocalDateTime.now().minusDays(7);
        List<Map<String, Object>> trend = attackLogRepository.findAttackTrend(startOfWeek).stream()
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("date", row[0].toString());
                    map.put("count", ((Number) row[1]).longValue());
                    return map;
                }).collect(Collectors.toList());
        stats.setAttackTrend(trend);

        // 最近日志
        List<Map<String, Object>> recentLogs = attackLogRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(log -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", log.getId());
                    map.put("ip", log.getIp());
                    map.put("path", log.getPath());
                    map.put("method", log.getMethod());
                    map.put("payload", log.getPayload());
                    map.put("attackType", log.getAttackType());
                    map.put("userAgent", log.getUserAgent());
                    map.put("createdAt", log.getCreatedAt() != null ? log.getCreatedAt().toString() : null);
                    return map;
                }).collect(Collectors.toList());
        stats.setRecentLogs(recentLogs);
        return stats;
    }

    @Override
    public List<Map<String, Object>> getRecentLogsByType(String attackType, String ip, int limit) {
        List<AttackLog> logs;
        if (attackType != null && !attackType.isEmpty() && ip != null && !ip.isEmpty()) {
            logs = attackLogRepository.findTop50ByIpAndAttackTypeOrderByCreatedAtDesc(ip, attackType);
        } else if (attackType != null && !attackType.isEmpty()) {
            logs = attackLogRepository.findTop50ByAttackTypeOrderByCreatedAtDesc(attackType);
        } else if (ip != null && !ip.isEmpty()) {
            logs = attackLogRepository.findTop50ByIpOrderByCreatedAtDesc(ip);
        } else {
            logs = attackLogRepository.findTop50ByOrderByCreatedAtDesc();
        }
        return logs.stream().limit(limit).map(log -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("ip", log.getIp());
            map.put("path", log.getPath());
            map.put("method", log.getMethod());
            map.put("payload", log.getPayload());
            map.put("attackType", log.getAttackType());
            map.put("userAgent", log.getUserAgent());
            map.put("queryParams", log.getQueryParams());
            map.put("riskLevel", log.getRiskLevel());
            map.put("createdAt", log.getCreatedAt() != null ? log.getCreatedAt().toString() : null);
            return map;
        }).collect(Collectors.toList());
    }

}