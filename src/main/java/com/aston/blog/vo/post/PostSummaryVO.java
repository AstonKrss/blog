package com.aston.blog.vo.post;

import com.aston.blog.vo.auth.UserVO;
import com.aston.blog.vo.tag.TagVO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

//文章列表摘要
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PostSummaryVO {
    private String id;
    private String slug;
    private String title;
    private String excerpt;
    private String content;
    private String createdAt;
    private String coverImage;
    private String publishedAt;
    private Integer readingTime;
    private Long viewCount;
    private Long likeCount;
    private Long commentCount;
    private List<TagVO> tags;
    private UserVO author; // 简化版，只含 id, name, avatar
}
