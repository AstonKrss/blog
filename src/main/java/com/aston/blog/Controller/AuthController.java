package com.aston.blog.Controller;

import com.aston.blog.Service.AuthService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.LoginDTO;
import com.aston.blog.dto.RegisterDTO;
import com.aston.blog.entity.User;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.auth.LoginVO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public Result<LoginVO> login(@RequestBody LoginDTO dto) {
        try {
            LoginVO loginVO = authService.login(dto);
            return Result.success(loginVO);
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PostMapping("/register")
    public Result<LoginVO> register(@RequestBody RegisterDTO dto) {
        try {
            return Result.success(authService.register(dto));
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }

    /**
     * 邮箱验证接口
     * 用户点击邮件中的链接后会访问这个接口
     */
    @GetMapping("/verify")
    public Result<Map<String, Object>> verifyEmail(@RequestParam String token) {
        try {
            boolean success = authService.verifyEmail(token);
            Map<String, Object> result = new java.util.HashMap<>();
            if (success) {
                result.put("verified", true);
                result.put("message", "邮箱验证成功！");
                return Result.success(result);
            } else {
                result.put("verified", false);
                result.put("message", "验证链接无效或已过期");
                return Result.error(400, "验证链接无效或已过期");
            }
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }

    /**
     * 重新发送验证邮件
     */
    @PostMapping("/resend-verify")
    public Result<?> resendVerificationEmail(HttpServletRequest request) {
        try {
            String userId = getUserIdFromRequest(request);
            if (userId == null) {
                return Result.error(401, "请先登录");
            }
            authService.resendVerificationEmail(userId);
            return Result.success(Map.of("message", "验证邮件已发送，请查收"));
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }

    @GetMapping("/me")
    public Result<LoginVO> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Result.error(401, "未认证");
        }
        String principal = auth.getPrincipal().toString();
        User user;
        try {
            user = userRepository.findByUsername(principal).orElse(null);
            if (user == null) {
                // 如果不是username，可能是userId，尝试用ID查询
                user = userRepository.findById(principal).orElseThrow(() -> new RuntimeException("用户不存在"));
            }
        } catch (Exception e) {
            return Result.error(401, "用户不存在");
        }
        var userVO = new com.aston.blog.vo.auth.UserVO();
        userVO.setId(user.getId());
        userVO.setUsername(user.getUsername());
        userVO.setEmail(user.getEmail());
        userVO.setDisplayName(user.getDisplayName());
        userVO.setAvatarUrl(user.getAvatarUrl());
        userVO.setBio(user.getBio());
        userVO.setRole(user.getRole());
        userVO.setCreatedAt(user.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        var loginVO = new LoginVO();
        loginVO.setUser(userVO);
        loginVO.setToken(null);
        return Result.success(loginVO);
    }

    private String getUserIdFromRequest(HttpServletRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() != null) {
                Object principal = auth.getPrincipal();
                if (principal instanceof String) {
                    return (String) principal;
                }
            }
        } catch (Exception e) {
        }
        return null;
    }
}
