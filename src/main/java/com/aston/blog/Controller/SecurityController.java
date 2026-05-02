package com.aston.blog.Controller;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.common.Result;
import com.aston.blog.vo.security.SecurityStatsVO;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/security")
public class SecurityController {

    private final AttackLogService attackLogService;

    public SecurityController(AttackLogService attackLogService) {
        this.attackLogService = attackLogService;
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

    private String getRoleFromAuth(Authentication auth) {
        if (auth.getAuthorities() != null && auth.getAuthorities().iterator().hasNext()) {
            return auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        }
        return null;
    }
}
