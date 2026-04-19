package com.aston.blog.Service;

import com.aston.blog.dto.ChangePasswordDTO;
import com.aston.blog.dto.UpdateProfileDTO;
import com.aston.blog.vo.auth.UserVO;

import java.util.List;

public interface UserService {
    UserVO updateProfile(UpdateProfileDTO dto, String authorId);
    void changePassword(ChangePasswordDTO dto, String authorId);
    UserVO getAdmin();
    List<UserVO> getAllUsers();
    
    /**
     * 验证用户是否有管理员角色（从数据库验证）
     */
    boolean isAdmin(String userId);
}
