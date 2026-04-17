package com.aston.blog.Service;

import com.aston.blog.dto.ApplyFriendLinkDTO;
import com.aston.blog.dto.ApproveFriendLinkDTO;
import com.aston.blog.vo.friend.FriendLinkListVO;
import com.aston.blog.vo.friend.FriendLinkVO;

import java.util.List;

public interface FriendLinkService {
    FriendLinkListVO getApprovedFriendLinks();
    FriendLinkVO apply(ApplyFriendLinkDTO dto);
    List<FriendLinkVO> getPendingFriendLinks();
    void approve(String id, ApproveFriendLinkDTO dto);
}