package com.aston.blog.Controller;

import com.aston.blog.Service.FriendLinkService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.ApplyFriendLinkDTO;
import com.aston.blog.dto.ApproveFriendLinkDTO;
import com.aston.blog.vo.friend.FriendLinkListVO;
import com.aston.blog.vo.friend.FriendLinkVO;
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
    public Result<List<FriendLinkVO>> getPending(@RequestParam(required = false) String status) {
        return Result.success(service.getPendingFriendLinks());
    }

    @PutMapping("/friends/{id}/status")
    public Result<?> approve(@PathVariable String id, @Valid @RequestBody ApproveFriendLinkDTO dto) {
        service.approve(id, dto);
        return Result.success(null);
    }
}