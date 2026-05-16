# Python 安全工具 CI/CD 部署指南

## 架构概览

```
GitHub (main branch)
    │
    ▼
GitHub Actions CI/CD
    │
    ├── 构建 Next.js 前端
    ├── 构建 Spring Boot 后端
    └── 构建 Python FastAPI 服务 ← 新增
    │
    ▼
阿里云服务器
    │
    ├── nginx:80      (前端)
    ├── Java:8080      (后端 API)
    └── Python:8000    (安全工具)  ← 新增
```

---

## 1. 文件准备

在你的 `python/` 目录下创建两个文件：

### 1.1 `python/requirements.txt`

```txt
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pymysql>=1.1.1
python-jose[cryptography]>=3.3.0
pydantic>=2.0.0
httpx>=0.28.0
python-dotenv>=1.0.0
```

### 1.2 `python/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 先复制依赖文件，安装依赖（利用 Docker 缓存层）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 再复制代码（代码改变时不需要重新安装依赖）
COPY . .

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=3)" || exit 1

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

> **注意**：生产环境用 `uvicorn` 而非直接 `python app.py`，因为 uvicorn 支持多 worker、性能更好。

---

## 2. 修改 `compose.yaml`

在你的 `compose.yaml` 中新增 Python 服务：

```yaml
services:
  # ... mysql 和 backend 保持不变 ...

  # 新增：Python 安全工具服务
  python:
    build:
      context: ./python          # python 目录作为构建上下文
      dockerfile: Dockerfile     # python/Dockerfile
    container_name: blog-python
    restart: always
    ports:
      - "8000:8000"              # 映射端口
    environment:
      # 容器内用 'mysql' 而不是 localhost（docker-compose 内部 DNS）
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: Chuyangqi123@@    # 和 mysql 的 MYSQL_ROOT_PASSWORD 一致
      DB_NAME: myblog
      JWT_SECRET: mySecretKeyForJwtTokenGenerationThatIsLongEnough
      HOST: 0.0.0.0
      PORT: 8000
      CORS_ORIGINS: http://47.242.21.40,http://localhost:3000
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - blog-network

  # 前端需要知道 Python API 地址
  frontend:
    # ... 原有配置 ...
    environment:
      NEXT_PUBLIC_API_URL: http://47.242.21.40:8080
      PYTHON_API_URL: http://47.242.21.40:8000    # 新增
```

> **关键**：`DB_HOST` 要用 `mysql`（docker-compose 服务名），不能用 `localhost`。

---

## 3. 修改 GitHub Actions

在 `.github/workflows/build.yml` 中新增 Python 构建步骤：

```yaml
name: 自动构建
on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: 拉取代码
        uses: actions/checkout@v4

      # ========== 前端构建 ==========
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: 构建前端
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_API_URL: http://47.242.21.40:8080
          PYTHON_API_URL: http://47.242.21.40:8000   # 新增
        run: |
          npm ci
          npm run build

      # ========== 后端构建 ==========
      - name: 设置 Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: 打包后端
        run: mvn clean package -DskipTests

      # ========== Python 构建（新增）==========
      - name: 构建 Python 镜像
        run: |
          cd python
          docker build -t blog-python:latest .

      # ========== 部署到阿里云 ==========
      - name: 部署到阿里云
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.ALIYUN_HOST }}
          username: ${{ secrets.ALIYUN_USER }}
          password: ${{ secrets.ALIYUN_PASSWORD }}
          script: |
            set -e
            cd /root/workspace/blog

            # 拉取最新代码
            git remote set-url origin https://x-access-token:${{ github.token }}@github.com/${{ github.repository }}.git
            git pull origin main

            # 构建 Python 镜像
            cd python && docker build -t blog-python:latest . && cd ..

            # 重启所有服务
            docker-compose down
            docker-compose up -d --build

            echo "部署完成！"
```

---

## 4. 前端环境变量

前端需要知道 Python API 的地址。在 `frontend/Dockerfile` 中添加：

