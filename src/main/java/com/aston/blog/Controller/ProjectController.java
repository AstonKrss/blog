package com.aston.blog.Controller;

import com.aston.blog.Service.ProjectService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.CreateProjectDTO;
import com.aston.blog.vo.project.ProjectListVO;
import com.aston.blog.vo.project.ProjectVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping("/public/projects")
    public Result<ProjectListVO> getProjects(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return Result.success(service.getPublicProjects(page, limit));
    }

    @GetMapping("/public/projects/{id}")
    public Result<ProjectVO> getProject(@PathVariable String id) {
        return Result.success(service.getProject(id));
    }

    @GetMapping("/projects")
    public Result<List<ProjectVO>> getAllProjects() {
        return Result.success(service.getAllProjects());
    }

    @PostMapping("/projects")
    public Result<ProjectVO> create(@Valid @RequestBody CreateProjectDTO dto) {
        return Result.success(service.create(dto));
    }

    @PutMapping("/projects/{id}")
    public Result<ProjectVO> update(@PathVariable String id, @Valid @RequestBody CreateProjectDTO dto) {
        return Result.success(service.update(id, dto));
    }

    @DeleteMapping("/projects/{id}")
    public Result<?> delete(@PathVariable String id) {
        service.delete(id);
        return Result.success(null);
    }
}