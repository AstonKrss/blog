package com.aston.blog.Service;

import com.aston.blog.entity.Footprint;
import java.util.List;

public interface FootprintService {
    List<Footprint> getFootprintsByUserId(String userId);
    Footprint addFootprint(String userId, String province, String city, String description);
    void deleteFootprint(String id, String userId);
    Footprint updateDescription(String id, String userId, String description);
    List<Footprint> getAdminFootprints();
}