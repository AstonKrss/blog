package com.aston.blog.vo.photo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PhotoVO {
    private String id;
    private String filename;
    private String description;
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
