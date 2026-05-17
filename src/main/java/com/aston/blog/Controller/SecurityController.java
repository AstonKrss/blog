package com.aston.blog.Controller;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.Service.ThreatSignatureService;
import com.aston.blog.common.Result;
import com.aston.blog.vo.security.SecurityStatsVO;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/security")
public class SecurityController {

    private final AttackLogService attackLogService;
    private final ThreatSignatureService threatSignatureService;

    public SecurityController(AttackLogService attackLogService, ThreatSignatureService threatSignatureService) {
        this.attackLogService = attackLogService;
        this.threatSignatureService = threatSignatureService;
    }

    @GetMapping("/stats")
    public Result<SecurityStatsVO> getSecurityStats() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return Result.error(401, "未认证");
        }

        String role = getRoleFromAuth(auth);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限访问");
        }

        return Result.success(attackLogService.getSecurityStats());
    }

    @GetMapping("/logs")
    public Result<?> getAttackLogs(
            @RequestParam(required = false) String attackType,
            @RequestParam(required = false) String ip,
            @RequestParam(defaultValue = "50") int limit) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Result.error(401, "未认证");
        String role = getRoleFromAuth(auth);
        if (!"ADMIN".equals(role)) return Result.error(403, "无权限访问");
        return Result.success(attackLogService.getRecentLogsByType(attackType, ip, limit));
    }

    /** 获取未审核的威胁列表 */
    @GetMapping("/threats")
    public Result<List<?>> getUnreviewedThreats() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Result.error(401, "未认证");
        String role = getRoleFromAuth(auth);
        if (!"ADMIN".equals(role)) return Result.error(403, "无权限访问");
        return Result.success(threatSignatureService.getUnreviewedThreats());
    }

    /** 标记威胁已审核 */
    @PostMapping("/threats/{id}/review")
    public Result<?> markThreatReviewed(@PathVariable String id, @RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Result.error(401, "未认证");
        String role = getRoleFromAuth(auth);
        if (!"ADMIN".equals(role)) return Result.error(403, "无权限访问");
        threatSignatureService.markReviewed(id, body.get("note"));
        return Result.success("已标记审核");
    }

    /** 获取未审核威胁数量 */
    @GetMapping("/threats/count")
    public Result<?> getUnreviewedCount() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Result.error(401, "未认证");
        String role = getRoleFromAuth(auth);
        if (!"ADMIN".equals(role)) return Result.error(403, "无权限访问");
        return Result.success(Map.of("count", threatSignatureService.countUnreviewed()));
    }

    private String getRoleFromAuth(Authentication auth) {
        if (auth.getAuthorities() != null && auth.getAuthorities().iterator().hasNext()) {
            return auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        }
        return null;
    }
}
