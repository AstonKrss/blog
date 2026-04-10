package com.aston.blog.vo.tag;

import lombok.Data;

@Data
public class TagVO {
    private String id;
    private String name;
    private String slug;
    private String description;
    private Long postCount; // 该标签下的文章数
}
