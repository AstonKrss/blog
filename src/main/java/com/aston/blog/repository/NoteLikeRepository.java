package com.aston.blog.repository;

import com.aston.blog.entity.NoteLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NoteLikeRepository extends JpaRepository<NoteLike, String> {
    Optional<NoteLike> findByNoteIdAndUserId(String noteId, String userId);

    List<NoteLike> findByUserId(String userId);

    /**
     * 只查询当前页笔记中该用户的点赞记录，避免把用户历史点赞全部加载出来。
     */
    @Query("""
            SELECT l FROM NoteLike l
            WHERE l.userId = :userId AND l.noteId IN :noteIds
            """)
    List<NoteLike> findByUserIdAndNoteIdIn(
            @Param("userId") String userId,
            @Param("noteIds") Collection<String> noteIds);

    void deleteByNoteId(String noteId);

    void deleteByNoteIdAndUserId(String noteId, String userId);
}
