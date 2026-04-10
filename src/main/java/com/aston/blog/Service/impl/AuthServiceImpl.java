package com.aston.blog.Service.impl;

import com.aston.blog.Service.AuthService;
import com.aston.blog.common.JwtUtil;
import com.aston.blog.dto.LoginDTO;
import com.aston.blog.dto.RegisterDTO;
import com.aston.blog.entity.User;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.auth.LoginVO;
import com.aston.blog.vo.auth.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    public LoginVO login(LoginDTO dto) {

        // 1. 根据用户名查询用户
        User user = userRepository.findByUsername(dto.getUsername())
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));
        // 2. 校验密码
        if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("用户名或密码错误");
        }
        // 3. 生成 JWT Token
        String token = jwtUtil.generateToken(user.getUsername(), user.getId());
        // 4. 组装返回数据
        UserVO userVO = new UserVO();
        userVO.setId(user.getId());
        userVO.setUsername(user.getUsername());
        userVO.setEmail(user.getEmail());
        userVO.setDisplayName(user.getDisplayName());
        userVO.setAvatarUrl(user.getAvatarUrl());
        userVO.setBio(user.getBio());
        userVO.setRole(user.getRole());
        userVO.setCreatedAt(user.getCreatedAt().toString());

        LoginVO loginVO = new LoginVO();
        loginVO.setUser(userVO);
        loginVO.setToken(token);
        return loginVO;
    }

    @Override
    public LoginVO register(RegisterDTO dto) {
        // 1. 检查用户名是否已存在
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("邮箱已存在");
        }
        // 2. 创建新用户
        User newUser = new User();
        newUser.setUsername(dto.getUsername());
        newUser.setEmail(dto.getEmail());
        newUser.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        newUser.setDisplayName(dto.getUsername());
        newUser.setRole("AUTHOR");
        //3.保存用户
        userRepository.save(newUser);
        //4.封装成userVO并登录
        String token = jwtUtil.generateToken(newUser.getUsername(), newUser.getId());
        LoginVO loginVO = new LoginVO();
        UserVO userVO = new UserVO();
        userVO.setId(newUser.getId());
        userVO.setUsername(newUser.getUsername());
        userVO.setEmail(newUser.getEmail());
        userVO.setDisplayName(newUser.getDisplayName());
        userVO.setAvatarUrl(newUser.getAvatarUrl());
        userVO.setBio(newUser.getBio());
        userVO.setRole(newUser.getRole());
        userVO.setCreatedAt(newUser.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        loginVO.setUser(userVO);
        loginVO.setToken(token);
        return loginVO;
    }
}
