package com.aston.blog.Service.impl;

import org.springframework.stereotype.Service;
import com.aston.blog.dto.UpdateProfileDTO;
import com.aston.blog.vo.auth.UserVO;
import com.aston.blog.Service.UserService;

@Service
public class UserServiceImpl implements UserService {

    @Override
    public UserVO updateProfile(UpdateProfileDTO dto, String authorId) {
        return null;
    }

}