# python/modules/oss/bucket.py
"""
Bucket 扫描器
"""

import httpx
import logging
import re
import itertools
import os
from typing import Dict, Optional, List
from typing import Union

logger = logging.getLogger(__name__)

# 最大生成数量限制
MAX_GENERATE_COUNT = 50000

# 内置词表路径
DEFAULT_WORDLIST_DIR = os.path.join(os.path.dirname(__file__), '..', 'wordlists')


class BucketScanner:
    """Bucket 扫描器"""

    def __init__(self, region: str, timeout: int = 3):
        self.region = region
        self.endpoint = f"{region}.aliyuncs.com"
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def close(self):
        await self.client.aclose()

    async def check(self, bucket_name: str) -> Optional[Dict]:
        """检查单个 Bucket"""
        url = f"https://{bucket_name}.{self.endpoint}"

        try:
            resp = await self.client.get(url, follow_redirects=False)
            text = resp.text

            if "NoSuchBucket" in text:
                return {
                    "found": True,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "not_exist",
                    "can_takeover": True,
                    "url": url
                }
            elif "InvalidBucketName" in text:
                return {
                    "found": False,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "invalid"
                }
            elif "AccessDenied" in text:
                return {
                    "found": True,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "exist_private",
                    "url": url
                }
            elif resp.status_code == 200:
                return {
                    "found": True,
                    "type": "bucket",
                    "name": bucket_name,
                    "status": "exist_public",
                    "url": url
                }
        except httpx.TimeoutException:
            logger.debug(f"Bucket 检测超时: {url}")
        except httpx.RequestError as e:
            logger.debug(f"Bucket 检测请求错误 {url}: {e}")
        return None


def _load_wordlist(filename: str) -> List[str]:
    """从文件加载词表"""
    paths_to_try = [
        filename,
        os.path.join(DEFAULT_WORDLIST_DIR, filename),
        os.path.join(DEFAULT_WORDLIST_DIR, f"{filename}.txt"),
        os.path.join(os.path.dirname(__file__), '..', '..', 'wordlists', filename),
        os.path.join(os.path.dirname(__file__), '..', '..', 'wordlists', f"{filename}.txt"),
    ]

    for path in paths_to_try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                return [line.strip() for line in f if line.strip()]

    logger.warning(f"词表文件不存在: {filename}")
    return []


def _generate_numbers(start: int, end: int, padding: int = 0, step: int = 1) -> List[str]:
    """生成数字序列"""
    if padding == 0:
        padding = len(str(end))

    numbers = []
    for i in range(start, min(end, start + MAX_GENERATE_COUNT) + 1, step):
        numbers.append(str(i).zfill(padding))
    return numbers


def _generate_letters(letters_type: str) -> List[str]:
    """生成字母序列"""
    if letters_type == 'a':
        return [chr(c) for c in range(ord('a'), ord('z') + 1)]
    elif letters_type == 'A':
        return [chr(c) for c in range(ord('A'), ord('Z') + 1)]
    elif letters_type == 'aA' or letters_type == 'Aa':
        result = []
        for c in range(ord('a'), ord('z') + 1):
            result.append(chr(c))
            result.append(chr(c).upper())
        return result
    elif letters_type == '0-9':
        return [str(c) for c in range(10)]
    return []


