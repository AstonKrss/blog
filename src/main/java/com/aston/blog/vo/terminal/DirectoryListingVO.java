package com.aston.blog.vo.terminal;

import lombok.Data;
import java.util.List;

@Data
public class DirectoryListingVO {
    private String path;
    private List<FileEntryVO> entries;
}
