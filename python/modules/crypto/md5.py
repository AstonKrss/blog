# python/modules/crypto/md5.py
"""
MD5 哈希工具
"""

import hashlib
from typing import Dict


def hash_md5(text: str) -> str:
    """MD5 哈希"""
    return hashlib.md5(text.encode()).hexdigest()


def verify_md5(text: str, hash_value: str) -> bool:
    """验证 MD5"""
    return hash_md5(text) == hash_value.lower()