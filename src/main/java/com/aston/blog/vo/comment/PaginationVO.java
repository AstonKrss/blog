package com.aston.blog.vo.comment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaginationVO {
    private Integer page;
    private Integer limit;  // 每页数量
    private Long total;     // 总文章数
    private Integer totalPages;  // 总页数
}
