package com.aston.blog.Service;

import com.aston.blog.dto.LoginDTO;
import com.aston.blog.dto.RegisterDTO;
import com.aston.blog.vo.auth.LoginVO;
import com.aston.blog.vo.auth.UserVO;

public interface AuthService {
    LoginVO login(LoginDTO dto);

    LoginVO register(RegisterDTO dto);

    /**
     * 验证邮箱
     * @param token 验证 Token
     * @return 验证是否成功
     */
    boolean verifyEmail(String token);

    /**
     * 重新发送验证邮件
     * @param userId 用户ID
     */
    void resendVerificationEmail(String userId);
}
