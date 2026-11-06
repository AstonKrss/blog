package com.aston.blog.Service.impl;

import com.aston.blog.Service.TagService;
import com.aston.blog.entity.Tag;
import com.aston.blog.repository.TagRepository;
import com.aston.blog.vo.tag.TagVO;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;

    public TagServiceImpl(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Override
    @Cacheable(value = "tags")
    public List<TagVO> getAllTags() {
        // 一次 GROUP BY 拿到所有标签的计数，避免 500 个标签产生 500 次 count 查询。
        Map<String, Long> counts = tagRepository.countPostsGroupByTag().stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).longValue()));
        return tagRepository.findAll().stream()
                .map(tag -> {
                    TagVO vo = new TagVO();
                    vo.setId(tag.getId());
                    vo.setName(tag.getName());
                    vo.setSlug(tag.getSlug());
                    vo.setDescription(tag.getDescription());
                    vo.setPostCount(counts.getOrDefault(tag.getId(), 0L));
                    return vo;
                })
                .collect(Collectors.toList());
    }
}