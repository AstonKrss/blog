package com.aston.blog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class PageQueryDTO {
    @Min(value = 1, message = "页码最小为 1")
    private Integer page = 1;
    @Min(value = 1, message = "每页数量最小为 1")
    @Max(value = 100, message = "每页数量最大为 100")
    private Integer pageSize = 10;
}
