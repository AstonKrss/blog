package com.aston.blog.Service.impl;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.Service.ThreatSignatureService;
import com.aston.blog.entity.AttackLog;
import com.aston.blog.entity.LoginAttempt;
import com.aston.blog.repository.AttackLogRepository;
import com.aston.blog.repository.LoginAttemptRepository;
import com.aston.blog.vo.security.SecurityStatsVO;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AttackLogServiceImpl implements AttackLogService {

    private static final Logger log = LoggerFactory.getLogger(AttackLogServiceImpl.class);

    private static final int FAILED_THRESHOLD = 10;
    private static final int WINDOW_MINUTES = 15;
    private final AttackLogRepository attackLogRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final ThreatSignatureService threatSignatureService;
    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;

    public AttackLogServiceImpl(AttackLogRepository attackLogRepository,
            LoginAttemptRepository loginAttemptRepository,
            ThreatSignatureService threatSignatureService,
            StringRedisTemplate redisTemplate, MeterRegistry meterRegistry) {
        this.attackLogRepository = attackLogRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.threatSignatureService = threatSignatureService;
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void recordLoginAttempt(String ip, String username, boolean success, String userAgent) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setIp(ip);
        attempt.setUsername(username);
        attempt.setSuccess(success);
        attempt.setUserAgent(userAgent);
        loginAttemptRepository.save(attempt);

        try {
            // 失败才计数(给 isBruteForce 查)。用 INCR,首次设过期
            if (!success) {
                Long count = redisTemplate.opsForValue().increment("login:fail:ip:" + ip);
                if (count != null && count == 1L) {
                    redisTemplate.expire("login:fail:ip:" + ip, Duration.ofMinutes(WINDOW_MINUTES));
                }
                Long userCount = redisTemplate.opsForValue().increment("login:fail:user:" + username);
                if (userCount != null && userCount == 1L) {
                    redisTemplate.expire("login:fail:user:" + username, Duration.ofMinutes(WINDOW_MINUTES));
                }
            } else {
                // 成功登录清零,避免之前失败累积导致后续正常登录被误判
                redisTemplate.delete("login:fail:ip:" + ip);
                redisTemplate.delete("login:fail:user:" + username);
            }
        } catch (RuntimeException e) {
            onRedisFailure("record", ip, e);
        }
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
    public void recordThreat(String ip, String path, String method, String payload, String attackType,
                             String userAgent, String fullPayload) {
        // 每次攻击都追加到威胁特征库（自动去重）
        threatSignatureService.recordThreat(ip, path, method, payload, attackType, userAgent, fullPayload);
    }

    @Override
    public boolean isBruteForce(String ip, String username) {
        try {
            // 只查不增(计数在 recordLoginAttempt 里)
            String ipCountStr = redisTemplate.opsForValue().get("login:fail:ip:" + ip);
            long ipCount = ipCountStr != null ? Long.parseLong(ipCountStr) : 0;
            if (ipCount >= FAILED_THRESHOLD) {
                return true;
            }
            String userCountStr = redisTemplate.opsForValue().get("login:fail:user:" + username);
            long userCount = userCountStr != null ? Long.parseLong(userCountStr) : 0;
            return userCount >= FAILED_THRESHOLD;
        } catch (RuntimeException e) {
            onRedisFailure("check", ip, e);
            return false;
        }
    }

    @Override
    public void blockIp(String ip) {
        try {
            // 用 Redis SETEX 替代进程内 Map:多实例部署时也共享封禁状态
            redisTemplate.opsForValue().set("login:blocked:ip:" + ip, "1", Duration.ofMinutes(WINDOW_MINUTES));
        } catch (RuntimeException e) {
            onRedisFailure("block", ip, e);
        }
    }

    @Override
    public boolean isIpBlocked(String ip) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey("login:blocked:ip:" + ip));
        } catch (RuntimeException e) {
            onRedisFailure("blocked_check", ip, e);
            return false;
        }
    }

    private void onRedisFailure(String operation, String target, RuntimeException ex) {
        meterRegistry.counter("redis.login_guard.failures", "operation", operation).increment();
        meterRegistry.counter("redis.login_guard.fail_open", "operation", operation).increment();
        log.warn("登录防护 Redis 操作失败，fail-open operation={} target={} reason={}",
                operation, target, ex.getMessage());
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
