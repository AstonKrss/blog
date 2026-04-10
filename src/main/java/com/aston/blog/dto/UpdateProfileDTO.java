package com.aston.blog.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileDTO {
    @Size(max = 50, message = "昵称过长（不要sql注入我）")
    private String displayName;
    private String avatarUrl;
    @Size(max = 500, message = "简介不能超过 500 字")
    private String bio;
}
