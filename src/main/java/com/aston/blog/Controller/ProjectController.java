package com.aston.blog.Controller;

import com.aston.blog.Service.ProjectService;
import com.aston.blog.dto.CreateProjectDTO;
import com.aston.blog.vo.project.ProjectListVO;
import com.aston.blog.vo.project.ProjectVO;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.aston.blog.common.Result;

@RestController
@RequestMapping("/api")
public class ProjectController {

    private final AnalyticsController analyticsController;
    private final ProjectService service;

    public ProjectController(ProjectService service, AnalyticsController analyticsController) {
        this.service = service;
        this.analyticsController = analyticsController;
    }

    // 获取项目列表（公开）
    @GetMapping("/public/projects")
    public Result<ProjectListVO> getProjects(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return Result.success(service.getPublicProjects(page, limit));
    }

    // 获取单个项目（公开）
    @GetMapping("/public/projects/{id}")
    public Result<ProjectVO> getProject(@PathVariable String id) {
        return Result.success(service.getProject(id));
    }

    // 获取所有项目（管理员）
    @GetMapping("/projects")
    public Result<List<ProjectVO>> getAllProjects() {
        return Result.success(service.getAllProjects());
    }

    // 创建项目（管理员）
    @PostMapping("/projects")
    public Result<ProjectVO> create(@Valid @RequestBody CreateProjectDTO dto) {
        return Result.success(service.create(dto));
    }

    // 更新项目（管理员）
    @PutMapping("/projects/{id}")
    public Result<ProjectVO> update(@PathVariable String id, @Valid @RequestBody CreateProjectDTO dto) {
        return Result.success(service.update(id, dto));
    }

    // 删除项目（管理员）
    @DeleteMapping("/projects/{id}")
    public Result<?> delete(@PathVariable String id) {
        if (!isAdmin()) {
            return Result.error(403, "无权限");
        }
        service.delete(id);
        return Result.success(null);
    }

    private boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        }
        return false;
    }
}