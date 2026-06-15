package com.aston.blog.Service.impl;

import com.aston.blog.Service.FootprintService;
import com.aston.blog.entity.Footprint;
import com.aston.blog.repository.FootprintRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FootprintServiceImpl implements FootprintService {

    private final FootprintRepository repository;

    public FootprintServiceImpl(FootprintRepository repository) {
        this.repository = repository;
    }

    @Override
    @Cacheable(value = "publicFootprints", key = "#userId")
    public List<Footprint> getFootprintsByUserId(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    @CacheEvict(value = "publicFootprints", key = "#userId")
    public Footprint addFootprint(String userId, String province, String city, String description) {
        if (repository.existsByUserIdAndProvinceAndCity(userId, province, city)) {
            throw new RuntimeException("该足迹已存在");
        }
        Footprint footprint = new Footprint();
        footprint.setUserId(userId);
        footprint.setProvince(province);
        footprint.setCity(city);
        footprint.setDescription(description);
        return repository.save(footprint);
    }

    @Override
    @CacheEvict(value = "publicFootprints", allEntries = true)
    public void deleteFootprint(String id, String userId) {
        Footprint footprint = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("足迹不存在"));
        if (!footprint.getUserId().equals(userId)) {
            throw new RuntimeException("无权限删除");
        }
        repository.delete(footprint);
    }

    @Override
    @CacheEvict(value = "publicFootprints", key = "#userId")
    public Footprint updateDescription(String id, String userId, String description) {
        Footprint footprint = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("足迹不存在"));
        if (!footprint.getUserId().equals(userId)) {
            throw new RuntimeException("无权限修改");
        }
        footprint.setDescription(description);
        return repository.save(footprint);
    }

    @Override
    public List<Footprint> getAdminFootprints() {
        return repository.findAll();
    }
}