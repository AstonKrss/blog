package com.aston.blog.vo.post;

import java.util.*;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SearchResultVO {
    private List<PostSummaryVO> posts;
    private Long total;
}
