package com.aston.blog.vo.archive;

import com.aston.blog.vo.post.PostSummaryVO;
import lombok.Data;

import java.util.List;

@Data
public class ArchiveYearVO {
    private Integer year;
    private List<ArchiveMonthVO> months;
}