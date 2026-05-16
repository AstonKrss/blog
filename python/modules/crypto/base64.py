# python/modules/crypto/base64.py
"""
Base64 编解码工具
"""

import base64
from typing import Dict


def encode(text: str) -> str:
    """Base64 编码"""
    return base64.b64encode(text.encode()).decode()


def decode(text: str) -> Dict:
    """Base64 解码"""
    try:
        decoded = base64.b64decode(text.encode()).decode()
        return {"success": True, "result": decoded}
    except Exception as e:
        return {"success": False, "error": str(e)}