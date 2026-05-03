package com.aston.blog.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "note_comments")
public class NoteComment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "note_id")
    private String noteId;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "parent_id")
    private String parentId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}