# 安全工具 API 文档

## 概述

本文档描述博客安全工具箱的后端 API 接口。

## 基础信息

- **Base URL**: `http://localhost:8080/api/tools`
- **认证**: 无需认证（公开接口）
- **响应格式**: JSON

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

---

## 工具列表

### 前端工具（纯浏览器实现）

| 工具 | 说明 | 实现方式 |
|------|------|----------|
| Base64 | 编码/解码 | `btoa()` / `atob()` |
| URL 编码 | URL 编码/解码 | `encodeURIComponent()` |
| HTML 实体 | HTML 实体编码/解码 | DOM API |
| Unicode | Unicode 互转 | `JSON.stringify/parse` |
| Hex | 十六进制转换 | `TextEncoder` |
| 二进制 | 二进制转换 | `TextEncoder` |
| ROT13 | 凯撒密码 | 字符替换 |
| SHA-256/512 | 哈希计算 | Web Crypto API |
| 密码生成器 | 随机密码 | `crypto.getRandomValues()` |
| JWT 解析器 | 解析 JWT | Base64 解码 |
| 正则测试器 | 实时匹配 | JavaScript RegExp |
| JSON 格式化 | 格式化/压缩 | `JSON.parse/stringify` |
| 时间戳转换 | Unix 时间戳互转 | `Date` 对象 |
| UUID 生成 | UUID v4 | `crypto.randomUUID()` |
| 文件哈希 | MD5/SHA 哈希 | `crypto.subtle.digest()` |
| QR 二维码 | 生成二维码 | 第三方 API |

---

## 后端 API 接口

### 1. IP 信息查询

```
GET /api/tools/ip-info
```

查询客户端 IP 地址的地理信息。

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "ip": "123.456.78.90",
    "geo": "{\"status\":\"success\",\"country\":\"China\",...}"
  }
}
```

---

### 2. DNS 查询

```
GET /api/tools/dns?domain=example.com
```

查询域名的 DNS 记录。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domain | string | 是 | 要查询的域名 |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "domain": "example.com",
    "A": ["93.184.216.34"],
    "MX": "需要后端 DNS 库支持",
    "NS": "需要后端 DNS 库支持",
    "TXT": "需要后端 DNS 库支持"
  }
}
```

---

### 3. Whois 查询

```
GET /api/tools/whois?domain=example.com
```

查询域名的 Whois 信息。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domain | string | 是 | 要查询的域名 |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "domain": "example.com",
    "registrar": "需要配置 Whois API",
    "creationDate": "需要配置 Whois API",
    "expirationDate": "需要配置 Whois API"
  }
}
```

> **注意**: 需要配置 Whois API (如 whoisxmlapi.com) 才能获取完整信息。

---

### 4. 子域名枚举

```
GET /api/tools/subdomains?domain=example.com
```

枚举域名的子域名。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domain | string | 是 | 根域名 |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "domain": "example.com",
    "subdomains": [],
    "note": "需要集成外部 API (crt.sh, VirusTotal, Shodan) 才能进行真实扫描"
  }
}
```

> **注意**: 需要集成 crt.sh、VirusTotal 或 Shodan API。

---

### 5. 端口扫描

```
GET /api/tools/port-scan?host=example.com&ports=80,443,22,3306
```

扫描主机的端口状态。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| host | string | 是 | 目标主机 |
| ports | string | 否 | 端口列表，逗号分隔，默认 80,443,22,21,25,53,110,143,3306,3389,5432,6379,8080,8443,27017 |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "host": "example.com",
    "ports": [
      {"port": 80, "status": "open", "service": "HTTP"},
      {"port": 443, "status": "open", "service": "HTTPS"},
      {"port": 22, "status": "closed", "service": "SSH"}
    ]
  }
}
```

---

### 6. HTTP 头信息

```
GET /api/tools/http-headers?url=https://example.com
```

获取网站的 HTTP 响应头。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 目标 URL |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "url": "https://example.com",
    "status": 200,
    "headers": {
      "Content-Type": "text/html",
      "Server": "nginx/1.18.0"
    }
  }
}
```

---

### 7. CORS 测试

```
GET /api/tools/cors-test?url=https://example.com&origin=https://evil.com
```

