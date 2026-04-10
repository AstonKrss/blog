package com.aston.blog.vo.archive;

import com.aston.blog.vo.post.PostSummaryVO;
import lombok.Data;

import java.util.List;

@Data
public class ArchiveMonthVO {
    private Integer month;
    private Integer count;
    private List<PostSummaryVO> posts;
}