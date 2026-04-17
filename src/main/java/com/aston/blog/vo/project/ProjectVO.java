package com.aston.blog.vo.project;

import lombok.Data;

@Data
public class ProjectVO {
    private String id;
    private String name;
    private String description;
    private String url;
    private String demoUrl;
    private String coverImage;
    private String techStack;
    private Integer sortOrder;
    private Boolean featured;
    private String status;
    private String createdAt;
    private String updatedAt;
}