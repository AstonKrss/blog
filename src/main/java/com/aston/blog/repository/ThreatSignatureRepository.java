package com.aston.blog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import com.aston.blog.entity.ThreatSignature;
import java.util.List;

public interface ThreatSignatureRepository extends JpaRepository<ThreatSignature, String> {

    ThreatSignature findByIp(String ip);

    List<ThreatSignature> findByReviewedFalseOrderByAttackCountDesc();

    @Query("SELECT t FROM ThreatSignature t WHERE t.reviewed = false ORDER BY t.attackCount DESC")
    List<ThreatSignature> findTopThreats(Pageable pageable);

    @Query("SELECT COUNT(t) FROM ThreatSignature t WHERE t.reviewed = false")
    long countUnreviewed();

    List<ThreatSignature> findByIpAndReviewedFalse(String ip);
}