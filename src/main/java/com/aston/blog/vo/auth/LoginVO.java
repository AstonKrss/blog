package com.aston.blog.vo.auth;

import com.aston.blog.entity.User;

//登录返回
public class LoginVO {
    private UserVO user;
    private String token; // JWT Token

    public LoginVO() {}

    public LoginVO(UserVO user, String token) {
        this.user = user;
        this.token = token;
    }

    // Getters and Setters
    public UserVO getUser() {
        return user;
    }

    public void setUser(UserVO user) {
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

}
