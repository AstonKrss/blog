package com.aston.blog.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class CommentQueryDTO extends PageQueryDTO {
    // 评论通常只需要分页，如果有“只看作者”等需求可以在这里加
    private Boolean onlyAuthor;
}
