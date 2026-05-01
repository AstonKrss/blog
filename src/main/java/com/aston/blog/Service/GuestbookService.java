package com.aston.blog.Service;

import com.aston.blog.vo.guestbook.GuestbookVO;
import java.util.List;

public interface GuestbookService {
    List<GuestbookVO> getAllGuestbooks();
    GuestbookVO addGuestbook(String nickname, String content, String contact);
}