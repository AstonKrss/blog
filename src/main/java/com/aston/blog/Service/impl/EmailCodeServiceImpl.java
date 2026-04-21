package com.aston.blog.Service.impl;

import com.aston.blog.Service.EmailCodeService;
import com.aston.blog.entity.EmailCode;
import com.aston.blog.repository.EmailCodeRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmailCodeServiceImpl implements EmailCodeService {

    private static final Logger log = LoggerFactory.getLogger(EmailCodeServiceImpl.class);
    private static final int CODE_EXPIRE_MINUTES = 10;
    private static final int CODE_LENGTH = 6;

    private final EmailCodeRepository emailCodeRepository;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${blog.owner.name:Aston}")
    private String siteName;

    @Override
    @Transactional
    public void sendCode(String email, String type) {
        if (fromEmail == null || fromEmail.isEmpty()) {
            throw new RuntimeException("邮件服务未配置");
        }

        // 生成6位验证码
        String code = generateCode();

        // 删除该邮箱之前的验证码
        emailCodeRepository.deleteByEmailAndType(email, type);

        // 保存新验证码
        EmailCode emailCode = new EmailCode();
        emailCode.setEmail(email);
        emailCode.setCode(code);
        emailCode.setType(type);
        emailCode.setExpireAt(LocalDateTime.now().plusMinutes(CODE_EXPIRE_MINUTES));
        emailCodeRepository.save(emailCode);

        // 发送邮件
        String subject = "[" + siteName + "] 验证码";
        String content = String.format("""
                您好！
                
                您的验证码是：%s
                
                有效期 %d 分钟。请勿告诉他人。
                
                ---
                %s
                """, code, CODE_EXPIRE_MINUTES, siteName);

        sendEmail(email, subject, content);
        log.info("验证码已发送到: {}", email);
    }

    @Override
    @Transactional
    public boolean verifyCode(String email, String code, String type) {
        Optional<EmailCode> emailCodeOpt = emailCodeRepository.findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(email, type);
        
        if (emailCodeOpt.isEmpty()) {
            log.warn("验证码不存在: {}", email);
            return false;
        }

        EmailCode emailCode = emailCodeOpt.get();

        // 检查是否过期
        if (emailCode.getExpireAt().isBefore(LocalDateTime.now())) {
            log.warn("验证码已过期: {}", email);
            return false;
        }

        // 检查验证码是否匹配
        if (!emailCode.getCode().equals(code)) {
            log.warn("验证码错误: {}", email);
            return false;
        }

        // 标记为已使用
        emailCode.setUsed(true);
        emailCodeRepository.save(emailCode);

        return true;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cleanExpiredCodes() {
        emailCodeRepository.deleteExpiredCodes(LocalDateTime.now());
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        int code = random.nextInt((int) Math.pow(10, CODE_LENGTH));
        return String.format("%0" + CODE_LENGTH + "d", code);
    }

    private void sendEmail(String to, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("邮件发送失败: {} -> {}, 错误: {}", fromEmail, to, e.getMessage());
            throw new RuntimeException("邮件发送失败: " + e.getMessage());
        }
    }
}
