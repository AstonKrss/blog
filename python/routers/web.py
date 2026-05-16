# python/routers/web.py
"""
Web 安全工具 API
"""

from fastapi import APIRouter, Depends

from models.schemas import XSSScanRequest, SQLiScanRequest
from utils.jwt_auth import get_current_user_id
from modules.web.xss import XSSScanner
from modules.web.sqli import SQLiScanner

router = APIRouter(prefix="/api/web", tags=["Web 安全工具"])


@router.post("/xss/scan")
async def scan_xss(
    request: XSSScanRequest,
    user_id: int = Depends(get_current_user_id)
):
    """XSS 扫描"""
    scanner = XSSScanner()
    try:
        result = await scanner.scan(request.url, request.param)
        return result
    finally:
        await scanner.close()


@router.post("/sqli/scan")
async def scan_sqli(
    request: SQLiScanRequest,
    user_id: int = Depends(get_current_user_id)
):
    """SQL 注入扫描"""
    scanner = SQLiScanner()
    try:
        result = await scanner.scan(request.url, request.param)
        return result
    finally:
        await scanner.close()