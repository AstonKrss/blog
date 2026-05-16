from dotenv import load_dotenv
import os

load_dotenv()

# 数据库配置（从环境变量读取，必须配置）
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "charset": "utf8mb4"
}

# JWT 配置
JWT_SECRET = os.getenv("JWT_SECRET")

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