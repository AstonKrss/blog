package com.aston.blog.vo.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
//用户基本信息
public class UserVO {
    private String id;
    private String username;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private String role; // ADMIN, AUTHOR, READER
    private String createdAt;
}
