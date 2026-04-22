package com.aston.blog.Controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.aston.blog.common.Result;
import com.aston.blog.dto.ApplyFriendLinkDTO;
import com.aston.blog.dto.ApproveFriendLinkDTO;
import com.aston.blog.vo.friend.FriendLinkListVO;
import com.aston.blog.vo.friend.FriendLinkVO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api")
public class FriendLinkController {

    private final FriendSerivice friendService;

    public FriendLinkController(FriendSerivice friendService) {
        this.friendService = friendService;
    }

    @GetMapping("public/friends")
    public Result<FriendLinkListVO> getFriendLinks() {
        FriendLinkListVO friendLinkList = friendService.getApprovedFriendLinks();
        return Result.success(friendLinkList);
    }

    // 申请友链
    @PostMapping("/friends/apply")
    public Result<FriendLinkVO> apply(@Valid @RequestBody ApplyFriendLinkDTO dto) {
        return Result.success(friendService.apply(dto));
    }

    // 获取待审核列表
    @GetMapping("/friends")
    public Result<List<FriendLinkVO>> getPending(
            @RequestParam(required = false) String status,
            @RequestHeader("Authorization") String token) {
        // 这里应该验证管理员权限
        return Result.success(friendService.getPendingFriends());
    }

    // 审核友链
    @PutMapping("/friends/{id}/status")
    public Result<?> approve(
            @PathVariable String id,
            @Valid @RequestBody ApproveFriendLinkDTO dto,
            @RequestHeader("Authorization") String token) {
        friendService.approve(id, dto);
        return Result.success(null);
    }
}