```dockerfile
# 多阶段构建的 builder 阶段
ARG NEXT_PUBLIC_API_URL
ARG PYTHON_API_URL                 # 新增
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV PYTHON_API_URL=$PYTHON_API_URL   # 新增

# ... 其他内容不变 ...
```

---

## 5. 本地测试

```bash
# 1. 在项目根目录启动所有服务
docker-compose up -d --build

# 2. 检查服务状态
docker-compose ps

# 3. 验证各服务健康
curl http://localhost:3000          # 前端
curl http://localhost:8080/health    # Java 后端
curl http://localhost:8000/health   # Python 安全工具 ← 重点检查这个

# 4. 查看日志
docker-compose logs -f python

# 5. 停止所有服务
docker-compose down
```

---

## 6. 数据库准备

Python 服务依赖 `oss_scan_logs` 表，部署前确保数据库中有这张表：

```bash
# 如果表不存在，需要执行 SQL 创建
docker-compose exec mysql mysql -uroot -pChuyangqi123@@ myblog < SQL/oss_security_logs.sql
```

---

## 7. 常见问题排查

| 问题 | 原因 | 解决方法 |
|------|------|---------|
| Python 容器启动失败 | 端口被占用 | `docker-compose down` 后重试 |
| 数据库连接失败 | `DB_HOST` 用了 `localhost` | 改为 `mysql`（compose 服务名） |
| 容器内无法解析 `mysql` | 没在同一 network | 确保 `depends_on: mysql` |
| 磁盘空间不足 | Docker 镜像太多 | `docker system prune -af` |
| `pip install` 失败 | 网络问题 | 换国内镜像 `pip install -i https://pypi.tuna.tsinghua.edu.cn/simple` |

---

## 8. 进阶优化

### 8.1 Python 镜像优化（可选）

```dockerfile
# 使用 alpine 减少镜像体积
FROM python:3.11-slim

# 安装编译依赖（某些库如 cryptography 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# ... 其余不变 ...
```

### 8.2 多阶段构建

```dockerfile
# builder 阶段：安装依赖、编译
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 运行阶段：只复制必要文件
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 8.3 推送到远程镜像仓库（可选）

如果阿里云服务器性能有限，可以在 CI 中构建镜像后推送到阿里云 ACR：

```yaml
- name: 推送镜像到阿里云ACR
  run: |
    docker login --username=${{ secrets.ACR_USERNAME }} \
                 --password=${{ secrets.ACR_PASSWORD }} \
                 registry.cn-hangzhou.aliyuncs.com
    docker tag blog-python:latest \
      registry.cn-hangzhou.aliyuncs.com/your-namespace/blog-python:latest
    docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/blog-python:latest
```

部署时直接 `docker pull` 而不是在服务器上构建。

---

## 9. 部署检查清单

```
[ ] python/requirements.txt 已创建
[ ] python/Dockerfile 已创建
[ ] compose.yaml 已添加 python 服务
[ ] frontend/Dockerfile 已添加 PYTHON_API_URL
[ ] build.yml 已添加 Python 构建步骤
[ ] 数据库表 oss_scan_logs 已创建
[ ] 本地 docker-compose up -d 测试通过
[ ] GitHub Secrets 已配置 ALIYUN_HOST, ALIYUN_USER, ALIYUN_PASSWORD
[ ] push 到 main 分支，CI 运行成功
[ ] 线上验证 http://47.242.21.40:8000/health 返回 {"status":"ok"}
```

---

## 10. 关键概念

### 为什么 Python 服务单独一个容器？

1. **隔离**：安全工具可能有漏洞，不会影响主业务
2. **独立扩缩容**：安全扫描是突发流量，单独扩缩
3. **独立更新**：安全工具更新不需要重启主后端
4. **资源限制**：可以单独限制 CPU/内存

### 为什么用 uvicorn 而不是 gunicorn？

- uvicorn 支持 async/await，性能好
- `uvicorn[standard]` 包含 httpx 等异步依赖
- gunicorn 更适合 Django（同步），FastAPI 推荐 uvicorn

### 为什么用 `--no-cache-dir`？

减少镜像体积，pip 缓存 (~100MB) 对运行无用且占用空间。