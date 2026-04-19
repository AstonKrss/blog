package com.aston.blog.Controller;

import com.aston.blog.Service.SiteSettingService;
import com.aston.blog.common.Result;
import com.aston.blog.entity.SiteSetting;
import com.aston.blog.vo.settings.SettingsVO;
import jakarta.servlet.http.HttpServletRequest;
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
    public Result updateSettings(@RequestBody Map<String, Object> request, HttpServletRequest httpRequest) {
        String role = getUserRole(httpRequest);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        @SuppressWarnings("unchecked")
        Map<String, String> settings = (Map<String, String>) request.get("settings");
        if (settings != null) {
            siteSettingService.updateSettings(settings);
        }
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