# Python 安全工具后端 - 开发教程

## 项目概述

博客安全工具系统，Python FastAPI 后端，支持多工具扩展。

## 架构设计

```
前端 (Next.js) ←→ Java (Spring Boot) ←→ MySQL
                    ↑
                    └──→ Python (FastAPI) ←→ SSE 实时推送
```

## 完整目录结构

```
python/
├── app.py                      # FastAPI 主入口
├── config.py                   # 配置文件
├── requirements.txt            # 依赖
├── routers/                    # 路由层（按工具分组）
│   ├── __init__.py
│   ├── oss.py                  # OSS 安全工具路由
│   ├── web.py                  # Web 安全工具路由
│   └── crypto.py               # 密码学工具路由
├── modules/                    # 🔥 工具模块（核心）
│   ├── __init__.py
│   ├── oss/                    # OSS 安全工具
│   │   ├── __init__.py
│   │   ├── bucket.py           # Bucket 爆破
│   │   ├── path_fuzz.py        # 路径 Fuzz
│   │   └── takeover.py         # Bucket 接管
│   ├── web/                    # Web 安全工具
│   │   ├── __init__.py
│   │   ├── xss.py              # XSS 检测
│   │   └── sqli.py             # SQL 注入检测
│   └── crypto/                 # 密码学工具
│       ├── __init__.py
│       ├── base64.py           # Base64 编解码
│       └── md5.py              # MD5 哈希
├── services/                   # 公共服务
│   ├── task_manager.py         # 任务管理
│   └── db_service.py           # 数据库服务
├── models/                     # 数据模型
│   └── schemas.py              # Pydantic 模型
├── utils/                      # 通用工具
│   ├── jwt_auth.py             # JWT 验证
│   └── sse_manager.py          # SSE 管理
└── wordlists/                  # 字典文件
    ├── oss.txt
    └── common.txt
```

---

## 第一章：环境配置

### 1.1 安装依赖

```bash
pip install fastapi uvicorn httpx pymysql PyJWT python-dotenv pydantic
```

### 1.2 创建配置文件

```python
# python/config.py
"""
配置文件
"""

from dotenv import load_dotenv
import os

load_dotenv()

# 数据库配置（和博客共用 MySQL）
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME", "myblog"),
    "charset": "utf8mb4"
}

# JWT 配置（和博客共用 secret）
JWT_SECRET = os.getenv("JWT_SECRET", "myblog-dev-secret-key-2026")

# 服务配置
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# 阿里云 OSS 区域列表
OSS_REGIONS = [
    # 中国大陆
    "oss-cn-shanghai", "oss-cn-hangzhou", "oss-cn-nanjing",
    "oss-cn-fuzhou", "oss-cn-jinan", "oss-cn-beijing",
    "oss-cn-tianjin", "oss-cn-shijiazhuang", "oss-cn-huhehaote",
    "oss-cn-chengdu", "oss-cn-shenzhen", "oss-cn-guangzhou",
    "oss-cn-nanning", "oss-cn-chongqing", "oss-cn-kunming",
    "oss-cn-guiyang", "oss-cn-xian", "oss-cn-lanzhou",
    "oss-cn-yinchuan", "oss-cn-xining", "oss-cn-urumqi",
    # 港澳台及海外
    "oss-cn-hongkong",
    "oss-us-west-1", "oss-us-east-1",
    "oss-ap-southeast-1", "oss-ap-northeast-1",
    "oss-ap-southeast-2", "oss-ap-southeast-3",
    "oss-eu-central-1", "oss-eu-west-1",
    "oss-me-east-1", "oss-ap-south-1"
]
```

### 1.3 创建 .env 文件

```bash
# python/.env

# 数据库（和博客共用）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=myblog

# JWT（和博客共用）
JWT_SECRET=myblog-dev-secret-key-2026

# 服务配置
HOST=0.0.0.0
PORT=8000
```

---

