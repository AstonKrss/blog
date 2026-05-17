package com.aston.blog.Service.impl;

import com.aston.blog.Service.ThreatSignatureService;
import com.aston.blog.entity.ThreatSignature;
import com.aston.blog.repository.ThreatSignatureRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ThreatSignatureServiceImpl implements ThreatSignatureService {

    private static final int THREAT_THRESHOLD = 3; // 超过3次攻击即记录到威胁特征库
    private static final int MAX_PAYLOADS = 50;    // 最多记录50个不同 payload

    private final ThreatSignatureRepository repository;

    public ThreatSignatureServiceImpl(ThreatSignatureRepository repository) {
        this.repository = repository;
    }

    @Override
    public void recordThreat(String ip, String path, String method, String payload,
                             String attackType, String userAgent, String fullPayload) {

        // 无论如何都记录 payload
        ThreatSignature sig = repository.findByIp(ip);

        if (sig == null) {
            // 新 IP，创建记录
            sig = new ThreatSignature();
            sig.setIp(ip);
            sig.setPayloads(safeTruncate(payload));
            sig.setUserAgent(userAgent != null ? userAgent : "");
            sig.setAttackCount(1);
            sig.setAttackTypes(attackType);
            sig.setReviewed(false);
            sig.setRiskLevel(calculateRiskLevel(attackType));
        } else {
            // 已存在，追加 payload（去重）
            String existingPayloads = sig.getPayloads();
            String newPayload = safeTruncate(payload);

            if (existingPayloads != null && !existingPayloads.contains(newPayload)) {
                String[] allPayloads = existingPayloads.split("\\|\\|");
                if (allPayloads.length < MAX_PAYLOADS) {
                    sig.setPayloads(existingPayloads + "||" + newPayload);
                }
            }

            // 追加攻击类型
            String existingTypes = sig.getAttackTypes();
            if (existingTypes == null || !existingTypes.contains(attackType)) {
                sig.setAttackTypes((existingTypes != null ? existingTypes + "," : "") + attackType);
            }

            sig.setAttackCount(sig.getAttackCount() + 1);
            sig.setUserAgent(userAgent != null ? userAgent : sig.getUserAgent());

            // 动态更新威胁等级
            sig.setRiskLevel(calculateRiskLevel(sig.getAttackCount(), sig.getAttackTypes()));
        }

        repository.save(sig);
    }

    @Override
    public List<ThreatSignature> getUnreviewedThreats() {
        return repository.findTopThreats(PageRequest.of(0, 50));
    }

    @Override
    public void markReviewed(String id, String note) {
        repository.findById(id).ifPresent(sig -> {
            sig.setReviewed(true);
            sig.setNote(note);
            repository.save(sig);
        });
    }

    @Override
    public long countUnreviewed() {
        return repository.countUnreviewed();
    }

    /** 根据攻击类型和攻击次数计算威胁等级 */
    private String calculateRiskLevel(String attackTypes) {
        if (attackTypes == null) return "low";

        boolean isHigh = attackTypes.contains("COMMAND_INJECTION") || attackTypes.contains("SQL_INJECTION");
        boolean isMedium = attackTypes.contains("XSS") || attackTypes.contains("PATH_TRAVERSAL") || attackTypes.contains("BRUTE_FORCE");

        if (isHigh) return "critical";
        if (isMedium) return "high";
        return "medium";
    }

    /** 根据攻击次数和类型计算威胁等级（实时计算） */
    private String calculateRiskLevel(int attackCount, String attackTypes) {
        String base = calculateRiskLevel(attackTypes);
        // 攻击次数 >= 5 自动升级一级
        if (attackCount >= 5) {
            if ("critical".equals(base)) return "critical";
            if ("high".equals(base)) return "critical";
            return "high";
        }
        return base;
    }

    /** 安全截取 payload，避免过长 */
    private String safeTruncate(String payload) {
        if (payload == null || payload.isEmpty()) return "(empty)";
        return payload.length() > 200 ? payload.substring(0, 200) + "..." : payload;
    }
}