# python/routers/crypto.py
"""
密码学工具 API
"""

from fastapi import APIRouter, Depends

from models.schemas import EncodeRequest, DecodeRequest
from modules.crypto.base64 import encode as base64_encode, decode as base64_decode
from modules.crypto.md5 import hash_md5

router = APIRouter(prefix="/api/crypto", tags=["密码学工具"])


@router.post("/encode")
async def encode_text(request: EncodeRequest):
    """编码"""
    if request.type == "base64":
        return {"result": base64_encode(request.text)}
    elif request.type == "md5":
        return {"result": hash_md5(request.text)}
    else:
        return {"error": "不支持的编码类型"}


@router.post("/decode")
async def decode_text(request: DecodeRequest):
    """解码"""
    if request.type == "base64":
        return base64_decode(request.text)
    else:
        return {"error": "不支持的解码类型"}