## 第二章：数据库服务

### 2.1 创建 services/db_service.py

```python
# python/services/db_service.py
"""
数据库服务 - 连接博客 MySQL 数据库
"""

import pymysql
from typing import Optional, List, Dict
from contextlib import contextmanager
from config import DB_CONFIG


class DBService:
    """数据库操作服务"""

    def __init__(self):
        self.config = DB_CONFIG

    def get_connection(self):
        return pymysql.connect(**self.config)

    @contextmanager
    def get_cursor(self):
        """上下文管理器 - 自动管理连接"""
        conn = self.get_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def create_scan_log(self, user_id: int, tool_type: str, target: str,
                        region: str, options: dict) -> int:
        """创建扫描日志，返回 log_id"""
        import json
        with self.get_cursor() as cursor:
            sql = """
                INSERT INTO oss_scan_logs
                (user_id, tool_type, scan_mode, target, region, options, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'running')
            """
            scan_mode = "batch" if "{" in target or "," in target else "single"
            cursor.execute(sql, (user_id, tool_type, target, region,
                                 json.dumps(options), scan_mode))
            return cursor.lastrowid

    def update_scan_log(self, log_id: int, status: str = None,
                        results: list = None, total_tasks: int = None,
                        completed_tasks: int = None, error_message: str = None):
        """更新扫描日志"""
        import json
        updates = []
        params = []

        if status:
            updates.append("status = %s")
            params.append(status)
        if results is not None:
            updates.append("results = %s")
            params.append(json.dumps(results))
        if total_tasks is not None:
            updates.append("total_tasks = %s")
            params.append(total_tasks)
        if completed_tasks is not None:
            updates.append("completed_tasks = %s")
            params.append(completed_tasks)
        if error_message:
            updates.append("error_message = %s")
            params.append(error_message)
        if status in ["completed", "failed"]:
            updates.append("finished_at = NOW()")

        if updates:
            params.append(log_id)
            sql = f"UPDATE oss_scan_logs SET {', '.join(updates)} WHERE id = %s"
            with self.get_cursor() as cursor:
                cursor.execute(sql, params)

    def get_scan_logs(self, user_id: int, page: int = 1, limit: int = 20) -> tuple:
        """获取用户扫描日志（分页）"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) as total FROM oss_scan_logs WHERE user_id = %s",
                (user_id,)
            )
            total = cursor.fetchone()["total"]

            offset = (page - 1) * limit
            sql = """
                SELECT id, user_id, tool_type, target, region, status,
                       total_tasks, completed_tasks, created_at, finished_at
                FROM oss_scan_logs
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(sql, (user_id, limit, offset))
            logs = cursor.fetchall()
            return total, logs

    def delete_scan_log(self, log_id: int, user_id: int) -> bool:
        """删除扫描日志"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM oss_scan_logs WHERE id = %s AND user_id = %s",
                (log_id, user_id)
            )
            return cursor.rowcount > 0

    def update_tool_stats(self, tool_type: str, success: bool = True):
        """更新工具统计"""
        with self.get_cursor() as cursor:
            sql = """
                INSERT INTO security_tool_stats (tool_type, total_scans, success_count)
                VALUES (%s, 1, %s)
                ON DUPLICATE KEY UPDATE
                    total_scans = total_scans + 1,
                    success_count = success_count + %s
            """
            val = 1 if success else 0
            cursor.execute(sql, (tool_type, val, val))


# 全局实例
db_service = DBService()
```

---

## 第三章：JWT 验证

### 3.1 创建 utils/jwt_auth.py

