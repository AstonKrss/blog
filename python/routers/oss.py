# python/routers/oss.py
"""
OSS 安全工具 API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
import json

from models.schemas import (
    ScanRequest, ScanResponse, TaskStatus, LogsResponse, LogItem
)
from services.task_manager import task_manager
from services.db_service import db_service
from utils.jwt_auth import get_current_user_id
from utils.sse_manager import SSEManager
from config import OSS_REGIONS

router = APIRouter(prefix="/api/oss", tags=["OSS 安全工具"])


@router.post("/scan", response_model=ScanResponse)
async def create_scan_task(
    request: ScanRequest,
    user_id: int = Depends(get_current_user_id)
):
    """创建扫描任务"""
    if request.region not in OSS_REGIONS:
        raise HTTPException(status_code=400, detail=f"不支持的区域: {request.region}")

    task_id = task_manager.create_task(
        user_id=user_id,
        tool_type=request.tool_type,
        target=request.target,
        region=request.region,
        options=request.options or {}
    )

    task_manager.start_task(task_id)
    return ScanResponse(task_id=task_id, status="running")


@router.get("/sse/{task_id}")
async def sse_stream(task_id: str, user_id: int = Depends(get_current_user_id)):
    """SSE 流 - 实时接收扫描进度"""
    return await SSEManager.create_stream(task_id)


@router.get("/status/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str, user_id: int = Depends(get_current_user_id)):
    """查询任务状态"""
    status = task_manager.get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="任务不存在")
    return TaskStatus(**status)


@router.get("/logs", response_model=LogsResponse)
async def get_scan_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: int = Depends(get_current_user_id)
):
    """获取扫描历史"""
    total, logs = db_service.get_scan_logs(user_id, page, limit)

    return LogsResponse(
        total=total,
        page=page,
        logs=[
            LogItem(
                id=log["id"],
                tool_type=log["tool_type"],
                target=log["target"],
                region=log["region"],
                status=log["status"],
                created_at=log["created_at"],
                found_count=len(json.loads(log["results"]) if log.get("results") else [])
            )
            for log in logs
        ]
    )


@router.delete("/logs/{log_id}")
async def delete_scan_log(log_id: int, user_id: int = Depends(get_current_user_id)):
    """删除扫描记录"""
    success = db_service.delete_scan_log(log_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "删除成功"}


@router.get("/regions")
async def get_regions():
    """获取支持的区域列表"""
    return {"regions": OSS_REGIONS}