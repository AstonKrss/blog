package com.aston.blog.Controller;

import com.aston.blog.common.Result;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/tools")
public class SecurityToolsController {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * ========== IP 信息查询 ==========
     * GET /api/tools/ip-info
     * 查询客户端 IP 地址信息（通过外部 API）
     */
    @GetMapping("/ip-info")
    public Result<?> getIpInfo(HttpServletRequest request) {
        try {
            // 获取客户端真实 IP
            String clientIp = getClientIp(request);
            
            // 调用外部 IP 查询 API
            String apiUrl = "http://ip-api.com/json/" + clientIp + "?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query";
            RestTemplate template = new RestTemplate();
            ResponseEntity<String> response = template.getForEntity(apiUrl, String.class);
            
            Map<String, Object> result = new HashMap<>();
            result.put("ip", clientIp);
            result.put("geo", response.getBody());
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "查询失败: " + e.getMessage());
        }
    }

    /**
     * ========== DNS 查询 ==========
     * GET /api/tools/dns?domain=example.com
     * 查询域名的 DNS 记录
     */
    @GetMapping("/dns")
    public Result<?> dnsQuery(@RequestParam String domain) {
        try {
            Map<String, Object> result = new HashMap<>();
            result.put("domain", domain);
            
            // A 记录
            try {
                var addresses = java.net.InetAddress.getAllByName(domain);
                List<String> aRecords = new ArrayList<>();
                for (var addr : addresses) {
                    aRecords.add(addr.getHostAddress());
                }
                result.put("A", aRecords);
            } catch (Exception e) {
                result.put("A", "查询失败");
            }
            
            // MX 记录 (需要 JNDI 或外部 API)
            result.put("MX", "需要后端 DNS 库支持");
            
            // NS 记录
            result.put("NS", "需要后端 DNS 库支持");
            
            // TXT 记录
            result.put("TXT", "需要后端 DNS 库支持");
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "DNS 查询失败: " + e.getMessage());
        }
    }

    /**
     * ========== Whois 查询 ==========
     * GET /api/tools/whois?domain=example.com
     * 查询域名的 Whois 信息
     */
    @GetMapping("/whois")
    public Result<?> whoisQuery(@RequestParam String domain) {
        try {
            // 使用外部 Whois API
            String cleanDomain = domain.replace("http://", "").replace("https://", "").split("/")[0];
            String apiUrl = "https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=YOUR_API_KEY&domainName=" + cleanDomain + "&outputFormat=json";
            
            // 简化实现 - 返回基本信息
            Map<String, Object> result = new HashMap<>();
            result.put("domain", cleanDomain);
            result.put("registrar", "需要配置 Whois API");
            result.put("creationDate", "需要配置 Whois API");
            result.put("expirationDate", "需要配置 Whois API");
            result.put("nameservers", List.of("需要配置 Whois API"));
            result.put("status", "需要配置 Whois API");
            
            // 实际使用可以使用 whois 包或外部 API
            // 这里提供一个模拟响应作为示例
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "Whois 查询失败: " + e.getMessage());
        }
    }

    /**
     * ========== 子域名枚举 ==========
     * GET /api/tools/subdomains?domain=example.com
     * 枚举子域名
     */
    @GetMapping("/subdomains")
    public Result<?> enumerateSubdomains(@RequestParam String domain) {
        try {
            // 常用子域名列表
            String[] commonPrefixes = {
                "www", "mail", "ftp", "admin", "blog", "dev", "test",
                "api", "app", "mobile", "cdn", "static", "assets",
                "img", "images", "video", "media", "files", "downloads",
                "docs", "documentation", "help", "support", "forum",
                "shop", "store", "pay", "payment", "billing",
                "secure", "login", "auth", "oauth", "sso",
                "db", "database", "mysql", "postgres", "mongo",
                "smtp", "pop", "imap", "mx", "ns", "dns",
                "vpn", "proxy", "gateway", "router",
                "gitlab", "github", "jenkins", "ci", "cd",
                "staging", "stage", "prod", "production",
                "demo", "sandbox", "beta", "alpha"
            };
            
            List<String> foundSubdomains = new ArrayList<>();
            
            // 这里可以集成 DNS 扫描服务或使用第三方 API
            // 示例: crt.sh, VirusTotal, Shodan 等
            
            Map<String, Object> result = new HashMap<>();
            result.put("domain", domain);
            result.put("subdomains", foundSubdomains);
            result.put("note", "需要集成外部 API (crt.sh, VirusTotal, Shodan) 才能进行真实扫描");
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "子域名枚举失败: " + e.getMessage());
        }
    }

    /**
     * ========== 端口扫描 ==========
     * GET /api/tools/port-scan?host=example.com&ports=80,443,22,3306
     * 扫描常用端口
     */
    @GetMapping("/port-scan")
    public Result<?> portScan(@RequestParam String host, @RequestParam(defaultValue = "80,443,22,21,25,53,110,143,3306,3389,5432,6379,8080,8443,27017") String ports) {
        try {
            String[] portList = ports.split(",");
            List<Map<String, Object>> results = new ArrayList<>();
            
            // 注意: 实际端口扫描需要目标授权，这里只是示例
            for (String portStr : portList) {
                try {
                    int port = Integer.parseInt(portStr.trim());
                    boolean isOpen = checkPort(host, port);
                    
                    Map<String, Object> portInfo = new HashMap<>();
                    portInfo.put("port", port);
                    portInfo.put("status", isOpen ? "open" : "closed");
                    portInfo.put("service", getCommonService(port));
                    results.add(portInfo);
                } catch (NumberFormatException e) {
                    // 跳过无效端口
                }
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("host", host);
            result.put("ports", results);
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "端口扫描失败: " + e.getMessage());
        }
    }

    /**
     * ========== HTTP 头信息查看 ==========
     * GET /api/tools/http-headers?url=https://example.com
     * 获取网站的 HTTP 响应头
     */
    @GetMapping("/http-headers")
    public Result<?> getHttpHeaders(@RequestParam String url) {
        try {
            RestTemplate template = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = template.exchange(
                url, HttpMethod.GET, entity, String.class
            );
            
            HttpHeaders responseHeaders = response.getHeaders();
            Map<String, Object> result = new HashMap<>();
            result.put("url", url);
            result.put("status", response.getStatusCode().value());
            result.put("headers", responseHeaders.toSingleValueMap());
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "获取 HTTP 头失败: " + e.getMessage());
        }
    }

    /**
     * ========== CORS 测试 ==========
     * GET /api/tools/cors-test?url=https://example.com&origin=https://evil.com
     * 测试目标站点的 CORS 配置
     */
    @GetMapping("/cors-test")
    public Result<?> corsTest(@RequestParam String url, @RequestParam(defaultValue = "https://evil.com") String origin) {
        try {
            RestTemplate template = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setOrigin(origin);
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            // 发送预检请求
            ResponseEntity<String> response = template.exchange(
                url, HttpMethod.OPTIONS, entity, String.class
            );
            
            HttpHeaders responseHeaders = response.getHeaders();
            
            Map<String, Object> result = new HashMap<>();
            result.put("testedUrl", url);
            result.put("testOrigin", origin);
            result.put("responseHeaders", responseHeaders.toSingleValueMap());
            
            // 分析 CORS 配置
            String accessControlAllowOrigin = responseHeaders.getFirst("Access-Control-Allow-Origin");
            String accessControlAllowMethods = responseHeaders.getFirst("Access-Control-Allow-Methods");
            String accessControlAllowCredentials = responseHeaders.getFirst("Access-Control-Allow-Credentials");
            
            Map<String, Object> analysis = new HashMap<>();
            analysis.put("allowsOrigin", accessControlAllowOrigin != null);
            analysis.put("allowsCredentials", "true".equalsIgnoreCase(accessControlAllowCredentials));
            analysis.put("isVulnerable", "*".equals(accessControlAllowOrigin) && "true".equalsIgnoreCase(accessControlAllowCredentials));
            analysis.put("riskLevel", analyzeCorsRisk(accessControlAllowOrigin, accessControlAllowCredentials));
            
            result.put("analysis", analysis);
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "CORS 测试失败: " + e.getMessage());
        }
    }

    /**
     * ========== CVE 漏洞查询 ==========
     * GET /api/tools/cve-search?keyword=log4j&limit=10
     * 搜索 CVE 漏洞信息
     */
    @GetMapping("/cve-search")
    public Result<?> cveSearch(@RequestParam String keyword, @RequestParam(defaultValue = "10") int limit) {
        try {
            // 使用 NVD API (美国国家漏洞数据库)
            String apiUrl = "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=" + keyword + "&resultsPerPage=" + limit;
            
            RestTemplate template = new RestTemplate();
            ResponseEntity<String> response = template.getForEntity(apiUrl, String.class);
            
            return Result.success(Map.of(
                "keyword", keyword,
                "count", limit,
                "apiUrl", apiUrl,
                "rawResponse", response.getBody(),
                "note", "建议使用专门的 CVE 查询前端解析 NVD API 响应"
            ));
        } catch (Exception e) {
            return Result.error(500, "CVE 查询失败: " + e.getMessage());
        }
    }

    /**
     * ========== 密码泄露检测 ==========
     * GET /api/tools/breach-check?email=user@example.com
     * 检查邮箱是否在密码泄露事件中出现 (使用 Have I Been Pwned API)
     */
    @GetMapping("/breach-check")
    public Result<?> breachCheck(@RequestParam String email) {
        try {
            // 注意: Have I Been Pwned API 需要付费或使用 k-Anonymity
            // 这里提供一个接口框架
            
            // k-Anonymity 实现示例 (SHA-1 哈希前 5 位)
            String sha1 = sha1Hash(email.toLowerCase());
            String prefix = sha1.substring(0, 5);
            String suffix = sha1.substring(5).toUpperCase();
            
            // 可以调用 HIBP API
            // https://api.pwnedpasswords.com/range/{first5HashChars}
            
            Map<String, Object> result = new HashMap<>();
            result.put("email", email);
            result.put("sha1Hash", sha1);
            result.put("kAnonymityPrefix", prefix);
            result.put("note", "使用 k-Anonymity: https://haveibeenpwned.com/api/v3/#PwnedPasswords");
            result.put("apiExample", "curl https://api.pwnedpasswords.com/range/" + prefix);
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(500, "密码泄露检测失败: " + e.getMessage());
        }
    }

    /**
     * ========== 辅助方法 ==========
     */
    
    // 获取客户端真实 IP
    private String getClientIp(HttpServletRequest request) {
        String[] headerNames = {
            "X-Forwarded-For",
            "X-Real-IP",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_X_CLUSTER_CLIENT_IP",
            "HTTP_CLIENT_IP",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "HTTP_VIA",
            "REMOTE_ADDR"
        };
        
        for (String header : headerNames) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    // 检查端口是否开放
    private boolean checkPort(String host, int port) {
        try (var socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress(host, port), 1000);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // 获取常见服务
    private String getCommonService(int port) {
        Map<Integer, String> services = Map.ofEntries(
            Map.entry(21, "FTP"),
            Map.entry(22, "SSH"),
            Map.entry(23, "Telnet"),
            Map.entry(25, "SMTP"),
            Map.entry(53, "DNS"),
            Map.entry(80, "HTTP"),
            Map.entry(110, "POP3"),
            Map.entry(143, "IMAP"),
            Map.entry(443, "HTTPS"),
            Map.entry(445, "SMB"),
            Map.entry(993, "IMAPS"),
            Map.entry(995, "POP3S"),
            Map.entry(3306, "MySQL"),
            Map.entry(3389, "RDP"),
            Map.entry(5432, "PostgreSQL"),
            Map.entry(6379, "Redis"),
            Map.entry(8080, "HTTP-Alt"),
            Map.entry(8443, "HTTPS-Alt"),
            Map.entry(27017, "MongoDB")
        );
        return services.getOrDefault(port, "Unknown");
    }

    // 分析 CORS 风险等级
    private String analyzeCorsRisk(String allowOrigin, String allowCredentials) {
        if (allowOrigin == null) return "LOW";
        if ("*".equals(allowOrigin) && "true".equalsIgnoreCase(allowCredentials)) {
            return "CRITICAL";
        }
        if ("*".equals(allowOrigin)) return "MEDIUM";
        return "LOW";
    }

    // 简单 SHA-1 哈希 (用于 HIBP k-Anonymity)
    private String sha1Hash(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-1");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString().toUpperCase();
        } catch (Exception e) {
            return "";
        }
    }
}
