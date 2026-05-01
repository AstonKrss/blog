package com.aston.blog.Service.impl;

import com.aston.blog.Service.GuestbookService;
import com.aston.blog.entity.Guestbook;
import com.aston.blog.repository.GuestbookRepository;
import com.aston.blog.vo.guestbook.GuestbookVO;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GuestbookServiceImpl implements GuestbookService {

    private final GuestbookRepository guestbookRepository;

    public GuestbookServiceImpl(GuestbookRepository guestbookRepository) {
        this.guestbookRepository = guestbookRepository;
    }

    @Override
    public List<GuestbookVO> getAllGuestbooks() {
        return guestbookRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public GuestbookVO addGuestbook(String nickname, String content, String contact) {
        Guestbook guestbook = new Guestbook();
        guestbook.setNickname(nickname);
        guestbook.setContent(content);
        guestbook.setContact(contact);
        guestbook = guestbookRepository.save(guestbook);
        return toVO(guestbook);
    }

    private GuestbookVO toVO(Guestbook gb) {
        GuestbookVO vo = new GuestbookVO();
        vo.setId(gb.getId());
        vo.setNickname(gb.getNickname());
        vo.setContent(gb.getContent());
        vo.setContact(gb.getContact());
        vo.setCreatedAt(gb.getCreatedAt());
        return vo;
    }
}