package com.aston.blog.Service;

import com.aston.blog.entity.SiteSetting;

import java.util.List;
import java.util.Map;

public interface SiteSettingService {
    List<SiteSetting> getAllSettings();
    Map<String, String> getSettingsMap();
    void updateSettings(Map<String, String> settings);
    SiteSetting getSettingByKey(String key);
    void updateSetting(String key, String value);
}