package com.aston.blog.Service.impl;

import com.aston.blog.Service.TagService;
import com.aston.blog.entity.Tag;
import com.aston.blog.repository.TagRepository;
import com.aston.blog.vo.tag.TagVO;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;

    public TagServiceImpl(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Override
    public List<TagVO> getAllTags() {
        return tagRepository.findAll().stream()
                .map(this::convertToTagVO)
                .collect(Collectors.toList());
    }

    private TagVO convertToTagVO(Tag tag) {
        TagVO vo = new TagVO();
        vo.setId(tag.getId());
        vo.setName(tag.getName());
        vo.setSlug(tag.getSlug());
        vo.setDescription(tag.getDescription());
        return vo;
    }
}