```python
# python/utils/jwt_auth.py
"""
JWT 验证工具
"""

import jwt
from fastapi import HTTPException, Request
from config import JWT_SECRET


class JWTAuth:
    """JWT 认证"""

    @staticmethod
    def decode_token(token: str) -> dict:
        """解码 Token"""
        try:
            return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token 已过期")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="无效的 Token")

    @staticmethod
    def get_user_id(token: str) -> int:
        """获取用户 ID"""
        payload = JWTAuth.decode_token(token)
        user_id = payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token 中没有用户信息")
        return int(user_id)


async def get_current_user_id(request: Request) -> int:
    """FastAPI 依赖 - 获取当前用户 ID"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少 Authorization 头")

    token = auth_header.replace("Bearer ", "")
    return JWTAuth.get_user_id(token)
```

---

## 第四章：SSE 管理

### 4.1 创建 utils/sse_manager.py

```python
# python/utils/sse_manager.py
"""
SSE 管理器 - 实时推送扫描进度
"""

import asyncio
import json
from typing import Dict
from fastapi import StreamingResponse


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
                if task_id in active_connections:
                    del active_connections[task_id]

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
```

---

## 第五章：任务管理

### 5.1 创建 services/task_manager.py

```python
# python/services/task_manager.py
"""
任务管理器 - 管理扫描任务
"""

import asyncio
import uuid
from typing import Dict, Optional
from datetime import datetime

from services.db_service import db_service
from utils.sse_manager import SSEManager
from config import OSS_REGIONS


class TaskManager:
    """任务管理器"""

    def __init__(self):
        self.tasks: Dict[str, dict] = {}

    def create_task(self, user_id: int, tool_type: str, target: str,
                    region: str, options: dict) -> str:
        """创建新任务"""
        task_id = str(uuid.uuid4())[:8]
        log_id = db_service.create_scan_log(user_id, tool_type, target, region, options)

        self.tasks[task_id] = {
            "task_id": task_id,
            "log_id": log_id,
            "user_id": user_id,
            "tool_type": tool_type,
            "target": target,
            "region": region,
            "options": options,
            "status": "running",
            "created_at": datetime.now(),
            "results": []
        }
        return task_id

    def get_task_status(self, task_id: str) -> Optional[dict]:
        """获取任务状态"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        return {
            "task_id": task_id,
            "status": task["status"],
            "progress": len(task["results"]) * 10,
            "results": task["results"]
        }

    def start_task(self, task_id: str):
        """启动任务"""
        task = self.tasks.get(task_id)
        if not task:
            return

        tool_type = task["tool_type"]

        if tool_type == "bucket_fuzz":
            task["future"] = asyncio.create_task(self._run_bucket_fuzz(task_id))
        elif tool_type == "path_fuzz":
            task["future"] = asyncio.create_task(self._run_path_fuzz(task_id))
        elif tool_type == "takeover":
            task["future"] = asyncio.create_task(self._run_takeover(task_id))

    async def _run_bucket_fuzz(self, task_id: str):
        """Bucket 爆破任务"""
        task = self.tasks.get(task_id)
        if not task:
            return

        try:
            from modules.oss.bucket import generate_bucket_names, BucketScanner

            pattern = task["options"].get("pattern", task["target"])
            start = task["options"].get("start", 1)
            end = task["options"].get("end", 999)

            targets = generate_bucket_names(pattern, start, end)
            total = len(targets)

            scanner = BucketScanner(task["region"])

            for i, name in enumerate(targets):
                result = await scanner.check(name)
                if result and result.get("found"):
                    task["results"].append(result)
                    await SSEManager.send_found(task_id, result)

                progress = int((i + 1) / total * 100)
                await SSEManager.send_progress(task_id, progress, name, len(task["results"]))

            await scanner.close()

            await SSEManager.send_completed(task_id, total, len(task["results"]),
                                           [r for r in task["results"] if r.get("found")])
            db_service.update_scan_log(task["log_id"], status="completed",
                                      results=task["results"], total_tasks=total,
                                      completed_tasks=total)

        except Exception as e:
            await SSEManager.send_error(task_id, str(e))
            db_service.update_scan_log(task["log_id"], status="failed",
                                      error_message=str(e))

    async def _run_path_fuzz(self, task_id: str):
        """路径 Fuzz 任务"""
        task = self.tasks.get(task_id)
        if not task:
            return

        try:
            from modules.oss.path_fuzz import generate_paths, PathScanner

            prefix = task["target"]
            start = task["options"].get("range_start", 1)
            end = task["options"].get("range_end", 999)
            extensions = task["options"].get("extensions", [".txt"])

            paths = generate_paths(prefix, start, end, extensions)
            urls = [f"http://{task['target']}/{p}" for p in paths]
            total = len(urls)

            scanner = PathScanner(task["region"])

            for i, url in enumerate(urls):
                result = await scanner.check(url)
                if result and result.get("found"):
                    task["results"].append(result)
                    await SSEManager.send_found(task_id, result)

                progress = int((i + 1) / total * 100)
                await SSEManager.send_progress(task_id, progress, url, len(task["results"]))

            await scanner.close()

            await SSEManager.send_completed(task_id, total, len(task["results"]),
                                           [r for r in task["results"] if r.get("found")])
            db_service.update_scan_log(task["log_id"], status="completed",
                                      results=task["results"], total_tasks=total,
                                      completed_tasks=total)

        except Exception as e:
            await SSEManager.send_error(task_id, str(e))
            db_service.update_scan_log(task["log_id"], status="failed",
                                      error_message=str(e))

    async def _run_takeover(self, task_id: str):
        """Bucket 接管检测任务"""
        task = self.tasks.get(task_id)
        if not task:
            return

        try:
            from modules.oss.takeover import TakeoverScanner

            scanner = TakeoverScanner()
            result = await scanner.check(task["target"], task["region"])

            task["results"].append(result)
            await SSEManager.send_found(task_id, result)
            await SSEManager.send_completed(task_id, 1, 1, [result])

            db_service.update_scan_log(task["log_id"], status="completed",
                                      results=[result], total_tasks=1,
                                      completed_tasks=1)

        except Exception as e:
            await SSEManager.send_error(task_id, str(e))
            db_service.update_scan_log(task["log_id"], status="failed",
                                      error_message=str(e))


# 全局实例
task_manager = TaskManager()
```

