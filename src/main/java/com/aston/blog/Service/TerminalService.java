package com.aston.blog.Service;

import com.aston.blog.vo.terminal.DirectoryListingVO;
import com.aston.blog.vo.terminal.FileContentVO;

public interface TerminalService {
    DirectoryListingVO listDirectory(String path);

    FileContentVO readFile(String path);

    FileContentVO saveFile(String path, String content, String userId);

    boolean canEdit(String userId);
}
