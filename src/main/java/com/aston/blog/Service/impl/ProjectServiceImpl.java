package com.aston.blog.Service.impl;

import com.aston.blog.Service.ProjectService;
import com.aston.blog.dto.CreateProjectDTO;
import com.aston.blog.entity.Project;
import com.aston.blog.entity.ProjectStatus;
import com.aston.blog.repository.ProjectRepository;
import com.aston.blog.vo.project.ProjectListVO;
import com.aston.blog.vo.project.ProjectVO;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository repository;

    public ProjectServiceImpl(ProjectRepository repository) {
        this.repository = repository;
    }

    @Override
    @Cacheable(value = "publicProjects", key = "'p:' + #page + ':l:' + #limit")
    public ProjectListVO getPublicProjects(int page, int limit) {
        List<Project> list = repository.findByStatusOrderBySortOrderAsc(ProjectStatus.PUBLISHED);
        
        int start = (page - 1) * limit;
        int end = Math.min(start + limit, list.size());
        List<Project> pageList = start < list.size() ? list.subList(start, end) : new ArrayList<>();
        
        List<ProjectVO> voList = pageList.stream().map(this::toVO).collect(Collectors.toList());
        
        ProjectListVO result = new ProjectListVO();
        result.setProjects(voList);
        return result;
    }

    @Override
    @Cacheable(value = "project", key = "#id")
    public ProjectVO getProject(String id) {
        Project project = repository.findById(id).orElseThrow(() -> new RuntimeException("项目不存在"));
        return toVO(project);
    }

    @Override
    @CacheEvict(value = "publicProjects", allEntries = true)
    public ProjectVO create(CreateProjectDTO dto) {
        Project project = new Project();
        project.setName(dto.getName());
        project.setDescription(dto.getDescription());
        project.setUrl(dto.getUrl());
        project.setDemoUrl(dto.getDemoUrl());
        project.setCoverImage(dto.getCoverImage());
        project.setTechStack(dto.getTechStack());
        project.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        project.setFeatured(dto.getFeatured() != null ? dto.getFeatured() : false);
        project.setStatus(dto.getStatus() != null ? ProjectStatus.valueOf(dto.getStatus()) : ProjectStatus.DRAFT);
        
        return toVO(repository.save(project));
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "project", key = "#id"),
        @CacheEvict(value = "publicProjects", allEntries = true)
    })
    public ProjectVO update(String id, CreateProjectDTO dto) {
        Project project = repository.findById(id).orElseThrow(() -> new RuntimeException("项目不存在"));
        project.setName(dto.getName());
        project.setDescription(dto.getDescription());
        project.setUrl(dto.getUrl());
        project.setDemoUrl(dto.getDemoUrl());
        project.setCoverImage(dto.getCoverImage());
        project.setTechStack(dto.getTechStack());
        project.setSortOrder(dto.getSortOrder());
        project.setFeatured(dto.getFeatured());
        if (dto.getStatus() != null) {
            project.setStatus(ProjectStatus.valueOf(dto.getStatus()));
        }
        
        return toVO(repository.save(project));
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "project", key = "#id"),
        @CacheEvict(value = "publicProjects", allEntries = true)
    })
    public void delete(String id) {
        repository.deleteById(id);
    }

    @Override
    public List<ProjectVO> getAllProjects() {
        return repository.findAllByOrderBySortOrderAsc().stream()
            .map(this::toVO)
            .collect(Collectors.toList());
    }

    private ProjectVO toVO(Project p) {
        ProjectVO vo = new ProjectVO();
        vo.setId(p.getId());
        vo.setName(p.getName());
        vo.setDescription(p.getDescription());
        vo.setUrl(p.getUrl());
        vo.setDemoUrl(p.getDemoUrl());
        vo.setCoverImage(p.getCoverImage());
        vo.setTechStack(p.getTechStack());
        vo.setSortOrder(p.getSortOrder());
        vo.setFeatured(p.getFeatured());
        vo.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
        vo.setCreatedAt(p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        vo.setUpdatedAt(p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : null);
        return vo;
    }
}