---

## 第六章：OSS 工具模块

### 6.1 创建 modules/__init__.py

```python
# python/modules/__init__.py
"""工具模块"""
```

### 6.2 创建 modules/oss/__init__.py

```python
# python/modules/oss/__init__.py
"""OSS 安全工具模块"""
```

### 6.3 创建 modules/oss/bucket.py

```python
# python/modules/oss/bucket.py
"""
Bucket 扫描器
"""

import httpx
from typing import Dict, Optional, List


class BucketScanner:
    """Bucket 扫描器"""

    def __init__(self, region: str, timeout: int = 3):
        self.region = region
        self.endpoint = f"{region}.aliyuncs.com"
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def close(self):
        await self.client.close()

    async def check(self, bucket_name: str) -> Optional[Dict]:
        """检查单个 Bucket"""
        url = f"http://{bucket_name}.{self.endpoint}"

        try:
            resp = await self.client.get(url, follow_redirects=False)
            text = resp.text

            if "NoSuchBucket" in text:
                return {
                    "found": True,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "not_exist",
                    "can_takeover": True,
                    "url": url
                }
            elif "InvalidBucketName" in text:
                return {
                    "found": False,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "invalid"
                }
            elif "AccessDenied" in text:
                return {
                    "found": True,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "exist_private",
                    "url": url
                }
            elif resp.status_code == 200:
                return {
                    "found": True,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "exist_public",
                    "url": url
                }
        except:
            pass
        return None


def generate_bucket_names(pattern: str, start: int = 1, end: int = 999) -> List[str]:
    """根据模式生成 Bucket 名称列表"""
    names = []

    # 检查双变量 {i}{j}
    if "{i}" in pattern and "{j}" in pattern:
        for i in range(10):
            for j in range(10):
                name = pattern.replace("{i}", str(i)).replace("{j}", str(j))
                names.append(name)
    # 检查单变量 {i}
    elif "{i}" in pattern:
        for i in range(start, end + 1):
            name = pattern.replace("{i}", str(i))
            names.append(name)
    else:
        names.append(pattern)

    return names
```

