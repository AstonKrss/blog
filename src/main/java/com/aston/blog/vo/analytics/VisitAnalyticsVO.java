package com.aston.blog.vo.analytics;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class VisitAnalyticsVO {
    private long totalVisits;
    private long uniqueIps;
    @SuppressWarnings("unchecked")
    private List topCountries;
    @SuppressWarnings("unchecked")
    private List topProvinces;
    @SuppressWarnings("unchecked")
    private List topIsps;
    @SuppressWarnings("unchecked")
    private List hourlyDistribution;
    @SuppressWarnings("unchecked")
    private List topPages;
    @SuppressWarnings("unchecked")
    private List topIps;
}