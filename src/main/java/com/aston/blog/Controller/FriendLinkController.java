package com.aston.blog.Controller;

import com.aston.blog.Service.FriendLinkService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.ApplyFriendLinkDTO;
import com.aston.blog.dto.ApproveFriendLinkDTO;
import com.aston.blog.vo.friend.FriendLinkListVO;
import com.aston.blog.vo.friend.FriendLinkVO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class FriendLinkController {

    private final FriendLinkService service;

    public FriendLinkController(FriendLinkService service) {
        this.service = service;
    }

    @GetMapping("/public/friends")
    public Result<FriendLinkListVO> getFriends() {
        return Result.success(service.getApprovedFriendLinks());
    }

    @PostMapping("/friends/apply")
    public Result<FriendLinkVO> apply(@Valid @RequestBody ApplyFriendLinkDTO dto) {
        return Result.success(service.apply(dto));
    }

    @GetMapping("/friends")
    public Result<List<FriendLinkVO>> getPending(@RequestParam(required = false) String status, HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        return Result.success(service.getPendingFriendLinks());
    }

    @PutMapping("/friends/{id}/status")
    public Result<?> approve(@PathVariable String id, @Valid @RequestBody ApproveFriendLinkDTO dto, HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        service.approve(id, dto);
        return Result.success(null);
    }

    private String getUserRole(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getAuthorities() != null) {
                return auth.getAuthorities().stream()
                        .filter(a -> a.getAuthority().startsWith("ROLE_"))
                        .map(a -> a.getAuthority().substring(5))
                        .findFirst()
                        .orElse(null);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}