### 6.4 创建 modules/oss/path_fuzz.py

```python
# python/modules/oss/path_fuzz.py
"""
路径 Fuzz 扫描器
"""

import httpx
import re
from typing import Dict, Optional, List


class PathScanner:
    """路径 Fuzz 扫描器"""

    def __init__(self, region: str, timeout: int = 5):
        self.region = region
        self.endpoint = f"{region}.aliyuncs.com"
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)
        self.flag_pattern = re.compile(r'flag\{[^}]+\}', re.IGNORECASE)

    async def close(self):
        await self.client.close()

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
        except:
            pass
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
```

### 6.5 创建 modules/oss/takeover.py

```python
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
```

---

## 第七章：Web 安全工具模块（示例）

### 7.1 创建 modules/web/__init__.py

```python
# python/modules/web/__init__.py
"""Web 安全工具模块"""
```

### 7.2 创建 modules/web/xss.py

```python
# python/modules/web/xss.py
"""
XSS 检测工具
"""

import httpx
from typing import Dict, List


XSS_PAYLOADS = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "<svg onload=alert(1)>",
    "'-alert(1)-'",
]


class XSSScanner:
    """XSS 扫描器"""

    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def close(self):
        await self.client.close()

    async def scan(self, url: str, param: str = "q") -> Dict:
        """扫描 XSS 漏洞"""
        results = []

        for payload in XSS_PAYLOADS:
            try:
                test_url = f"{url}?{param}={payload}"
                resp = await self.client.get(test_url)

                if payload in resp.text:
                    results.append({
                        "payload": payload,
                        "reflected": True
                    })
            except:
                pass

        return {
            "url": url,
            "vulnerable": len(results) > 0,
            "findings": results
        }
```

### 7.3 创建 modules/web/sqli.py

```python
# python/modules/web/sqli.py
"""
SQL 注入检测工具
"""

import httpx
from typing import Dict, List


SQL_PAYLOADS = [
    "' OR '1'='1",
    "' OR 1=1--",
    "1' AND '1'='1",
    "admin'--",
    "' UNION SELECT NULL--",
]


class SQLiScanner:
    """SQL 注入扫描器"""

    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def close(self):
        await self.client.close()

    async def scan(self, url: str, param: str = "id") -> Dict:
        """扫描 SQL 注入"""
        results = []

        for payload in SQL_PAYLOADS:
            try:
                test_url = f"{url}?{param}={payload}"
                resp = await self.client.get(test_url)

                error_keywords = ["sql", "error", "mysql", "syntax", "warning"]
                for keyword in error_keywords:
                    if keyword in resp.text.lower():
                        results.append({
                            "payload": payload,
                            "error_detected": keyword
                        })
                        break
            except:
                pass

        return {
            "url": url,
            "vulnerable": len(results) > 0,
            "findings": results
        }
```

---

## 第八章：密码学工具模块（示例）

### 8.1 创建 modules/crypto/__init__.py

```python
# python/modules/crypto/__init__.py
"""密码学工具模块"""
```

### 8.2 创建 modules/crypto/base64.py

```python
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
```

### 8.3 创建 modules/crypto/md5.py

```python
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
```

---

## 第九章：数据模型

### 9.1 创建 models/schemas.py

```python
# python/models/schemas.py
"""
Pydantic 数据模型
"""

from pydantic import BaseModel, Field
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


class SQLiScanRequest(BaseModel):
    """SQL 注入扫描请求"""
    url: str
    param: Optional[str] = "id"


# 密码学工具模型
class EncodeRequest(BaseModel):
    """编码请求"""
    text: str
    type: str  # base64, url, hex


class DecodeRequest(BaseModel):
    """解码请求"""
    text: str
    type: str
```

