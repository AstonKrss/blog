package com.aston.blog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.aston.blog.entity.NoteLike;
import java.util.List;
import java.util.Optional;

public interface NoteLikeRepository extends JpaRepository<NoteLike, String> {
    Optional<NoteLike> findByNoteIdAndUserId(String noteId, String userId);
    List<NoteLike> findByUserId(String userId);
    void deleteByNoteId(String noteId);
    void deleteByNoteIdAndUserId(String noteId, String userId);
}