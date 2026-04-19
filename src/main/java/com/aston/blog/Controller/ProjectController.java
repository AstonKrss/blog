package com.aston.blog.Controller;

import com.aston.blog.Service.ProjectService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.CreateProjectDTO;
import com.aston.blog.vo.project.ProjectListVO;
import com.aston.blog.vo.project.ProjectVO;
import jakarta.servlet.http.HttpServletRequest;
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
    public Result<List<ProjectVO>> getAllProjects(HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role) && !"AUTHOR".equals(role)) {
            return Result.error(403, "无权限");
        }
        return Result.success(service.getAllProjects());
    }

    @PostMapping("/projects")
    public Result<ProjectVO> create(@Valid @RequestBody CreateProjectDTO dto, HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role) && !"AUTHOR".equals(role)) {
            return Result.error(403, "无权限");
        }
        return Result.success(service.create(dto));
    }

    @PutMapping("/projects/{id}")
    public Result<ProjectVO> update(@PathVariable String id, @Valid @RequestBody CreateProjectDTO dto, HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        return Result.success(service.update(id, dto));
    }

    @DeleteMapping("/projects/{id}")
    public Result<?> delete(@PathVariable String id, HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        service.delete(id);
        return Result.success(null);
    }

    private String getUserRole(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getAuthorities() != null) {
                return auth.getAuthorities().stream()
                        .filter(a -> a.getAuthority().startsWith("ROLE_"))
                        .map(a -> a.getAuthority().substring(5))
                        .findFirst()
                        .orElse(null);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}