package com.aston.blog.Controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.aston.blog.Service.UserService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.ChangePasswordDTO;
import com.aston.blog.dto.UpdateProfileDTO;
import com.aston.blog.vo.auth.UserVO;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PutMapping("/profile")
    public Result<UserVO> updateProfile(@RequestBody UpdateProfileDTO dto, HttpServletRequest request) {
        String authorId = getUserIdFromRequest(request);
        if (authorId == null) return Result.error(401, "未登录");
        UserVO vo = userService.updateProfile(dto, authorId);
        return vo != null ? Result.success(vo) : Result.error(404, "用户不存在");
    }

    @PutMapping("/password")
    public Result<Void> changePassword(@RequestBody ChangePasswordDTO dto, HttpServletRequest request) {
        String authorId = getUserIdFromRequest(request);
        if (authorId == null) return Result.error(401, "未登录");
        try {
            userService.changePassword(dto, authorId);
            return Result.success(null);
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    private String getUserIdFromRequest(HttpServletRequest request) {
        var auth = request.getUserPrincipal();
        return auth != null ? auth.getName() : null;
    }
}