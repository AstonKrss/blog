package com.aston.blog.repository;

import com.aston.blog.entity.Guestbook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GuestbookRepository extends JpaRepository<Guestbook, String> {
    List<Guestbook> findAllByOrderByCreatedAtDesc();
}