package com.aston.blog.vo.post;

import com.aston.blog.vo.comment.PaginationVO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PostListVO {
    private List<PostSummaryVO> posts;
    private PaginationVO pagination;
}
