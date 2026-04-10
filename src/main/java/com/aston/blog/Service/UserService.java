package com.aston.blog.Service;

import com.aston.blog.dto.UpdateProfileDTO;
import com.aston.blog.vo.auth.UserVO;

public interface UserService {
    UserVO updateProfile(UpdateProfileDTO dto, String authorId);
}
