package com.aston.blog.vo.post;

import com.aston.blog.vo.auth.UserVO;
import com.aston.blog.vo.tag.TagVO;
import lombok.Data;

import java.util.List;

@Data
public class PostDetailVO {
    private String id;
    private String slug;
    private String title;
    private String excerpt;
    private String content;
    private String contentHtml;
    private String coverImage;
    private String status;
    private String publishedAt;
    private String updatedAt;
    private Integer readingTime;
    private Long viewCount;
    private Long commentCount;
    private List<TagVO> tags;
    private UserVO author;

    private PostSummaryVO prevPost;
    private PostSummaryVO nextPost;
}