def generate_bucket_names(
    mode: str = "pattern",
    pattern: str = "",
    start: int = 1,
    end: int = 999,
    padding: int = 0,
    step: int = 1,
    letters: str = "",
    prefix: str = "",
    suffix: str = "",
    wordlist_file: str = "",
    custom_list: str = "",
    max_count: int = MAX_GENERATE_COUNT
) -> List[str]:
    """根据配置生成 Bucket 名称列表

    参数:
        mode: 模式
            - "pattern": 使用模式生成，如 mybucket{i}
            - "numbers": 仅数字
            - "letters": 仅字母
            - "combo": 数字+字母组合
            - "wordlist": 从词表文件加载
            - "custom": 自定义列表（逗号分隔）

        pattern: 模式字符串，支持:
            - {i} → 数字
            - {a} → 小写字母
            - {A} → 大写字母
            - {d} → 数字 0-9

        start/end: 数字范围
        padding: 数字位数（如 4 → 0001）
        step: 数字步长
        letters: 字母类型 (a/A/aA/0-9)
        prefix/suffix: 前后缀
        wordlist_file: 词表文件名
        custom_list: 自定义列表（逗号分隔）
        max_count: 最大生成数量

    示例:
        # 数字 1-1000，带前导零
        generate(mode="numbers", start=1, end=1000, padding=4)
        → ['0001', '0002', ..., '1000']

        # 小写字母 a-z
        generate(mode="letters", letters="a")
        → ['a', 'b', 'c', ..., 'z']

        # 组合: test + 数字
        generate(mode="combo", start=1, end=100, prefix="test", suffix="_bak")
        → ['test1_bak', 'test2_bak', ..., 'test100_bak']

        # 词表文件
        generate(mode="wordlist", wordlist_file="common_bucket_names.txt")
        → ['mybucket', 'backup', ...]

        # 自定义列表
        generate(mode="custom", custom_list="bucket1,bucket2,bucket3")
        → ['bucket1', 'bucket2', 'bucket3']
    """
    names = []

    if mode == "numbers":
        # 仅数字模式
        numbers = _generate_numbers(start, end, padding, step)
        for num in numbers:
            name = f"{prefix}{num}{suffix}"
            names.append(name)
            if len(names) >= max_count:
                logger.warning(f"生成数量超过限制 ({max_count})，停止")
                break
        return names

    elif mode == "letters":
        # 仅字母模式
        chars = _generate_letters(letters)
        for char in chars:
            name = f"{prefix}{char}{suffix}"
            names.append(name)
            if len(names) >= max_count:
                break
        return names

    elif mode == "combo":
        # 数字+字母组合
        number_list = _generate_numbers(start, end, padding, step)
        char_list = _generate_letters(letters) if letters else [""]

        # 计算总数
        total = len(number_list) * len(char_list)
        if total > max_count:
            logger.warning(f"组合数量 ({total}) 超过限制 ({max_count})，限制数字范围")
            max_numbers = max_count // len(char_list)
            number_list = number_list[:max_numbers]

        for num in number_list:
            for char in char_list:
                name = f"{prefix}{num}{char}{suffix}"
                names.append(name)
                if len(names) >= max_count:
                    break
            if len(names) >= max_count:
                break
        return names

    elif mode == "wordlist":
        # 从词表加载
        if wordlist_file:
            wordlist = _load_wordlist(wordlist_file)
            for word in wordlist:
                name = f"{prefix}{word}{suffix}"
                names.append(name)
                if len(names) >= max_count:
                    break
        return names

    elif mode == "custom":
        # 自定义列表
        items = [item.strip() for item in custom_list.split(',') if item.strip()]
        for item in items:
            name = f"{prefix}{item}{suffix}"
            names.append(name)
            if len(names) >= max_count:
                break
        return names

    else:  # mode == "pattern"
        # 模式解析
        return _generate_from_pattern(pattern, prefix, suffix, start, end, padding, step, max_count)


def _generate_from_pattern(pattern: str, prefix: str, suffix: str, start: int, end: int, padding: int, step: int, max_count: int) -> List[str]:
    """从模式字符串生成"""
    names = []

    # 检查模式中是否有范围限制
    range_m = re.search(r'\{i:(\d+):(\d+)\}', pattern)

    if range_m:
        # 有明确范围 {i:1:100}
        start_num = int(range_m.group(1))
        end_num = int(range_m.group(2))
        pad = padding if padding else len(str(end_num))

        # 安全检查
        total_range = end_num - start_num + 1
        if total_range > 100000:
            logger.warning(f"数字范围太大 ({total_range})，限制为 100000")
            end_num = start_num + 99999

        # 查找其他变量
        extra_vars = []
        for m in re.finditer(r'\{([aAdD])\}', pattern):
            var = m.group(1)
            if var not in ('i',) and var not in extra_vars:
                extra_vars.append(var)

        if extra_vars:
            char_lists = [_generate_letters(v) for v in extra_vars]
            for i in range(start_num, end_num + 1, step):
                i_val = str(i).zfill(pad)
                for combo in itertools.product(*char_lists):
                    name = pattern
                    name = re.sub(r'\{i:\d+:\d+\}', i_val, name)
                    for idx, var in enumerate(extra_vars):
                        name = name.replace(f'{{{var}}}', combo[idx])
                    names.append(f"{prefix}{name}{suffix}")
                    if len(names) >= max_count:
                        break
                if len(names) >= max_count:
                    break
        else:
            for i in range(start_num, end_num + 1, step):
                name = pattern
                name = re.sub(r'\{i:\d+:\d+\}', str(i).zfill(pad), name)
                names.append(f"{prefix}{name}{suffix}")
                if len(names) >= max_count:
                    break
        return names

    # 检查补零格式 {i:4}
    zp_m = re.search(r'\{i:(\d+)\}', pattern)
    if zp_m:
        pad = int(zp_m.group(1))
        actual_end = min(end, int('9' * pad))
        for i in range(start, actual_end + 1, step):
            name = pattern
            name = re.sub(r'\{i:\d+\}', str(i).zfill(pad), name)
            names.append(f"{prefix}{name}{suffix}")
            if len(names) >= max_count:
                break
        return names

    # 检查双变量 {i}{j}
    if '{i}{j}' in pattern:
        pad = padding if padding else len(str(end))
        for i in range(start, min(end, 9999) + 1, step):
            for j in range(10):
                name = pattern.replace('{i}', str(i).zfill(pad)).replace('{j}', str(j))
                names.append(f"{prefix}{name}{suffix}")
                if len(names) >= max_count:
                    break
            if len(names) >= max_count:
                break
        return names

    # 检查 {a}{i} 等混合
    mixed_m = re.search(r'\{([aAdD])\}\{i\}', pattern)
    if mixed_m:
        var = mixed_m.group(1)
        chars = _generate_letters(var)
        pad = padding if padding else len(str(end))
        for char in chars:
            for i in range(start, min(end, 9999) + 1, step):
                name = pattern.replace(f'{{{var}}}{{i}}', f'{char}{str(i).zfill(pad)}')
                names.append(f"{prefix}{name}{suffix}")
                if len(names) >= max_count:
                    break
            if len(names) >= max_count:
                break
        return names

    # 单变量 {i}
    if '{i}' in pattern:
        pad = padding if padding else len(str(end))
        for i in range(start, min(end, 999999) + 1, step):
            name = pattern.replace('{i}', str(i).zfill(pad))
            names.append(f"{prefix}{name}{suffix}")
            if len(names) >= max_count:
                break
        return names

    # 其他变量
    if re.search(r'\{[aAdD]\}', pattern):
        extra_vars = re.findall(r'\{([aAdD])\}', pattern)
        char_lists = [_generate_letters(v) for v in extra_vars]
        for combo in itertools.product(*char_lists):
            name = pattern
            for idx, var in enumerate(extra_vars):
                name = name.replace(f'{{{var}}}', combo[idx])
            names.append(f"{prefix}{name}{suffix}")
            if len(names) >= max_count:
                break
        return names

    # 无变量
    names.append(f"{prefix}{pattern}{suffix}")
    return names


