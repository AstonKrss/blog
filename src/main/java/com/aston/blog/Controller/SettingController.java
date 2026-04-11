package com.aston.blog.Controller;

import com.aston.blog.Service.SiteSettingService;
import com.aston.blog.common.Result;
import com.aston.blog.entity.SiteSetting;
import com.aston.blog.vo.settings.SettingsVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    @Autowired
    private SiteSettingService siteSettingService;

    @GetMapping
    public Result getSettings() {
        List<SiteSetting> list = siteSettingService.getAllSettings();
        List<SettingsVO> settingsList = new ArrayList<>();
        
        for (SiteSetting s : list) {
            SettingsVO vo = new SettingsVO(s.getSettingKey(), s.getSettingValue());
            settingsList.add(vo);
        }
        
        Map<String, Object> data = new HashMap<>();
        data.put("settings", settingsList);
        return Result.success(data);
    }

    @PutMapping
    public Result updateSettings(@RequestBody Map<String, Object> request) {
        @SuppressWarnings("unchecked")
        Map<String, String> settings = (Map<String, String>) request.get("settings");
        if (settings != null) {
            siteSettingService.updateSettings(settings);
        }
        return Result.success(null);
    }
}