package com.aston.blog.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true) // 继承 PageQueryDTO 的字段
public class PostQueryDTO extends PageQueryDTO {

    // 按标签筛选 (传 slug)
    private String tag;

    // 关键词搜索 (标题)
    private String keyword;

    // 按年份筛选 (归档页可能会用到)
    private Integer year;

    // 状态筛选 (仅管理员/作者用)
    private String status;
}