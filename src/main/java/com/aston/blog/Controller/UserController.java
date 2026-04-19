package com.aston.blog.Controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;

import com.aston.blog.Service.UserService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.ChangePasswordDTO;
import com.aston.blog.dto.UpdateProfileDTO;
import com.aston.blog.vo.auth.UserVO;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/admin")
    public Result<UserVO> getAdmin(HttpServletRequest request) {
        String userId = getUserIdFromRequest(request);
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        // 双重验证：从SecurityContext和数据库双重确认
        String role = getUserRoleFromRequest(request);
        if (!"ADMIN".equals(role) && !userService.isAdmin(userId)) {
            return Result.error(403, "无权限");
        }
        UserVO admin = userService.getAdmin();
        return admin != null ? Result.success(admin) : Result.error(404, "管理员不存在");
    }

    @GetMapping
    public Result<List<UserVO>> getAllUsers(HttpServletRequest request) {
        String userId = getUserIdFromRequest(request);
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        String role = getUserRoleFromRequest(request);
        if (!"ADMIN".equals(role) && !userService.isAdmin(userId)) {
            return Result.error(403, "无权限");
        }
        return Result.success(userService.getAllUsers());
    }

    @PutMapping("/profile")
    public Result<UserVO> updateProfile(@RequestBody UpdateProfileDTO dto, HttpServletRequest request) {
        String authorId = getUserIdFromRequest(request);
        if (authorId == null) return Result.error(401, "未登录");
        UserVO vo = userService.updateProfile(dto, authorId);
        return vo != null ? Result.success(vo) : Result.error(404, "用户不存在");
    }

    @PutMapping("/password")
    public Result<Void> changePassword(@RequestBody ChangePasswordDTO dto, HttpServletRequest request) {
        String authorId = getUserIdFromRequest(request);
        if (authorId == null) return Result.error(401, "未登录");
        try {
            userService.changePassword(dto, authorId);
            return Result.success(null);
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    private String getUserIdFromRequest(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() != null) {
                Object principal = auth.getPrincipal();
                if (principal instanceof String) {
                    return (String) principal;
                }
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }

    private String getUserRoleFromRequest(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getAuthorities() != null) {
                return auth.getAuthorities().stream()
                        .filter(a -> a.getAuthority().startsWith("ROLE_"))
                        .map(a -> a.getAuthority().substring(5))
                        .findFirst()
                        .orElse(null);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}