def _generate_var_values(var_config: dict) -> List[str]:
    """根据变量配置生成值列表"""
    mode = var_config.get('mode', 'numbers')
    start = var_config.get('start', 1)
    end = var_config.get('end', 100)
    padding = var_config.get('padding', 0)
    letters = var_config.get('letters', 'a')
    custom = var_config.get('custom', '')

    if mode == 'numbers':
        return _generate_numbers(start, end, padding)
    elif mode == 'letters':
        return _generate_letters(letters)
    elif mode == 'combo':
        numbers = _generate_numbers(start, end, padding)
        chars = _generate_letters(letters) if letters else ['']
        result = []
        for num in numbers:
            for char in chars:
                result.append(f"{num}{char}")
        return result
    elif mode == 'custom':
        return [item.strip() for item in custom.split(',') if item.strip()]
    elif mode == 'wordlist':
        wordlist_file = var_config.get('wordlist_file', '')
        return _load_wordlist(wordlist_file)
    else:
        return [str(start)]


def generate_urls_from_template(url_template: str, var1: dict, var2: dict = None) -> List[str]:
    """从 URL 模板生成完整 URL 列表

    参数:
        url_template: URL 模板，如 https://${bucket}.oss-cn-chengdu.aliyuncs.com/${file}
        var1: 变量1配置 {name, mode, start, end, padding, letters, custom}
        var2: 变量2配置（可选）

    示例:
        template = "https://${bucket}.aliyuncs.com/${file}"
        var1 = {'name': 'bucket', 'mode': 'numbers', 'start': 1, 'end': 3, 'padding': 2}
        var2 = {'name': 'file', 'mode': 'custom', 'custom': 'a.txt,b.txt,c.txt'}
        generate_urls_from_template(template, var1, var2)
        → ['https://01.aliyuncs.com/a.txt', 'https://01.aliyuncs.com/b.txt', ...]
    """
    import re

    urls = []
    var1_name = var1.get('name', 'var1')
    var1_values = _generate_var_values(var1)

    if var2:
        var2_name = var2.get('name', 'var2')
        var2_values = _generate_var_values(var2)
    else:
        var2_name = None
        var2_values = [None]

    total = len(var1_values) * len(var2_values)
    if total > MAX_GENERATE_COUNT:
        logger.warning(f"URL 模板生成数量 ({total}) 超过限制 ({MAX_GENERATE_COUNT})，将限制为 {MAX_GENERATE_COUNT}")

    count = 0
    for v1 in var1_values:
        for v2 in var2_values:
            if count >= MAX_GENERATE_COUNT:
                break
            url = url_template
            url = url.replace(f'${{{var1_name}}}', str(v1))
            if var2_name:
                url = url.replace(f'${{{var2_name}}}', str(v2))
            urls.append(url)
            count += 1
        if count >= MAX_GENERATE_COUNT:
            break

    return urls


def list_wordlists() -> List[Dict]:
    """列出可用的词表"""
    wordlists = []
    search_dirs = [
        DEFAULT_WORDLIST_DIR,
        os.path.join(os.path.dirname(__file__), '..', '..', 'wordlists'),
    ]

    for directory in search_dirs:
        if os.path.exists(directory):
            for filename in os.listdir(directory):
                if filename.endswith('.txt') or filename.endswith('.lst'):
                    filepath = os.path.join(directory, filename)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        line_count = sum(1 for _ in f)
                    wordlists.append({
                        "name": filename,
                        "path": filepath,
                        "count": line_count
                    })

    return wordlists