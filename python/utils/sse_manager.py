# python/utils/sse_manager.py
"""
SSE 管理器 - 实时推送扫描进度
"""

import asyncio
import json
from typing import Dict
from fastapi.responses import StreamingResponse


# 存储活跃的 SSE 连接
active_connections: Dict[str, asyncio.Queue] = {}


class SSEManager:
    """SSE 管理器"""

    @staticmethod
    async def create_stream(task_id: str):
        """创建 SSE 流"""
        queue: asyncio.Queue = asyncio.Queue()
        active_connections[task_id] = queue

        async def event_generator():
            try:
                while True:
                    try:
                        message = await asyncio.wait_for(queue.get(), timeout=30)
                        if message is None:
                            break
                        yield f"data: {json.dumps(message)}\n\n"
                    except asyncio.TimeoutError:
                        yield f": heartbeat\n\n"
            finally:
                active_connections.pop(task_id, None)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )

    @staticmethod
    async def send_progress(task_id: str, progress: int, current: str, found: int):
        """发送进度"""
        if task_id in active_connections:
            await active_connections[task_id].put({
                "type": "progress",
                "progress": progress,
                "current": current,
                "found": found
            })

    @staticmethod
    async def send_found(task_id: str, result: dict):
        """发送发现结果"""
        if task_id in active_connections:
            await active_connections[task_id].put({
                "type": "found",
                **result
            })

    @staticmethod
    async def send_completed(task_id: str, total: int, found: int, results: list):
        """发送完成消息"""
        if task_id in active_connections:
            await active_connections[task_id].put({
                "type": "completed",
                "total": total,
                "found": found,
                "results": results
            })
            await active_connections[task_id].put(None)

    @staticmethod
    async def send_error(task_id: str, error: str):
        """发送错误"""
        if task_id in active_connections:
            await active_connections[task_id].put({
                "type": "error",
                "message": error
            })