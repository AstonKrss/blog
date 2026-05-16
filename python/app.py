# python/app.py
"""
FastAPI 主入口
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import oss, web, crypto
from config import HOST, PORT

load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

app = FastAPI(
    title="安全漏洞检测系统",
    description="一个基于 FastAPI 的安全漏洞检测博客系统",
    version="1.0.0",
)

# CORS 配置 - 从环境变量读取允许的域名
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)