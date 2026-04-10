package com.aston.blog.vo.archive;

import lombok.Data;

@Data
public class ArchivePostVO {
    private String id;
    private String slug;
    private String title;
    private String publishedAt;
}
