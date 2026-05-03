package com.aston.blog.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.aston.blog.entity.Note;
import java.util.List;

public interface NoteRepository extends JpaRepository<Note, String> {
    Page<Note> findByAuthorIdOrderByCreatedAtDesc(String authorId, Pageable pageable);

    List<Note> findByAuthorIdOrderByCreatedAtDesc(String authorId);

    void deleteByIdAndAuthorId(String id, String authorId);
}