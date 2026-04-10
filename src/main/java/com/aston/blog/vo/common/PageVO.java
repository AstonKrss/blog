package com.aston.blog.vo.common;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PageVO<T> {
    private List<T> list;
    private long total;
    private Integer page;
    private Integer pageSize;
    private Integer totalPage;

}
