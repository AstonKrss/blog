package com.aston.blog.Service;

import com.aston.blog.vo.tag.TagVO;

import java.util.List;

public interface TagService {
    List<TagVO> getAllTags();
}