测试目标站点的 CORS 配置安全性。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 目标 URL |
| origin | string | 否 | 测试来源，默认 `https://evil.com` |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "testedUrl": "https://example.com",
    "testOrigin": "https://evil.com",
    "responseHeaders": {
      "Access-Control-Allow-Origin": "https://evil.com",
      "Access-Control-Allow-Credentials": "true"
    },
    "analysis": {
      "allowsOrigin": true,
      "allowsCredentials": true,
      "isVulnerable": false,
      "riskLevel": "LOW"
    }
  }
}
```

**风险等级说明:**
| 等级 | 说明 |
|------|------|
| CRITICAL | `Access-Control-Allow-Origin: *` 且 `Access-Control-Allow-Credentials: true` |
| MEDIUM | `Access-Control-Allow-Origin: *` |
| LOW | 正常配置 |

---

### 8. CVE 漏洞查询

```
GET /api/tools/cve-search?keyword=log4j&limit=10
```

搜索 CVE 漏洞信息。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| limit | int | 否 | 返回数量，默认 10 |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "keyword": "log4j",
    "count": 10,
    "apiUrl": "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=log4j&resultsPerPage=10",
    "rawResponse": "{...}",
    "note": "建议使用专门的 CVE 查询前端解析 NVD API 响应"
  }
}
```

---

### 9. 密码泄露检测

```
GET /api/tools/breach-check?email=user@example.com
```

检查邮箱是否在密码泄露事件中出现。

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "email": "user@example.com",
    "sha1Hash": "5BAA61E4C9B93F3F068B...",
    "kAnonymityPrefix": "5BAA6",
    "note": "使用 k-Anonymity: https://haveibeenpwned.com/api/v3/#PwnedPasswords",
    "apiExample": "curl https://api.pwnedpasswords.com/range/5BAA6"
  }
}
```

> **注意**: 需要配置 Have I Been Pwned API 或使用 k-Anonymity 直接查询。

---

## 前端集成示例

### API 调用封装

```typescript
// frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const securityApi = {
  // IP 信息
  async getIpInfo() {
    const res = await fetch(`${API_BASE}/api/tools/ip-info`);
    return res.json();
  },

  // DNS 查询
  async dnsQuery(domain: string) {
    const res = await fetch(`${API_BASE}/api/tools/dns?domain=${encodeURIComponent(domain)}`);
    return res.json();
  },

  // 端口扫描
  async portScan(host: string, ports?: string) {
    const url = ports 
      ? `${API_BASE}/api/tools/port-scan?host=${host}&ports=${ports}`
      : `${API_BASE}/api/tools/port-scan?host=${host}`;
    const res = await fetch(url);
    return res.json();
  },

  // CORS 测试
  async corsTest(url: string, origin?: string) {
    const params = origin 
      ? `?url=${encodeURIComponent(url)}&origin=${encodeURIComponent(origin)}`
      : `?url=${encodeURIComponent(url)}`;
    const res = await fetch(`${API_BASE}/api/tools/cors-test${params}`);
    return res.json();
  },

  // CVE 查询
  async cveSearch(keyword: string, limit: number = 10) {
    const res = await fetch(`${API_BASE}/api/tools/cve-search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
    return res.json();
  },

  // 子域名枚举
  async subdomains(domain: string) {
    const res = await fetch(`${API_BASE}/api/tools/subdomains?domain=${encodeURIComponent(domain)}`);
    return res.json();
  },
};
```

---

## 待集成第三方 API

| 服务 | 用途 | API 地址 |
|------|------|----------|
| ip-api.com | IP 地理位置 | https://ip-api.com/docs/api:json |
| NVD (NIST) | CVE 漏洞数据库 | https://nvd.nist.gov/developers/vulnerabilities |
| VirusTotal | URL/文件分析 | https://www.virustotal.com/gui/developers/api |
| Shodan | 联网设备搜索 | https://www.shodan.io/developers/api |
| crt.sh | SSL 证书子域名 | https://crt.sh |
| Have I Been Pwned | 密码泄露检测 | https://haveibeenpwned.com/API/v3 |
| WhoisXMLAPI | Whois 查询 | https://www.whoisxmlapi.com/ |

---

## 安全注意事项

1. **端口扫描**: 仅扫描授权目标，未经授权的扫描可能违法
2. **CORS 测试**: 用于检测自己的网站配置，不要用于未授权目标
3. **Whois 查询**: 需要付费 API key
4. **CVE 查询**: NVD API 有速率限制，建议添加缓存
5. **密码泄露检测**: 使用 k-Anonymity 保护隐私
