package com.aston.blog.Controller;

import com.aston.blog.Service.FootprintService;
import com.aston.blog.common.Result;
import com.aston.blog.entity.Footprint;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FootprintController {

    private final FootprintService footprintService;

    public FootprintController(FootprintService footprintService) {
        this.footprintService = footprintService;
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return auth.getName();
    }

    @GetMapping("/public/footprints")
    public Result<List<Footprint>> getPublicFootprints() {
        List<Footprint> footprints = footprintService.getAdminFootprints();
        return Result.success(footprints);
    }

    @GetMapping("/footprints")
    public Result<List<Footprint>> getUserFootprints() {
        String userId = getCurrentUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        List<Footprint> footprints = footprintService.getFootprintsByUserId(userId);
        return Result.success(footprints);
    }

    @PostMapping("/footprints")
    public Result<Footprint> addFootprint(@RequestBody Map<String, String> request) {
        String userId = getCurrentUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        String province = request.get("province");
        String city = request.get("city");
        String description = request.get("description");
        
        if (province == null || province.isEmpty()) {
            return Result.error(400, "省份不能为空");
        }
        
        try {
            Footprint footprint = footprintService.addFootprint(userId, province, city, description);
            return Result.success(footprint);
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }

    @DeleteMapping("/footprints/{id}")
    public Result<?> deleteFootprint(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        try {
            footprintService.deleteFootprint(id, userId);
            return Result.success(null);
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PutMapping("/footprints/{id}")
    public Result<Footprint> updateFootprint(@PathVariable String id, @RequestBody Map<String, String> request) {
        String userId = getCurrentUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        String description = request.get("description");
        try {
            Footprint footprint = footprintService.updateDescription(id, userId, description);
            return Result.success(footprint);
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }
}