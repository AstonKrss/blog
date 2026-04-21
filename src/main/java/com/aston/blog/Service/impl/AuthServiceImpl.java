package com.aston.blog.Service.impl;

import com.aston.blog.Service.AuthService;
import com.aston.blog.Service.EmailCodeService;
import com.aston.blog.Service.EmailService;
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
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final EmailCodeService emailCodeService;

    // Token 有效期 24 小时
    private static final int TOKEN_EXPIRE_HOURS = 24;

    @Override
    public LoginVO login(LoginDTO dto) {

        // 1. 根据用户名查询用户
        User user = userRepository.findByUsername(dto.getUsername())
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        // 2. 校验密码
        if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("用户名或密码错误");
        }

        // 3. 检查邮箱是否验证（可选：可以取消注释启用）
        // if (!Boolean.TRUE.equals(user.getEmailVerified())) {
        //     throw new RuntimeException("请先完成邮箱验证");
        // }

        // 4. 生成 JWT Token
        String token = jwtUtil.generateToken(user.getUsername(), user.getId(), user.getRole());

        // 5. 组装返回数据
        UserVO userVO = toUserVO(user);
        LoginVO loginVO = new LoginVO();
        loginVO.setUser(userVO);
        loginVO.setToken(token);
        return loginVO;
    }

    @Override
    @Transactional
    public LoginVO register(RegisterDTO dto) {
        // 0. 先验证验证码
        if (!emailCodeService.verifyCode(dto.getEmail(), dto.getCode(), "REGISTER")) {
            throw new RuntimeException("验证码错误或已过期");
        }

        // 1. 检查用户名是否已存在
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("邮箱已存在");
        }

        // 2. 创建新用户（已验证邮箱，直接设为 true）
        User newUser = new User();
        newUser.setUsername(dto.getUsername());
        newUser.setEmail(dto.getEmail());
        newUser.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        newUser.setDisplayName(dto.getUsername());
        newUser.setRole("AUTHOR");
        newUser.setEmailVerified(true); // 验证码通过 = 邮箱已验证
        newUser.setCreatedAt(LocalDateTime.now());

        // 3. 保存用户
        newUser = userRepository.save(newUser);

        // 4. 生成登录 Token
        String token = jwtUtil.generateToken(newUser.getUsername(), newUser.getId(), newUser.getRole());

        LoginVO loginVO = new LoginVO();
        loginVO.setUser(toUserVO(newUser));
        loginVO.setToken(token);
        return loginVO;
    }

    @Override
    @Transactional
    public boolean verifyEmail(String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }

        // 1. 根据 Token 查找用户
        User user = userRepository.findByEmailVerifyToken(token).orElse(null);
        if (user == null) {
            return false;
        }

        // 2. 检查 Token 是否过期
        if (user.getEmailVerifyExpire() == null || user.getEmailVerifyExpire().isBefore(LocalDateTime.now())) {
            return false;
        }

        // 3. 检查是否已验证
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return true; // 已经验证过了
        }

        // 4. 标记为已验证
        user.setEmailVerified(true);
        user.setEmailVerifyToken(null); // 清除 Token
        user.setEmailVerifyExpire(null);
        userRepository.save(user);

        return true;
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        // 如果已经验证过了，不需要重新发送
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new RuntimeException("邮箱已经验证过了");
        }

        // 生成新的 Token
        String verifyToken = generateVerifyToken();
        user.setEmailVerifyToken(verifyToken);
        user.setEmailVerifyExpire(LocalDateTime.now().plusHours(TOKEN_EXPIRE_HOURS));
        userRepository.save(user);

        // 发送验证邮件
        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), verifyToken);
    }

    /**
     * 生成安全的验证 Token
     */
    private String generateVerifyToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * 将 User 实体转换为 UserVO
     */
    private UserVO toUserVO(User user) {
        UserVO userVO = new UserVO();
        userVO.setId(user.getId());
        userVO.setUsername(user.getUsername());
        userVO.setEmail(user.getEmail());
        userVO.setDisplayName(user.getDisplayName());
        userVO.setAvatarUrl(user.getAvatarUrl());
        userVO.setBio(user.getBio());
        userVO.setRole(user.getRole());
        userVO.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        return userVO;
    }
}
