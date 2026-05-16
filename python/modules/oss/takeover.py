# python/modules/oss/takeover.py
"""
Bucket 接管检测器
"""

from modules.oss.bucket import BucketScanner
from typing import Dict


class TakeoverScanner:
    """Bucket 接管检测器"""

    async def check(self, bucket_name: str, region: str) -> Dict:
        """检测 Bucket 是否可接管"""
        scanner = BucketScanner(region)
        try:
            result = await scanner.check(bucket_name)

            if result and result.get("status") == "not_exist":
                return {
                    "takeoverable": True,
                    "bucket": bucket_name,
                    "message": "可接管！创建同名 Bucket 后即可控制"
                }
            else:
                return {
                    "takeoverable": False,
                    "bucket": bucket_name,
                    "status": result.get("status") if result else "unknown",
                    "message": "该 Bucket 已存在，无法接管"
                }
        finally:
            await scanner.close()