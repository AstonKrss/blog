package com.aston.blog.Service;

import java.time.LocalDateTime;
import java.util.Map;

import com.aston.blog.vo.security.SecurityStatsVO;

public interface AttackLogService {
    boolean isBruteForce(String ip, String username);

    void blockIp(String ip);

    boolean isIpBlocked(String ip);

    void recordLoginAttempt(String ip, String username, boolean success, String userAgent);

    void recordAttack(String ip, String path, String method, String payload, String attackType, String userAgent,
            String queryParams);

    SecurityStatsVO getSecurityStats();
}