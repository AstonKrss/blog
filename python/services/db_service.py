# python/services/db_service.py
"""
数据库服务 - 连接博客 MySQL 数据库
"""

import pymysql
import json
from typing import List, Dict, Optional
from contextlib import contextmanager
from config import DB_CONFIG

class DBService:
    def __init__(self):
        self.config = DB_CONFIG

    def get_connection(self):
        return pymysql.connect(**self.config)

    @contextmanager
    def get_cursor(self):
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
        with self.get_cursor() as cursor:
            sql = """
                INSERT INTO oss_scan_logs
                (user_id, tool_type, scan_mode, target, region, options, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'running')
            """
            scan_mode = "batch" if "{" in target or "," in target else "single"
            # 处理 options：如果是字符串直接使用，如果是 dict 则 json.dumps
            if isinstance(options, str):
                options_json = options
            elif options:
                options_json = json.dumps(options)
            else:
                options_json = "{}"
            cursor.execute(
                "INSERT INTO oss_scan_logs (user_id, tool_type, scan_mode, target, region, options, status) VALUES (%s, %s, %s, %s, %s, %s, 'running')",
                (user_id, tool_type, scan_mode, target, region, options_json)
            )
            return cursor.lastrowid
    def update_scan_log(self, log_id: int, status: str = None,
                        results: list = None, total_tasks: int = None,
                        completed_tasks: int = None, error_message: str = None):
        """更新扫描日志"""
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
