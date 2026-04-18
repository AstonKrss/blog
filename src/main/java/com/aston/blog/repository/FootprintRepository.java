package com.aston.blog.repository;

import com.aston.blog.entity.Footprint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FootprintRepository extends JpaRepository<Footprint, String> {
    List<Footprint> findByUserId(String userId);
    List<Footprint> findByUserIdOrderByCreatedAtDesc(String userId);
    boolean existsByUserIdAndProvinceAndCity(String userId, String province, String city);
}