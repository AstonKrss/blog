package com.aston.blog.Controller;


import com.aston.blog.Service.AuthService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.LoginDTO;
import com.aston.blog.dto.RegisterDTO;
import com.aston.blog.entity.User;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.auth.LoginVO;
import com.aston.blog.vo.auth.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public Result<LoginVO> login(@RequestBody LoginDTO dto){
        try {
            LoginVO loginVO = authService.login(dto);
            return Result.success(loginVO);
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }
    @PostMapping("/register")
    public Result<LoginVO> register(@RequestBody RegisterDTO dto){
        try {
            LoginVO loginVO = authService.register(dto);
            return Result.success(loginVO);
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }
    @GetMapping("/me")
    public Result<LoginVO> getCurrentUser(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if(authentication != null||!authentication.isAuthenticated()){
            return Result.error(401,"未认证");
        }
        //认证通过
        String username = authentication.getName();
        //这里可以根据用户名查询用户信息并返回
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        // 构建 UserVO
        UserVO userVO = new UserVO();
        userVO.setId(user.getId());
        userVO.setUsername(user.getUsername());
        userVO.setEmail(user.getEmail());
        userVO.setDisplayName(user.getDisplayName());
        userVO.setAvatarUrl(user.getAvatarUrl());
        userVO.setBio(user.getBio());
        userVO.setRole(user.getRole());
        userVO.setCreatedAt(user.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        // 构建 LoginVO
        LoginVO loginVO = new LoginVO();
        loginVO.setUser(userVO);
        // 这里不返回 token，因为前端应该已经保存了 token，可以直接使用
        loginVO.setToken(null);
        return Result.success(loginVO);

    }
}
