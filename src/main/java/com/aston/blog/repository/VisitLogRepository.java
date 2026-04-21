package com.aston.blog.repository;

import com.aston.blog.entity.VisitLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface VisitLogRepository extends JpaRepository<VisitLog, String> {

    Page<VisitLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1")
    long countSince(LocalDateTime since);

    @Query("SELECT v.country, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.country ORDER BY COUNT(v) DESC")
    List<Object[]> countByCountrySince(LocalDateTime since);

    @Query(value = "SELECT COALESCE(NULLIF(CONCAT(IFNULL(province,''), IFNULL(city,'')), ''), country, '未知地区') as location, COUNT(*) as cnt FROM visit_logs WHERE created_at >= ?1 GROUP BY COALESCE(NULLIF(CONCAT(IFNULL(province,''), IFNULL(city,'')), ''), country, '未知地区') ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> countByCitySince(LocalDateTime since);

    @Query("SELECT v.isp, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.isp ORDER BY COUNT(v) DESC")
    List<Object[]> countByIspSince(LocalDateTime since);

    @Query("SELECT HOUR(v.createdAt), COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY HOUR(v.createdAt) ORDER BY HOUR(v.createdAt)")
    List<Object[]> countByHourSince(LocalDateTime since);

    @Query("SELECT v.path, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.path ORDER BY COUNT(v) DESC")
    List<Object[]> countByPathSince(LocalDateTime since);

    @Query("SELECT v.ipAddress, COUNT(v) FROM VisitLog v WHERE v.createdAt >= ?1 GROUP BY v.ipAddress ORDER BY COUNT(v) DESC")
    List<Object[]> topIpsSince(LocalDateTime since);
}