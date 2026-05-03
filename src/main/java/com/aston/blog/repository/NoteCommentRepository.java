package com.aston.blog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.aston.blog.entity.NoteComment;
import java.util.List;

public interface NoteCommentRepository extends JpaRepository<NoteComment, String> {
    List<NoteComment> findByNoteIdOrderByCreatedAtAsc(String noteId);
    long countByNoteId(String noteId);
    void deleteByNoteId(String noteId);
}