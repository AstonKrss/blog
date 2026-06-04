package com.aston.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class UpdatePostDto {

    @NotBlank(message = "文章标题不能为空")
    @Size(max = 255, message = "文章标题不能超过255个字符")
    private String title;

    @NotBlank(message = "slug不能为空")
    private String slug;

    @NotBlank(message = "文章内容不能为空")
    @Size(max = 20000, message = "文章内容不能超过20000个字符")
    private String content;

    @Size(max = 500, message = "摘要不能超过500个字符")
    private String excerpt;

    private String coverImage;
    private List<String> tags;
    private String status;
}
