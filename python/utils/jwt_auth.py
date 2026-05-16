import jwt
from fastapi import HTTPException, Request
from config import JWT_SECRET

class JWTAuth:
    """JWT 认证"""
    @staticmethod
    def decode_token(token: str) -> dict:
        """解码 JWT 令牌"""
        try:
            return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token 已过期")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="无效的 Token")
        
    @staticmethod
    def get_user_id(token: str) -> int:
        """从 JWT 令牌中获取用户 ID"""
        payload = JWTAuth.decode_token(token)
        user_id = payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token 中没有用户信息")
        return int(user_id)

async def get_current_user_id(request: Request) -> int:
    """FastAPI 依赖 - 获取当前用户 ID"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少或无效的 Authorization 头")
    token = auth_header.replace("Bearer ", "")
    return JWTAuth.get_user_id(token)

