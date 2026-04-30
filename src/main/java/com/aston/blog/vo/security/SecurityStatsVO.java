package com.aston.blog.vo.security;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SecurityStatsVO {
    private long totalAttacks;
    private long todayCount;
    private long xssCount;
    private long sqlInjectionCount;
    private long bruteForceCount;
    private long pathTraversalCount;
    private long commandInjectionCount;
    private long scannerCount;
    private long sensitiveAccessCount; // 敏感访问数
    private long weakPasswordCount; // 弱密码攻击数
    private long otherCount; // 其他攻击数
    private List<Map<String, Object>> topAttackers; // 攻击者排行
    private List<Map<String, Object>> topAttackPaths; // 攻击目标排行
    private List<Map<String, Object>> attackTrend; // 7天趋势
    private List<Map<String, Object>> recentLogs; // 最近日志
}