package com.aston.blog.vo.stats;

import lombok.Data;

@Data
public class StatsVO {
    private Long totalPosts;
    private Long totalTags;
    private Long totalComments;
}