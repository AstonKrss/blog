package com.aston.blog.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import com.aston.blog.entity.AttackLog;

public interface AttackLogRepository extends JpaRepository<AttackLog, String> {
    // 统计count
    long count();

    // 统计攻击类型数量
    long countByAttackType(String attackType);

    // 统计一天的攻击次数
    @Query("SELECT COUNT(a) FROM AttackLog a WHERE a.createdAt >= :startOfDay")
    long countToday(LocalDateTime startOfDay);

    // 获取攻击者排行（包含最后攻击时间）

    @Query("select a.ip, count(a), max(a.createdAt) from AttackLog a group by a.ip order by count(a) desc")
    List<Object[]> findTopAttackers();

    // 获取攻击路径排行

    @Query("select path, count(*) from AttackLog group by path order by count(*) desc")
    List<Object[]> findTopAttackPaths();

    @Query("select date(createdAt), count(*) from AttackLog where createdAt >= :since group by date(createdAt) order by date(createdAt)")
    List<Object[]> findAttackTrend(LocalDateTime since);

    // 按日期范围查询
    List<AttackLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);

    // 获取最近的攻击日志
    List<AttackLog> findTop50ByOrderByCreatedAtDesc();

    // 按攻击类型筛选最近记录
    List<AttackLog> findTop50ByAttackTypeOrderByCreatedAtDesc(String attackType);

    // 按IP筛选
    List<AttackLog> findTop50ByIpOrderByCreatedAtDesc(String ip);

    // 按IP和攻击类型筛选
    List<AttackLog> findTop50ByIpAndAttackTypeOrderByCreatedAtDesc(String ip, String attackType);
}
