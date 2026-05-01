package com.aston.blog.vo.guestbook;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class GuestbookVO {
    private String id;
    private String nickname;
    private String content;
    private String contact;
    private LocalDateTime createdAt;
}