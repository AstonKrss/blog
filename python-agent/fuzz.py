# OSS CTF 练习脚本（已归档）

# 以下为历史练习记录，凭证已失效，仅保留脚本结构供学习参考。
# 原 AccessKey 已删除，使用时请通过环境变量传入自己的临时凭证。

import os

access_key_id = os.environ.get("CTF_OSS_AK", "")
access_key_secret = os.environ.get("CTF_OSS_SK", "")

if not access_key_id or not access_key_secret:
    print("请先设置环境变量 CTF_OSS_AK / CTF_OSS_SK")
    raise SystemExit(1)

endpoint = "oss-cn-chengdu.aliyuncs.com"

buckets_to_try = [
    "haobachang520",
    "haobachang522",
    "haobachang7x8x001",
    "haobachang0x0x001",
    "hbc618773"
]

print("[*] 开始检查存储桶...")

import oss2
from oss2 import ObjectIterator

for bucket_name in buckets_to_try:
    print(f"\n--- 检查: {bucket_name} ---")
    auth = oss2.Auth(access_key_id, access_key_secret)
    bucket = oss2.Bucket(auth, endpoint, bucket_name)

    try:
        for obj in ObjectIterator(bucket, max_keys=1):
            print(f"[+] 可访问! 第一个文件: {obj.key}")
            break
        else:
            print("[+] 可访问，但目录为空")

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
