package com.aston.blog.util;

import java.util.HashMap;
import java.util.Map;

/**
 * IP地址归属地查询工具
 * 生产环境建议使用MaxMind GeoIP2或IP2Region等开源库
 */
public class IpLocationUtil {
    
    @SuppressWarnings("unchecked")
    private static final Map ipCache = new HashMap();
    
    static {
        // 简单示例数据，生产环境应接入真实IP库
        initSampleData();
    }
    
    private static void initSampleData() {
        // 模拟一些IP段（实际应使用IP库）
    }
    
    public static IpInfo lookup(String ip) {
        if (ip == null || ip.isEmpty()) {
            return defaultInfo("未知", "未知", "未知");
        }
        
        // 本地回环和私有IP段
        if (ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
            return new IpInfo("本机", "", "本地", "本地网络");
        }
        
        // IPv6本地链接
        if (ip.startsWith("fe80:") || ip.startsWith("::1")) {
            return new IpInfo("本机", "", "本地", "本地网络");
        }
        
        // 简单的电信运营商判断（基于IP段，实际应使用IP库）
        // 这里只是示例，生产环境请使用MaxMind GeoLite2免费库
        return parseSimple(ip);
    }
    
    private static IpInfo parseSimple(String ip) {
        // 示例解析，仅供参考
        String firstOctet = ip.split("\\.")[0];
        
        if ("36".equals(firstOctet)) {
            // 电信
            return new IpInfo("中国", "广东", "广州", "中国电信");
        } else if ("14".equals(firstOctet)) {
            // 联通
            return new IpInfo("中国", "北京", "北京", "中国联通");
        } else if ("58".equals(firstOctet)) {
            // 移动
            return new IpInfo("中国", "上海", "上海", "中国移动");
        } else if ("116".equals(firstOctet)) {
            return new IpInfo("中国", "浙江", "杭州", "阿里云");
        } else if ("47".equals(firstOctet)) {
            return new IpInfo("中国", "广东", "深圳", "腾讯云");
        }
        
        // 未知返回默认值
        return new IpInfo("中国", "未知", "未知", "未知ISP");
    }
    
    private static IpInfo defaultInfo(String country, String province, String isp) {
        return new IpInfo(country, "", province, isp);
    }
    
    public static class IpInfo {
        private final String country;
        private final String province;
        private final String city;
        private final String isp;
        
        public IpInfo(String country, String province, String city, String isp) {
            this.country = country;
            this.province = province;
            this.city = city;
            this.isp = isp;
        }
        
        public String getCountry() { return country; }
        public String getProvince() { return province; }
        public String getCity() { return city; }
        public String getIsp() { return isp; }
    }
}