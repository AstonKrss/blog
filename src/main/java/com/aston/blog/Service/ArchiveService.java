package com.aston.blog.Service;

import com.aston.blog.vo.archive.ArchiveYearVO;
import java.util.List;

public interface ArchiveService {
    List<ArchiveYearVO> getArchive();
}
