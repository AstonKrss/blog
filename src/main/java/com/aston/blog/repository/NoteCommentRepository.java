package com.aston.blog.repository;

import com.aston.blog.entity.NoteComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface NoteCommentRepository extends JpaRepository<NoteComment, String> {
    List<NoteComment> findByNoteIdOrderByCreatedAtAsc(String noteId);

    /**
     * 一次加载当前页所有笔记的评论，避免在笔记循环中逐条查询（N+1）。
     * 按 noteId、createdAt 排序，保证分组后每篇笔记内部仍是时间正序。
     */
    @Query("""
            SELECT c FROM NoteComment c
            WHERE c.noteId IN :noteIds
            ORDER BY c.noteId ASC, c.createdAt ASC
            """)
    List<NoteComment> findByNoteIdInOrderByNoteIdAscCreatedAtAsc(
            @Param("noteIds") Collection<String> noteIds);

    long countByNoteId(String noteId);

    void deleteByNoteId(String noteId);
}
