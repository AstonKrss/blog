package com.aston.blog.dto;

import lombok.Data;
import jakarta.validation.constraints.Size;
import java.util.List;

@Data
public class CreateNoteDTO {
    @Size(max = 10000, message = "内容不能超过10000字")
    private String content;

    private List<String> imageUrls;

    private String videoUrl;
}