package com.aston.blog.vo.comment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
//评论
public class CommentVO {
    private String id;
    private String content;
    private String authorName;
    private String authorUrl;
    private String createdAt;
    private Long likeCount;
    private List<CommentVO> replies; // 嵌套回复
}
