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
        elif tool_type == "url_fuzz":
            task["future"] = asyncio.create_task(self._run_url_fuzz(task_id))

    async def _run_bucket_fuzz(self, task_id: str):
        """Bucket 爆破任务"""
        task = self.tasks.get(task_id)
        if not task:
            return

        try:
            from modules.oss.bucket import generate_bucket_names, BucketScanner, MAX_GENERATE_COUNT

            options = task["options"]

            # 支持多种生成模式
            mode = options.get("mode", "pattern")
            pattern = options.get("pattern", task["target"])
            start = options.get("start", 1)
            end = options.get("end", 999)
            padding = options.get("padding", 0)
            step = options.get("step", 1)
            letters = options.get("letters", "")
            prefix = options.get("prefix", "")
            suffix = options.get("suffix", "")
            wordlist_file = options.get("wordlist_file", "")
            custom_list = options.get("custom_list", "")
            max_count = options.get("max_count", MAX_GENERATE_COUNT)

            targets = generate_bucket_names(
                mode=mode,
                pattern=pattern,
                start=start,
                end=end,
                padding=padding,
                step=step,
                letters=letters,
                prefix=prefix,
                suffix=suffix,
                wordlist_file=wordlist_file,
                custom_list=custom_list,
                max_count=max_count
            )
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
        finally:
            self.tasks.pop(task_id, None)

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
        finally:
            self.tasks.pop(task_id, None)

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
        finally:
            self.tasks.pop(task_id, None)

    async def _run_url_fuzz(self, task_id: str):
        """URL 模板 Fuzz 任务"""
        task = self.tasks.get(task_id)
        if not task:
            return

        try:
            from modules.oss.bucket import generate_urls_from_template

            options = task["options"]
            url_template = options.get("url_template", "")
            var1 = options.get("var1", {})
            var2 = options.get("var2", {})

            urls = generate_urls_from_template(url_template, var1, var2)
            total = len(urls)

            client = httpx.AsyncClient(timeout=3)

            for i, url in enumerate(urls):
                try:
                    resp = await client.get(url, follow_redirects=False)
                    text = resp.text

                    # 检测结果
                    if "NoSuchBucket" in text:
                        result = {
                            "found": True,
                            "type": "url",
                            "url": url,
                            "status": "not_exist"
                        }
                        task["results"].append(result)
                        await SSEManager.send_found(task_id, result)
                    elif "AccessDenied" in text:
                        result = {
                            "found": True,
                            "type": "url",
                            "url": url,
                            "status": "exist_private"
                        }
                        task["results"].append(result)
                        await SSEManager.send_found(task_id, result)
                    elif resp.status_code == 200:
                        result = {
                            "found": True,
                            "type": "url",
                            "url": url,
                            "status": "exist_public"
                        }
                        task["results"].append(result)
                        await SSEManager.send_found(task_id, result)

                except httpx.TimeoutException:
                    pass
                except httpx.RequestError:
                    pass

                progress = int((i + 1) / total * 100)
                await SSEManager.send_progress(task_id, progress, url, len(task["results"]))

            await client.aclose()

            await SSEManager.send_completed(task_id, total, len(task["results"]),
                                           [r for r in task["results"] if r.get("found")])
            db_service.update_scan_log(task["log_id"], status="completed",
                                      results=task["results"], total_tasks=total,
                                      completed_tasks=total)

        except Exception as e:
            await SSEManager.send_error(task_id, str(e))
            db_service.update_scan_log(task["log_id"], status="failed",
                                      error_message=str(e))
        finally:
            self.tasks.pop(task_id, None)


# 全局实例
task_manager = TaskManager()