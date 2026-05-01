package com.aston.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GuestbookDTO {
    @NotBlank(message = "昵称不能为空")
    @Size(max = 50, message = "昵称最长50字符")
    private String nickname;

    @NotBlank(message = "留言内容不能为空")
    @Size(max = 1000, message = "留言内容最长1000字符")
    private String content;

    @Size(max = 100, message = "联系方式最长100字符")
    private String contact;
}