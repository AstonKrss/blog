package com.aston.blog.vo.settings;

import lombok.Data;

@Data
public class SettingsVO {
    private String settingKey;
    private String settingValue;
    
    public SettingsVO() {}
    
    public SettingsVO(String settingKey, String settingValue) {
        this.settingKey = settingKey;
        this.settingValue = settingValue;
    }
}