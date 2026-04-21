package com.aston.blog.Service.impl;

import com.aston.blog.Service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${blog.owner.name:Aston}")
    private String siteName;

    @Value("${blog.site.url:http://localhost:8080}")
    private String siteUrl;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendVerificationEmail(String to, String username, String verifyToken) {
        // 检查邮件配置是否完整
        if (fromEmail == null || fromEmail.isEmpty()) {
            log.warn("邮件服务未配置，跳过发送验证邮件到: {}", to);
            return;
        }

        String verifyUrl = siteUrl + "/api/auth/verify?token=" + verifyToken;
        String subject = "[" + siteName + "] 邮箱验证";
        String content = buildVerificationEmailContent(username, verifyUrl);

        sendEmail(to, subject, content);
        log.info("验证邮件已发送到: {}", to);
    }

    @Override
    public void sendNewCommentNotification(String postTitle, String postSlug,
            String commentAuthor, String commentEmail, String commentContent) {
        // 检查邮件配置是否完整
        if (fromEmail == null || fromEmail.isEmpty()) {
            log.warn("邮件服务未配置，跳过发送评论通知");
            return;
        }

        String postUrl = siteUrl + "/blog/" + postSlug;
        String subject = "[" + siteName + "] 新评论通知 - 《" + postTitle + "》";
        String content = buildCommentNotificationContent(postTitle, postUrl,
            commentAuthor, commentEmail, commentContent);

        // 发送给自己（博主）
        sendEmail(fromEmail, subject, content);
    }

    private String buildVerificationEmailContent(String username, String verifyUrl) {
        return String.format("""
            您好，%s！

            感谢您注册 %s！

            请点击以下链接完成邮箱验证：
            %s

            此链接有效期为 24 小时。如果这不是您的操作，请忽略此邮件。

            ---
            %s
            """, username, siteName, verifyUrl, siteName);
    }

    private String buildCommentNotificationContent(String postTitle, String postUrl,
            String commentAuthor, String commentEmail, String commentContent) {
        return String.format("""
            您好！

            您收到了新的评论：

            文章：《%s》
            评论者：%s
            邮箱：%s

            评论内容：
            ---
            %s
            ---

            查看原文：%s

            ---
            %s
            """, postTitle, commentAuthor, commentEmail, commentContent, postUrl, siteName);
    }

    private void sendEmail(String to, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
            log.info("邮件发送成功: {} -> {}", fromEmail, to);
        } catch (Exception e) {
            log.error("邮件发送失败: {} -> {}, 错误: {}", fromEmail, to, e.getMessage());
        }
    }
}
