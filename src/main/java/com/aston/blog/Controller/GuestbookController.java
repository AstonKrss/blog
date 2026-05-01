package com.aston.blog.Controller;

import com.aston.blog.Service.GuestbookService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.GuestbookDTO;
import com.aston.blog.vo.guestbook.GuestbookVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class GuestbookController {

    private final GuestbookService guestbookService;

    public GuestbookController(GuestbookService guestbookService) {
        this.guestbookService = guestbookService;
    }

    // 获取留言列表（公开接口）
    @GetMapping("/public/guestbook")
    public Result<List<GuestbookVO>> getGuestbooks() {
        return Result.success(guestbookService.getAllGuestbooks());
    }

    // 添加留言（公开接口）
    @PostMapping("/guestbook")
    public Result<GuestbookVO> addGuestbook(@Valid @RequestBody GuestbookDTO dto) {
        GuestbookVO guestbook = guestbookService.addGuestbook(
            dto.getNickname(),
            dto.getContent(),
            dto.getContact()
        );
        return Result.success(guestbook);
    }
}