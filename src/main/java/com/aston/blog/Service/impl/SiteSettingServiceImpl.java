package com.aston.blog.Service.impl;

import com.aston.blog.Service.SiteSettingService;
import com.aston.blog.entity.SiteSetting;
import com.aston.blog.repository.SiteSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SiteSettingServiceImpl implements SiteSettingService {

    @Autowired
    private SiteSettingRepository siteSettingRepository;

    @Override
    @Cacheable(value = "siteSettings")
    public List<SiteSetting> getAllSettings() {
        return siteSettingRepository.findAll();
    }

    @Override
    @Cacheable(value = "siteSettings")
    public Map<String, String> getSettingsMap() {
        List<SiteSetting> settings = siteSettingRepository.findAll();
        Map<String, String> map = new HashMap<>();
        for (SiteSetting setting : settings) {
            map.put(setting.getSettingKey(), setting.getSettingValue());
        }
        return map;
    }

    @Override
    @Transactional
    @CacheEvict(value = "siteSettings", allEntries = true)
    public void updateSettings(Map<String, String> settings) {
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            updateSetting(entry.getKey(), entry.getValue());
        }
    }

    @Override
    @Cacheable(value = "siteSettings", key = "#key")
    public SiteSetting getSettingByKey(String key) {
        return siteSettingRepository.findBySettingKey(key).orElse(null);
    }

    @Override
    @Transactional
    @CacheEvict(value = "siteSettings", allEntries = true)
    public void updateSetting(String key, String value) {
        Optional<SiteSetting> existing = siteSettingRepository.findBySettingKey(key);
        if (existing.isPresent()) {
            SiteSetting setting = existing.get();
            setting.setSettingValue(value);
            siteSettingRepository.save(setting);
        } else {
            SiteSetting setting = new SiteSetting();
            setting.setSettingKey(key);
            setting.setSettingValue(value);
            siteSettingRepository.save(setting);
        }
    }
}