package com.aston.blog.Service.impl;

import com.aston.blog.Service.FriendLinkService;
import com.aston.blog.dto.ApplyFriendLinkDTO;
import com.aston.blog.dto.ApproveFriendLinkDTO;
import com.aston.blog.entity.FriendStatus;
import com.aston.blog.entity.Friend_links;
import com.aston.blog.repository.FriendLinkRepository;
import com.aston.blog.vo.friend.FriendLinkListVO;
import com.aston.blog.vo.friend.FriendLinkVO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FriendLinkServiceImpl implements FriendLinkService {

    private static final Logger log = LoggerFactory.getLogger(FriendLinkServiceImpl.class);
    private final FriendLinkRepository repository;

    public FriendLinkServiceImpl(FriendLinkRepository repository) {
        this.repository = repository;
    }

    @Override
    @Cacheable(value = "approvedFriends")
    public FriendLinkListVO getApprovedFriendLinks() {
        log.info("getApprovedFriendLinks called");
        List<Friend_links> approvedLinks = repository.findByStatus(FriendStatus.APPROVED);
        log.info("Found {} links", approvedLinks.size());
        
        List<FriendLinkVO> voList = new ArrayList<>();
        for (Friend_links f : approvedLinks) {
            FriendLinkVO vo = new FriendLinkVO();
            vo.setId(f.getId());
            vo.setName(f.getName());
            vo.setUrl(f.getUrl());
            vo.setDescription(f.getDescription());
            vo.setAvatar(f.getAvatar());
            voList.add(vo);
        }
        
        FriendLinkListVO result = new FriendLinkListVO();
        result.setFriends(voList);
        return result;
    }

    @Override
    public FriendLinkVO apply(ApplyFriendLinkDTO dto) {
        try {
            log.info("Applying friend link: {}", dto.getName());
            Friend_links entity = new Friend_links();
            entity.setName(dto.getName());
            entity.setUrl(dto.getUrl());
            entity.setDescription(dto.getDescription());
            entity.setAvatar(dto.getAvatar());
            entity.setEmail(dto.getEmail());
            entity.setStatus(FriendStatus.PENDING);
            
            Friend_links saved = repository.save(entity);
            log.info("Saved friend link with id: {}", saved.getId());
            return toVO(saved);
        } catch (Exception e) {
            log.error("Error applying friend link", e);
            throw e;
        }
    }

    @Override
    public List<FriendLinkVO> getPendingFriendLinks() {
        return repository.findByStatus(FriendStatus.PENDING).stream()
            .map(this::toVO)
            .collect(Collectors.toList());
    }

    @Override
    @CacheEvict(value = "approvedFriends", allEntries = true)
    public void approve(String id, ApproveFriendLinkDTO dto) {
        Friend_links entity = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("友链不存在"));
        entity.setStatus(FriendStatus.valueOf(dto.getStatus()));
        repository.save(entity);
    }

    private FriendLinkVO toVO(Friend_links entity) {
        FriendLinkVO vo = new FriendLinkVO();
        vo.setId(entity.getId());
        vo.setName(entity.getName());
        vo.setUrl(entity.getUrl());
        vo.setDescription(entity.getDescription());
        vo.setAvatar(entity.getAvatar());
        vo.setEmail(entity.getEmail());
        vo.setStatus(entity.getStatus() != null ? entity.getStatus().name() : null);
        return vo;
    }
}