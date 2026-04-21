package com.aston.blog.Service;

public interface EmailCodeService {
    void sendCode(String email, String type);
    boolean verifyCode(String email, String code, String type);
}
