package com.aston.blog.Service;

import com.aston.blog.dto.CreateProjectDTO;
import com.aston.blog.vo.project.ProjectListVO;
import com.aston.blog.vo.project.ProjectVO;
import java.util.List;

public interface ProjectService {
    ProjectListVO getPublicProjects(int page, int limit);

    ProjectVO getProject(String id);

    ProjectVO create(CreateProjectDTO dto);

    ProjectVO update(String id, CreateProjectDTO dto);

    void delete(String id);

    List<ProjectVO> getAllProjects();
}