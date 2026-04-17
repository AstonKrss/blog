package com.aston.blog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApplyFriendLinkDTO {
    @NotBlank(message = "名称不能为空")
    private String name;
    @NotBlank(message = "链接不能为空")
    private String url;
    private String description;
    private String avatar;
    private String email;
}
