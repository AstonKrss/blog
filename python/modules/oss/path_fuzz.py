# python/modules/oss/path_fuzz.py
"""
路径 Fuzz 扫描器
"""

import httpx
import re
import logging
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)


class PathScanner:
    """路径 Fuzz 扫描器"""

    def __init__(self, region: str, timeout: int = 5):
        self.region = region
        self.endpoint = f"{region}.aliyuncs.com"
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)
        self.flag_pattern = re.compile(r'flag\{[^}]+\}', re.IGNORECASE)

    async def close(self):
        await self.client.aclose()

    async def check(self, url: str) -> Optional[Dict]:
        """检查单个路径"""
        try:
            resp = await self.client.get(url)
            if resp.status_code == 200:
                content = resp.text
                result = {
                    "found": True,
                    "type": "file",
                    "url": url,
                    "size": len(content)
                }

                flag_match = self.flag_pattern.search(content)
                if flag_match:
                    result["flag"] = flag_match.group()
                    result["has_flag"] = True

                return result
        except httpx.TimeoutException:
            logger.debug(f"路径 Fuzz 请求超时: {url}")
        except httpx.RequestError as e:
            logger.debug(f"路径 Fuzz 请求错误 {url}: {e}")
        return None


def generate_paths(prefix: str, start: int, end: int,
                   extensions: List[str] = None) -> List[str]:
    """生成数字序列路径"""
    paths = []
    for i in range(start, end + 1):
        path = f"{prefix}_{i:03d}"
        if extensions:
            for ext in extensions:
                paths.append(path + ext)
        else:
            paths.append(path)
    return paths