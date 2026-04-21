package com.aston.blog.Service;

public interface EmailService {
    /**
     * 发送邮箱验证邮件
     * @param to 接收邮箱
     * @param username 用户名
     * @param verifyToken 验证 Token
     */
    void sendVerificationEmail(String to, String username, String verifyToken);

    /**
     * 发送新评论通知给博主
     */
    void sendNewCommentNotification(String postTitle, String postSlug,
        String commentAuthor, String commentEmail, String commentContent);
}
