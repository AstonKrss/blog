package com.aston.blog.repository;

import com.aston.blog.entity.Project;
import com.aston.blog.entity.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByStatusOrderBySortOrderAsc(ProjectStatus status);

    List<Project> findAllByOrderBySortOrderAsc();
}