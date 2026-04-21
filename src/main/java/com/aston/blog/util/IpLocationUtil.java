package com.aston.blog.util;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP地址归属地查询工具
 * 使用 ip-api.com 免费接口（需联网）
 * 限制：45请求/分钟，免费版无商业使用授权
 */
public class IpLocationUtil {
    
    private static final String API_URL = "http://ip-api.com/json/";
    private static final int TIMEOUT = 5000;
    
    // 简单缓存，避免重复查询
    private static final Map<String, IpInfo> cache = new ConcurrentHashMap<>();
    
    // 本地/私有IP映射
    private static final Map<String, IpInfo> LOCAL_IPS = new HashMap<>();
    
    static {
        // 模拟一些常见IP段
        LOCAL_IPS.put("本机", new IpInfo("本机", "", "本地", "本地网络"));
        LOCAL_IPS.put("局域网", new IpInfo("内网", "", "局域网", "本地网络"));
    }
    
    public static IpInfo lookup(String ip) {
        if (ip == null || ip.isEmpty()) {
            return new IpInfo("未知", "", "未知", "未知ISP");
        }
        
        // 本地回环和私有IP段
        if (ip.startsWith("127.") || ip.equals("localhost") || ip.equals("::1") || ip.equals("0:0:0:0:0:0:0:1")) {
            return new IpInfo("本机", "", "本地", "本地网络");
        }
        
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
            return new IpInfo("内网", "", "局域网", "本地网络");
        }
        
        // IPv6本地链接
        if (ip.startsWith("fe80:")) {
            return new IpInfo("本机", "", "本地", "本地网络");
        }
        
        // 腾讯云/阿里云等已知IP段
        if (ip.startsWith("47.") || ip.startsWith("119.")) {
            return new IpInfo("中国", "", "云服务器", "云服务商");
        }
        
        // 检查缓存
        IpInfo cached = cache.get(ip);
        if (cached != null) {
            return cached;
        }
        
        // 调用API查询
        try {
            IpInfo info = queryFromApi(ip);
            cache.put(ip, info);
            return info;
        } catch (Exception e) {
            // API失败时使用基于IP段的简单判断
            return parseFallback(ip);
        }
    }
    
    private static IpInfo queryFromApi(String ip) throws Exception {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(API_URL + ip);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(TIMEOUT);
            conn.setReadTimeout(TIMEOUT);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0");
            
            int responseCode = conn.getResponseCode();
            if (responseCode == 200) {
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    return parseApiResponse(response.toString());
                }
            }
            throw new Exception("API返回错误码: " + responseCode);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
    
    @SuppressWarnings("unchecked")
    private static IpInfo parseApiResponse(String json) {
        try {
            // 简单的JSON解析（避免引入JSON库）
            // {"status":"success","country":"China","regionName":"Guangdong","city":"Shenzhen","isp":"China Telecom"}
            
            String status = extractJsonValue(json, "status");
            if (!"success".equals(status)) {
                return new IpInfo("未知", "", "未知", "未知ISP");
            }
            
            String country = extractJsonValue(json, "country");
            String region = extractJsonValue(json, "regionName");
            String city = extractJsonValue(json, "city");
            String isp = extractJsonValue(json, "isp");
            
            // 简化显示
            String displayCountry = "中国".equals(country) ? "中国" : country;
            String displayIsp = simplifyIsp(isp);
            
            return new IpInfo(displayCountry, region, city, displayIsp);
        } catch (Exception e) {
            return new IpInfo("未知", "", "未知", "未知ISP");
        }
    }
    
    private static String extractJsonValue(String json, String key) {
        String searchKey = "\"" + key + "\"";
        int keyIndex = json.indexOf(searchKey);
        if (keyIndex == -1) return "";
        
        int colonIndex = json.indexOf(":", keyIndex);
        if (colonIndex == -1) return "";
        
        int valueStart = colonIndex + 1;
        // 跳过空白
        while (valueStart < json.length() && json.charAt(valueStart) == ' ') {
            valueStart++;
        }
        
        if (valueStart >= json.length()) return "";
        
        char firstChar = json.charAt(valueStart);
        if (firstChar == '"') {
            // 字符串值
            int valueEnd = json.indexOf("\"", valueStart + 1);
            return json.substring(valueStart + 1, valueEnd);
        } else {
            // 数字或其他值
            int valueEnd = valueStart;
            while (valueEnd < json.length() && json.charAt(valueEnd) != ',' && json.charAt(valueEnd) != '}') {
                valueEnd++;
            }
            return json.substring(valueStart, valueEnd).trim();
        }
    }
    
    private static String simplifyIsp(String isp) {
        if (isp == null || isp.isEmpty()) return "未知ISP";
        
        isp = isp.toLowerCase();
        
        if (isp.contains("china telecom") || isp.contains("电信")) {
            return "中国电信";
        } else if (isp.contains("china mobile") || isp.contains("中国移动")) {
            return "中国移动";
        } else if (isp.contains("china unicom") || isp.contains("中国联通")) {
            return "中国联通";
        } else if (isp.contains("tencent") || isp.contains("腾讯")) {
            return "腾讯云";
        } else if (isp.contains("alibaba") || isp.contains("aliyun") || isp.contains("阿里")) {
            return "阿里云";
        } else if (isp.contains("baidu")) {
            return "百度云";
        } else if (isp.contains("huawei")) {
            return "华为云";
        } else if (isp.contains("amazon") || isp.contains("aws")) {
            return "AWS";
        } else if (isp.contains("google")) {
            return "Google Cloud";
        } else if (isp.contains("microsoft") || isp.contains("azure")) {
            return "Azure";
        } else if (isp.contains("idc") || isp.contains("host") || isp.contains("vps")) {
            return "IDC/托管";
        } else if (isp.contains("education") || isp.contains("校园网")) {
            return "校园网";
        } else if (isp.contains("broadcast") || isp.contains("broadband")) {
            return "宽带";
        }
        
        // 返回简化后的ISP名称（取第一个词）
        String[] parts = isp.split("[\\s,]+");
        if (parts.length > 0 && !parts[0].isEmpty()) {
            return capitalizeFirst(parts[0]);
        }
        
        return "其他";
    }
    
    private static String capitalizeFirst(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
    
    private static IpInfo parseFallback(String ip) {
        // 无法查询时使用默认
        return new IpInfo("未知", "", "未知", "未知ISP");
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
