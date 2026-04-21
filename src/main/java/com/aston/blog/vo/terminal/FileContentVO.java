package com.aston.blog.vo.terminal;

import lombok.Data;

@Data
public class FileContentVO {
    private String path;
    private String name;
    private String content;
    private String type; // "markdown", "text"
    private boolean editable;
    private String postId; // If it's a post, the post ID for editing
    private String status; // For posts: PUBLISHED, DRAFT
}
