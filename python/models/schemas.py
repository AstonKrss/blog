from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime

class ScanRequest(BaseModel):
    """扫描请求"""
    tool_type: str
    target: str
    region: str
    options: Optional[dict] = {}

class ScanResponse(BaseModel):
    """扫描响应"""
    task_id: str
    status: str

class TaskStatus(BaseModel):
    """任务状态"""
    task_id: str
    status: str
    progress: int = 0
    results: List[dict] = []

class LogItem(BaseModel):
    """日志条目"""
    id: int
    tool_type: str
    target: str
    region: str
    status: str
    created_at: datetime
    found_count: int = 0


class LogsResponse(BaseModel):
    """日志列表响应"""
    total: int
    page: int
    logs: List[LogItem]


# Web 安全工具模型
class XSSScanRequest(BaseModel):
    """XSS 扫描请求"""
    url: str
    param: Optional[str] = "q"

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL 必须以 http:// 或 https:// 开头")
        return v


class SQLiScanRequest(BaseModel):
    """SQL 注入扫描请求"""
    url: str
    param: Optional[str] = "id"

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL 必须以 http:// 或 https:// 开头")
        return v


# 密码学工具模型
class EncodeRequest(BaseModel):
    """编码请求"""
    text: str
    type: str  # base64, url, hex


class DecodeRequest(BaseModel):
    """解码请求"""
    text: str
    type: str