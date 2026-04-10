package com.aston.blog.Controller;

import com.aston.blog.Service.AuthService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.LoginDTO;
import com.aston.blog.dto.RegisterDTO;
import com.aston.blog.entity.User;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.auth.LoginVO;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.format.DateTimeFormatter;

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
            return Result.success(authService.login(dto));
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

    @GetMapping("/me")
    public Result<LoginVO> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Result.error(401, "未认证");
        }
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
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
}