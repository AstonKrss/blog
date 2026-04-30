package com.aston.blog.Controller;

import com.aston.blog.Service.AttackLogService;
import com.aston.blog.Service.AuthService;
import com.aston.blog.Service.EmailCodeService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.LoginDTO;
import com.aston.blog.dto.RegisterDTO;
import com.aston.blog.dto.SendCodeDTO;
import com.aston.blog.entity.User;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.auth.LoginVO;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.Map;

import io.jsonwebtoken.security.Request;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserRepository userRepository;
    private final EmailCodeService emailCodeService;
    private final AttackLogService attackLogService;

    public AuthController(AuthService authService, UserRepository userRepository, EmailCodeService emailCodeService,
            AttackLogService attackLogService) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.emailCodeService = emailCodeService;
        this.attackLogService = attackLogService;
    }

    @PostMapping("/login")
    public Result<LoginVO> login(@RequestBody LoginDTO dto, HttpServletRequest request) {
        String ip = getClientIp(request);
        String userAgent = request.getHeader("User-Agent") != null ? request.getHeader("User-Agent") : "";
        String username = dto.getUsername();
        String password = dto.getPassword();

        if (attackLogService.isIpBlocked(ip)) {
            return Result.error(403, "您的IP已被封禁，请15分钟后再试");
        }

        // 暴力破解登录接口，记录登录尝试日志
        if (attackLogService.isBruteForce(ip, username)) {
            attackLogService.blockIp(ip);
            attackLogService.recordAttack(ip, "/api/auth/login", "POST", "username=" + username, "BRUTE_FORCE",
                    userAgent, null);
            return Result.error(429, "登录尝试次数过多，请15分钟后再试");
        }

        try {
            LoginVO loginVO = authService.login(dto);
            attackLogService.recordLoginAttempt(ip, username, true, userAgent); // 成功
            return Result.success(loginVO);
        } catch (Exception e) {
            if (isWeakPassword(password)) {
                attackLogService.recordAttack(ip, "/api/auth/login", "POST",
                        "username=" + username + ", password=WeakPassword", "WEAK_PASSWORD_ATTACK", userAgent, null);
            }
            attackLogService.recordLoginAttempt(ip, username, false, userAgent); // 失败
            return Result.error(401, "用户名或密码错误");
        }

    }

    /**
     * 发送注册验证码
     */
    @PostMapping("/send-code")
    public Result<?> sendRegisterCode(@Valid @RequestBody SendCodeDTO dto) {
        try {
            // 检查邮箱是否已注册
            if (userRepository.existsByEmail(dto.getEmail())) {
                return Result.error(400, "该邮箱已注册");
            }
            emailCodeService.sendCode(dto.getEmail(), "REGISTER");
            return Result.success(Map.of("message", "验证码已发送"));
        } catch (Exception e) {
            return Result.error(500, e.getMessage());
        }
    }

    @PostMapping("/register")
    public Result<LoginVO> register(@Valid @RequestBody RegisterDTO dto) {
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

    private String getClientIp(HttpServletRequest request) {
        String[] headers = {
            "X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP",
            "WL-Proxy-Client-IP", "HTTP_X_FORWARDED_FOR", "HTTP_X_FORWARDED",
            "HTTP_CLIENT_IP", "HTTP_FORWARDED_FOR", "REMOTE_ADDR"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private boolean isWeakPassword(String password) {
        if (password == null || password.isEmpty())
            return false;

        int score = 0;
        String p = password.toLowerCase();
        if (p.matches("\\d+"))
            score += 10;

        if (p.matches("[a-z]+"))
            score += 10;

        if (hasSequentialNumbers(p))
            score += 20;

        if (p.matches(".*(.)\\1{2,}.*"))
            score += 15;

        if (hasKeyboardPattern(p))
            score += 15;

        if (password.length() <= 6)
            score += 10;

        if (p.matches("[a-z]{1,8}"))
            score += 10;

        return score >= 60;
    }

    private boolean hasSequentialNumbers(String p) {
        String seq = "0123456789";
        String rev = "9876543210";
        for (int i = 0; i < p.length() - 2; i++) {
            String sub = p.substring(i, i + 3);
            if (seq.contains(sub) || rev.contains(sub))
                return true;
        }
        return false;
    }

    private boolean hasKeyboardPattern(String p) {
        String[] patterns = { "qwerty", "qwert", "asdf", "asdfg", "zxcv", "zxcvb",
                "1qaz", "2wsx", "3edc", "qazwsx", "!@#$", "qweasd" };
        for (String pattern : patterns) {
            if (p.contains(pattern))
                return true;
        }
        return false;
    }
}
