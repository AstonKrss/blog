package com.aston.blog.vo.terminal;

import lombok.Data;
import java.util.List;

@Data
public class FileEntryVO {
    private String name;
    private String type; // "file" or "directory"
    private String permissions; // "drwxr-xr-x" or "-rw-r--r--"
    private String owner;
    private String group;
    private long size;
    private String date;
    private String slug; // For files, the slug to use for reading
    private String status; // For posts: PUBLISHED, DRAFT
}
