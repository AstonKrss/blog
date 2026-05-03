package com.aston.blog.entity;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Data
public class NoteCommentVO {
    private String id;
    private String content;
    private String authorName;
    private String authorAvatar;
    private String userId;
    private LocalDateTime createdAt;
    private List<NoteCommentVO> children = new ArrayList<>();
}