from python:3.11

# 设置工作目录
WORKDIR /app

# 复制 requirements.txt 并安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=3)" || exit 1

# 暴露端口（根据你的应用需要调整）
EXPOSE 8000

# 启动命令（根据你的应用需要调整）
CMD ["python", "app.py"]