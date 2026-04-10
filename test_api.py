import requests
import json
import time

BASE_URL = "http://localhost:8080"


def test_create_post():
    login_data = {"username": "admin", "password": "admin123"}

    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print("登录响应:", response.status_code)

    if response.status_code != 200:
        print("登录失败:", response.text)
        return

    data = response.json()
    token = data.get("data", {}).get("token")
    user_id = data.get("data", {}).get("user", {}).get("id")

    print(f"Token: {token[:20]}...")
    print(f"User ID: {user_id}")

    if not token or not user_id:
        print("登录响应没有token或user_id")
        return

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 用时间戳生成唯一slug
    slug = f"test-post-{int(time.time())}"

    post_data = {
        "title": "测试文章",
        "slug": slug,
        "excerpt": "文章摘要",
        "content": "# Markdown 内容",
        "status": "PUBLISHED",
    }

    response = requests.post(f"{BASE_URL}/api/posts", json=post_data, headers=headers)
    print(f"\n创建文章响应: {response.status_code}")
    print(response.text)


if __name__ == "__main__":
    test_create_post()
