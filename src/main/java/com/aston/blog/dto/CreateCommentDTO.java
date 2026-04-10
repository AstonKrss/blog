package com.aston.blog.dto;

import jakarta.persistence.Entity;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCommentDTO {
    @NotBlank(message = "评论内容不能为空")
    @Size(max = 2000, message = "评论太长")
    private String content;
    @NotBlank(message = "昵称不能为空")
    private String authorName;
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式错误")
    private String authorEmail;
    private String authorUrl;

    private String parentId; // 回复某条评论时填这个 ID
}