---

## 第十章：API 路由

### 10.1 创建 routers/__init__.py

```python
# python/routers/__init__.py
"""路由模块"""
```

### 10.2 创建 routers/oss.py

```python
# python/routers/oss.py
"""
OSS 安全工具 API
"""

from fastapi import APIRouter, Depends, HTTPException, Query

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
                found_count=len(eval(log["results"] or "[]")) if log.get("results") else 0
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
```

### 10.3 创建 routers/web.py

```python
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
```

### 10.4 创建 routers/crypto.py

```python
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
```

---

## 第十一章：主入口

### 11.1 创建 app.py

```python
# python/app.py
"""
FastAPI 主入口
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import oss, web, crypto
from config import HOST, PORT

load_dotenv()

app = FastAPI(
    title="安全工具 API",
    description="博客安全工具系统",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(oss.router)
app.include_router(web.router)
app.include_router(crypto.router)


@app.get("/")
async def root():
    return {"message": "安全工具 API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
```

---

## 第十二章：数据库 SQL

```sql
-- 创建 OSS 扫描日志表
CREATE TABLE IF NOT EXISTS oss_scan_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    tool_type VARCHAR(50) NOT NULL,
    scan_mode VARCHAR(20) NOT NULL,
    target VARCHAR(255) NOT NULL,
    region VARCHAR(50) NOT NULL,
    options JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    results JSON,
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    INDEX idx_user_id (user_id),
    INDEX idx_tool_type (tool_type),
    INDEX idx_status (status)
);

-- 创建安全工具统计表
CREATE TABLE IF NOT EXISTS security_tool_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tool_type VARCHAR(50) NOT NULL UNIQUE,
    total_scans INT DEFAULT 0,
    success_count INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 初始化统计表
INSERT INTO security_tool_stats (tool_type, total_scans, success_count) VALUES
('bucket_fuzz', 0, 0),
('path_fuzz', 0, 0),
('takeover', 0, 0)
ON DUPLICATE KEY UPDATE tool_type = tool_type;
```

---

## 启动方式

```bash
# 1. 进入目录
cd python/security

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动服务
python app.py
# 或
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

访问 http://localhost:8000/docs 查看 API 文档

---

## 新增工具指南

### 新增一个工具（例如：端口扫描）

1. **在 modules/web/ 下创建新文件**

```python
# python/modules/web/port_scan.py
class PortScanner:
    async def scan(self, host: str, ports: list):
        ...
```

2. **在 routers/web.py 中添加路由**

```python
@router.post("/port-scan")
async def port_scan(request: PortScanRequest):
    scanner = PortScanner()
    return await scanner.scan(request.host, request.ports)
```

3. **前端调用新 API**

完成！

---

## 目录结构图

```
python/
├── app.py                    ← 主入口
├── config.py                 ← 配置
├── routers/
│   ├── oss.py               ← OSS 工具路由
│   ├── web.py               ← Web 工具路由
│   └── crypto.py            ← 密码学路由
├── modules/                 ← 🔥 工具模块（扩展点）
│   ├── oss/                ← OSS 工具
│   │   ├── bucket.py       ← Bucket 爆破
│   │   ├── path_fuzz.py    ← 路径 Fuzz
│   │   └── takeover.py     ← Bucket 接管
│   ├── web/                ← Web 工具（可扩展）
│   │   ├── xss.py
│   │   ├── sqli.py
│   │   └── port_scan.py   ← 新增
│   └── crypto/             ← 密码学工具（可扩展）
│       ├── base64.py
│       └── md5.py
├── services/               ← 公共服务
│   ├── task_manager.py
│   └── db_service.py
├── models/
│   └── schemas.py
├── utils/
│   ├── jwt_auth.py
│   └── sse_manager.py
└── wordlists/
    └── ...
```