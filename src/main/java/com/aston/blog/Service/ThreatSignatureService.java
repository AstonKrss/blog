package com.aston.blog.Service;

import com.aston.blog.entity.ThreatSignature;
import java.util.List;

public interface ThreatSignatureService {

    /**
     * 记录一次攻击，自动判断是否需要创建/更新威胁特征
     * @param ip 攻击者 IP
     * @param path 目标路径
     * @param method 请求方法
     * @param payload 攻击载荷
     * @param attackType 攻击类型
     * @param userAgent 用户代理
     * @param fullPayload 完整 payload
     */
    void recordThreat(String ip, String path, String method, String payload, String attackType,
                       String userAgent, String fullPayload);

    /**
     * 获取未审核的高危威胁列表
     */
    List<ThreatSignature> getUnreviewedThreats();

    /**
     * 标记威胁已审核
     */
    void markReviewed(String id, String note);

    /**
     * 获取威胁统计（未审核数量）
     */
    long countUnreviewed();
}