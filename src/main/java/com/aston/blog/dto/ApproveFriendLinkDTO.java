package com.aston.blog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApproveFriendLinkDTO {
    @NotBlank(message = "状态不能为空")
    private String status; // APPROVED 或 REJECTED
}