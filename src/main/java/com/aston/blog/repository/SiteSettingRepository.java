package com.aston.blog.repository;

import com.aston.blog.entity.SiteSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SiteSettingRepository extends JpaRepository<SiteSetting, String> {

    Optional<SiteSetting> findBySettingKey(String settingKey);

    List<SiteSetting> findAllBySettingKeyIn(List<String> keys);
}