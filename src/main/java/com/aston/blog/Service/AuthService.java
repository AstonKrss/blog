package com.aston.blog.Service;

import com.aston.blog.dto.LoginDTO;
import com.aston.blog.dto.RegisterDTO;
import com.aston.blog.vo.auth.LoginVO;
import com.aston.blog.vo.auth.UserVO;

public interface AuthService {
    LoginVO login(LoginDTO dto);

    LoginVO register(RegisterDTO dto);
}
