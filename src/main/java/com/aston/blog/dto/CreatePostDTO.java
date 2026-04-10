package com.aston.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreatePostDTO {

    @NotBlank(message = "标题不能为空")
    @Size(max = 255, message = "标题长度不能超过255个字符")
    private String title;

    @NotBlank(message = "slug不能为空")
    private String slug;

    @NotBlank(message = "内容不能为空")
    private String content;

    @Size(max = 500, message = "摘要长度不能超过500个字符")
    private String excerpt;

    private String coverImage;

    private List<String> tags; // 前端传标签名称数组 ["Java", "Spring"]
    // DRAFT 或 PUBLISHED
    private String status = "DRAFT";
}
