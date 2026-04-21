# 邮件发送配置指南

## 概述

本博客使用 Spring Boot 的 `JavaMailSender` 发送邮件，支持 QQ 邮箱。

## 配置步骤

### 1. 获取 QQ 邮箱授权码

1. 登录 [QQ 邮箱](https://mail.qq.com/)
2. 进入 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **SMTP 服务**
5. 点击 **生成授权码**（需要手机验证）
6. 复制生成的授权码（16 位字母）

### 2. 配置环境变量

在 `compose.yaml` 或服务器环境变量中设置：

```yaml
environment:
  MAIL_HOST: smtp.qq.com
  MAIL_PORT: 587
  MAIL_USERNAME: 你的QQ邮箱@example.com
  MAIL_PASSWORD: 生成的授权码
```

或在服务器上：
```bash
export MAIL_USERNAME=3223957215@qq.com
export MAIL_PASSWORD=xxxxxx授权码xxxxxx
```

### 3. 本地开发配置

修改 `src/main/resources/application.properties`：
```properties
spring.mail.host=smtp.qq.com
spring.mail.port=587
spring.mail.username=你的QQ邮箱@qq.com
spring.mail.password=你的授权码
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
```

## 邮件发送代码

### EmailService 接口

```java
public interface EmailService {
    void sendVerificationEmail(String to, String username, String verifyToken);
    void sendNewCommentNotification(String postTitle, String postSlug,
            String commentAuthor, String commentEmail, String commentContent);
}
```

### EmailServiceImpl 实现

```java
@Override
public void sendVerificationEmail(String to, String username, String verifyToken) {
    // 检查邮件配置
    if (fromEmail == null || fromEmail.isEmpty()) {
        log.warn("邮件服务未配置，跳过发送");
        return;
    }

    String verifyUrl = siteUrl + "/api/auth/verify?token=" + verifyToken;
    String subject = "[" + siteName + "] 邮箱验证";
    String content = String.format("""
        您好，%s！

        请点击以下链接完成验证：
        %s

        链接有效期 24 小时。
        """, username, verifyUrl);

    sendEmail(to, subject, content);
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
        log.error("邮件发送失败: {}", e.getMessage());
    }
}
```

## 常见问题

### Q: 授权码是什么？
A: 不是 QQ 密码，是 QQ 邮箱提供的 16 位授权码，用于第三方客户端发送邮件。

### Q: 为什么收不到邮件？
1. 检查垃圾邮件文件夹
2. 确认授权码正确
3. 确认 SMTP 服务已开启
4. 检查服务器网络是否可访问 QQ SMTP

### Q: 可以用其他邮箱吗？
A: 可以，只需修改配置：
- Gmail: `smtp.gmail.com`, 端口 587
- 163: `smtp.163.com`, 端口 465
- 企业邮箱: 找管理员获取 SMTP 配置
