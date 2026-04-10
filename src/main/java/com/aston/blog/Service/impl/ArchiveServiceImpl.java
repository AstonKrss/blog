package com.aston.blog.Service.impl;

import com.aston.blog.repository.AuchiveRepository;
import com.aston.blog.vo.archive.ArchiveYearVO;
import com.aston.blog.vo.archive.ArchiveMonthVO;
import com.aston.blog.vo.post.PostSummaryVO;
import com.aston.blog.Service.ArchiveService;
import com.aston.blog.entity.Post;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ArchiveServiceImpl implements ArchiveService {

    private final AuchiveRepository auchiveRepository;

    public ArchiveServiceImpl(AuchiveRepository auchiveRepository) {
        this.auchiveRepository = auchiveRepository;
    }

    @Override
    public List<ArchiveYearVO> getArchive() {
    // 1. 获取所有已发布的文章
    List<Post> posts = auchiveRepository.findAllPublished();
    
    // 2. 创建一个"年份->月份->文章列表"的容器
    Map<Integer, Map<Integer, List<Post>>> yearMap = new TreeMap<>();
    
    // 3. 遍历每篇文章，放到对应年份月份里
    for (Post post : posts) {
        int year = post.getPublishedAt().getYear();      // 获取年份
        int month = post.getPublishedAt().getMonthValue(); // 获取月份
        
        // 如果这个年份还没有，创建它
        if (!yearMap.containsKey(year)) {
            yearMap.put(year, new TreeMap<>());
        }
        
        // 如果这个月份还没有，创建它
        Map<Integer, List<Post>> monthMap = yearMap.get(year);
        if (!monthMap.containsKey(month)) {
            monthMap.put(month, new ArrayList<>());
        }
        
        // 把文章放到对应月份
        monthMap.get(month).add(post);
    }
    
    // 4. 把数据转换成 VO 格式返回
    List<ArchiveYearVO> result = new ArrayList<>();
    
    for (Integer year : yearMap.keySet()) {
        ArchiveYearVO yearVO = new ArchiveYearVO();
        yearVO.setYear(year);
        
        List<ArchiveMonthVO> months = new ArrayList<>();
        Map<Integer, List<Post>> monthMap = yearMap.get(year);
        
        for (Integer month : monthMap.keySet()) {
            ArchiveMonthVO monthVO = new ArchiveMonthVO();
            monthVO.setMonth(month);
            monthVO.setCount(monthMap.get(month).size());
            monthVO.setPosts(convertToPostSummaryVOList(monthMap.get(month)));
            months.add(monthVO);
        }
        
        yearVO.setMonths(months);
        result.add(yearVO);
    }
    
    return result;
}

    private PostSummaryVO convertToPostSummaryVO(Post post) {
        PostSummaryVO vo = new PostSummaryVO();
        vo.setId(post.getId());
        vo.setSlug(post.getSlug());
        vo.setTitle(post.getTitle());
        vo.setExcerpt(post.getExcerpt());
        vo.setCoverImage(post.getCoverImage());
        vo.setPublishedAt(post.getPublishedAt() != null ? post.getPublishedAt().toString() : null);
        vo.setViewCount(Long.valueOf(post.getViewCount()));
        vo.setCommentCount(Long.valueOf(post.getCommentCount()));
        return vo;
    }

    private List<PostSummaryVO> convertToPostSummaryVOList(List<Post> posts) {
        List<PostSummaryVO> list = new ArrayList<>();
        for (Post post : posts) {
            list.add(convertToPostSummaryVO(post));
        }
        return list;
    }
}
