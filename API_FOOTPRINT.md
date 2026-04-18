# 足迹地图 API 文档（新版）

## 数据库表结构

```sql
CREATE TABLE IF NOT EXISTS user_footprint (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    province VARCHAR(50) NOT NULL COMMENT '省份',
    city VARCHAR(100) COMMENT '城市（可选，不填表示整个省份）',
    description VARCHAR(500) COMMENT '描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_province (user_id, province),
    INDEX idx_user_id (user_id)
);
```

## API 接口

### 1. 获取足迹列表

**请求**
```
GET /api/footprints
GET /api/public/footprints  (公开接口，无需登录，返回管理员足迹)
```

**Headers**
```
Authorization: Bearer <token>  (可选)
```

**响应**
```json
{
    "code": 0,
    "message": "success",
    "data": [
        {
            "id": "uuid",
            "userId": "user-uuid",
            "province": "广东",
            "city": "广州",
            "description": "广州之旅",
            "createdAt": "2024-01-01T00:00:00"
        },
        {
            "id": "uuid",
            "userId": "user-uuid",
            "province": "北京",
            "city": null,
            "description": "北京之旅",
            "createdAt": "2024-01-01T00:00:00"
        }
    ]
}
```

**说明**
- `city` 为 `null` 时表示访问了整个省份
- `city` 有值时表示访问了具体城市

### 2. 添加足迹（需登录）

**请求**
```
POST /api/footprints
```

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body（添加整个省份）**
```json
{
    "province": "北京",
    "city": null,
    "description": "首都之旅"
}
```

**Body（添加具体城市）**
```json
{
    "province": "广东",
    "city": "广州",
    "description": "广州塔一日游"
}
```

**响应**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "id": "uuid",
        "userId": "user-uuid",
        "province": "广东",
        "city": "广州",
        "description": "广州塔一日游",
        "createdAt": "2024-01-01T00:00:00"
    }
}
```

### 3. 删除足迹（需登录）

**请求**
```
DELETE /api/footprints/{id}
```

**Headers**
```
Authorization: Bearer <token>
```

**响应**
```json
{
    "code": 0,
    "message": "success",
    "data": null
}
```

### 4. 更新足迹描述（需登录）

**请求**
```
PUT /api/footprints/{id}
```

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**
```json
{
    "description": "新描述"
}
```

**响应**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "id": "uuid",
        "description": "新描述"
    }
}
```

## 逻辑说明

1. **未登录用户**：访问 `/api/public/footprints` 返回管理员（第一个用户）的足迹数据
2. **已登录用户**：访问 `/api/footprints` 返回当前用户的足迹数据
3. **前端交互**：
   - 左键点击省份 → 显示该省份的城市列表，用户选择后添加
   - 右键点击省份 → 直接添加整个省份为足迹（不选城市）
   - 省份已访问过 → 地图上显示不同颜色