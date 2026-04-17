package com.aston.blog.repository;

import com.aston.blog.entity.Friend_links;
import com.aston.blog.entity.FriendStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FriendLinkRepository extends JpaRepository<Friend_links, String> {
    List<Friend_links> findByStatus(FriendStatus status);
}