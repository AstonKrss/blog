package com.aston.blog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateProjectDTO {
    @NotBlank(message = "项目名称不能为空")
    private String name;
    
    private String description;
    private String url;
    private String demoUrl;
    private String coverImage;
    private String techStack;
    private Integer sortOrder;
    private Boolean featured;
    private String status;
}