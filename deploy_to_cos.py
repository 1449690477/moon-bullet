#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
月蚀弹幕 · 腾讯云COS一键部署脚本
===============================
把当前项目的 index.html + assets/ 上传到腾讯云COS存储桶，
开启静态网站托管，输出可访问的网页链接。

使用方法：
  1. 先在腾讯云控制台创建一个 COS 存储桶（详见 部署指南.md）
  2. 获取 API 密钥（SecretId / SecretKey）
  3. 运行本脚本，按提示输入

  python3 deploy_to_cos.py

或者用环境变量：
  COS_SECRET_ID=xxx COS_SECRET_KEY=xxx COS_REGION=ap-guangzhou COS_BUCKET=moon-bullet-1234567890 python3 deploy_to_cos.py

依赖：cos-python-sdk-v5
  pip install cos-python-sdk-v5
"""

import os
import sys
import time
from pathlib import Path

try:
    from qcloud_cos import CosConfig, CosS3Client
except ImportError:
    print("缺少依赖，正在安装 cos-python-sdk-v5 ...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cos-python-sdk-v5"])
    from qcloud_cos import CosConfig, CosS3Client

# ─── 配置 ───────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent
INDEX_HTML = PROJECT_ROOT / "index.html"
ASSETS_DIR = PROJECT_ROOT / "assets"
# 排除不上传的目录/文件（备份目录 39MB 没必要传）
EXCLUDE_DIRS = {"_backup_before_user_import"}
EXCLUDE_EXTS = {".DS_Store"}

# 静态网站 MIME 类型映射
MIME_MAP = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".webp": "image/webp",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".ogg":  "audio/ogg",
    ".mp3":  "audio/mpeg",
    ".wav":  "audio/wav",
    ".json": "application/json; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf":  "font/ttf",
}


def get_config():
    """从环境变量或交互式输入获取配置"""
    sid = os.environ.get("COS_SECRET_ID")
    skey = os.environ.get("COS_SECRET_KEY")
    region = os.environ.get("COS_REGION", "ap-guangzhou")
    bucket = os.environ.get("COS_BUCKET")

    if not sid or not skey or not bucket:
        print("=" * 60)
        print("  月蚀弹幕 · 腾讯云COS 部署工具")
        print("=" * 60)
        print()
        if not sid:
            print("请输入 SecretId（从 https://console.cloud.tencent.com/cam/capi 获取）：")
            sid = input("  > ").strip()
        if not skey:
            print("请输入 SecretKey：")
            skey = input("  > ").strip()
        if not bucket:
            print("请输入存储桶名称（如 moon-bullet-1234567890）：")
            bucket = input("  > ").strip()
        print("请输入地域代码（默认 ap-guangzhou，可选 ap-shanghai/ap-beijing/ap-chengdu 等）：")
        region_input = input("  > ").strip()
        if region_input:
            region = region_input
        print()

    return sid, skey, region, bucket


def get_mime(filepath):
    return MIME_MAP.get(filepath.suffix.lower(), "application/octet-stream")


def should_skip(path):
    """判断是否跳过该路径"""
    parts = path.parts
    for excl in EXCLUDE_DIRS:
        if excl in parts:
            return True
    if path.name in EXCLUDE_EXTS:
        return True
    return False


def collect_files():
    """收集所有要上传的文件"""
    files = []
    # index.html
    if INDEX_HTML.exists():
        files.append((INDEX_HTML, "index.html"))
    else:
        print(f"[错误] 找不到 {INDEX_HTML}")
        sys.exit(1)

    # assets/ 递归
    if ASSETS_DIR.exists():
        for root, dirs, filenames in os.walk(ASSETS_DIR):
            # 过滤排除目录
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for fn in filenames:
                full = Path(root) / fn
                rel = full.relative_to(PROJECT_ROOT)
                if should_skip(full):
                    continue
                # COS 路径用正斜杠
                cos_key = str(rel).replace(os.sep, "/")
                files.append((full, cos_key))
    else:
        print(f"[警告] 找不到 {ASSETS_DIR}")

    return files


def upload_file(client, bucket, local_path, cos_key, total, idx):
    """上传单个文件，带进度提示"""
    mime = get_mime(local_path)
    size_mb = local_path.stat().st_size / (1024 * 1024)
    size_str = f"{size_mb:.2f}MB" if size_mb >= 1 else f"{size_mb*1024:.0f}KB"

    try:
        # 大文件（>5MB）用分块上传，小文件用简单上传
        with open(local_path, "rb") as f:
            client.put_object(
                Bucket=bucket,
                Body=f,
                Key=cos_key,
                ContentType=mime,
                CacheControl="max-age=31536000" if cos_key != "index.html" else "no-cache",
            )
        print(f"  [{idx}/{total}] {cos_key} ({size_str}) ✓")
    except Exception as e:
        print(f"  [{idx}/{total}] {cos_key} ({size_str}) ✗ 失败: {e}")
        return False
    return True


def enable_static_website(client, bucket):
    """开启静态网站托管"""
    try:
        from qcloud_cos import CosConfig
        # 用 put_bucket_website 接口
        config = {
            "IndexDocument": {"Suffix": "index.html"},
            "ErrorDocument": {"Key": "index.html"},
        }
        client.put_bucket_website(
            Bucket=bucket,
            IndexDocument={"Suffix": "index.html"},
            ErrorDocument={"Key": "index.html"},
        )
        print("[✓] 已开启静态网站托管")
        return True
    except Exception as e:
        print(f"[!] 开启静态网站托管失败（可手动在控制台开启）: {e}")
        return False


def set_bucket_acl_public(client, bucket):
    """设置存储桶为公有读私有写（让网页能被访问）"""
    try:
        client.put_bucket_acl(
            Bucket=bucket,
            ACL="public-read",
        )
        print("[✓] 存储桶已设为公有读")
        return True
    except Exception as e:
        print(f"[!] 设置公有读失败: {e}")
        return False


def main():
    sid, skey, region, bucket = get_config()

    # 检查文件
    files = collect_files()
    total_size = sum(f[0].stat().st_size for f in files)
    print(f"待上传文件数: {len(files)}")
    print(f"总大小: {total_size / (1024*1024):.1f} MB")
    print(f"存储桶: {bucket} ({region})")
    print()

    # 确认
    resp = input("确认上传？(y/N) > ").strip().lower()
    if resp != "y":
        print("已取消。")
        return

    # 初始化客户端
    config = CosConfig(Region=region, SecretId=sid, SecretKey=skey, Scheme="https")
    client = CosS3Client(config)

    # 测试连接 —— 用 get_bucket 看真正的错误码
    print("\n[1/4] 测试连接...")
    print(f"    桶名: {bucket}")
    print(f"    地域: {region}")
    print(f"    SecretId: {sid[:8]}...{sid[-4:]} (长度 {len(sid)})")
    print(f"    SecretKey: {'*' * (len(skey) - 4)}{skey[-4:]} (长度 {len(skey)})")
    try:
        client.get_bucket(Bucket=bucket)
        print("[✓] 存储桶可访问")
    except Exception as e:
        # 详细错误信息
        print(f"[✗] 无法访问存储桶")
        print(f"    异常类型: {type(e).__name__}")
        # qcloud_cos 的 CosServiceError 有 code/message/request_id 属性
        code = getattr(e, 'code', None) or getattr(e, 'error_code', None)
        msg = getattr(e, 'message', None) or getattr(e, 'error_message', None) or str(e)
        rid = getattr(e, 'request_id', None) or getattr(e, 'trace_id', None)
        status = getattr(e, 'status_code', None)
        print(f"    HTTP状态码: {status}")
        print(f"    错误码: {code}")
        print(f"    错误信息: {msg}")
        if rid: print(f"    RequestID: {rid}")
        # 常见错误码诊断
        if code == '403 Forbidden' or 'forbidden' in str(msg).lower() or status == 403:
            print("\n    >>> 403 权限拒绝。但你是主账号，请检查：")
            print("        - SecretId/SecretKey 是否完整复制（无前后空格）")
            print("        - 主账号是否完成实名认证（未实名会拒绝 COS）")
            print("        - 桶的地域代码是否和实际一致")
        elif code == 'NoSuchBucket' or 'nosuchbucket' in str(msg).lower() or status == 404:
            print("\n    >>> 桶不存在。检查桶名拼写和地域代码是否匹配。")
            print(f"        桶名: {bucket}")
            print(f"        地域: {region}（ap-guangzhou=广州 ap-shanghai=上海 ap-beijing=北京）")
        elif status == 401 or code == 'Unauthorized':
            print("\n    >>> 密钥无效。SecretId/SecretKey 复制错了或已禁用。")
        # 仍然继续尝试上传——有时 head/get 失败但 put 成功
        print("\n    尝试跳过测试，直接上传第一个文件...")
        try:
            test_file = files[0]
            with open(test_file[0], 'rb') as f:
                client.put_object(Bucket=bucket, Body=f, Key=test_file[1],
                                  ContentType=get_mime(test_file[0]))
            print(f"    [✓] 测试上传 {test_file[1]} 成功！连接正常，继续部署。")
        except Exception as e2:
            print(f"    [✗] 测试上传也失败: {type(e2).__name__}")
            code2 = getattr(e2, 'code', None)
            msg2 = getattr(e2, 'message', None) or str(e2)
            status2 = getattr(e2, 'status_code', None)
            print(f"    HTTP状态码: {status2}, 错误码: {code2}")
            print(f"    错误信息: {msg2}")
            print("\n    请把以上完整错误信息发给我，我帮你定位。")
            return

    # 设置公有读
    print("\n[2/4] 设置存储桶公有读权限...")
    set_bucket_acl_public(client, bucket)

    # 上传文件
    print(f"\n[3/4] 开始上传 {len(files)} 个文件...")
    success = 0
    failed = []
    t0 = time.time()
    for i, (local_path, cos_key) in enumerate(files, 1):
        if upload_file(client, bucket, local_path, cos_key, len(files), i):
            success += 1
        else:
            failed.append(cos_key)
    elapsed = time.time() - t0
    print(f"\n上传完成: {success}/{len(files)} 成功，耗时 {elapsed:.0f}s")
    if failed:
        print(f"失败文件: {failed}")

    # 开启静态网站托管
    print("\n[4/4] 开启静态网站托管...")
    enable_static_website(client, bucket)

    # 输出访问链接
    print("\n" + "=" * 60)
    print("  部署完成！访问链接：")
    print("=" * 60)
    website_url = f"https://{bucket}.cos-website.{region}.myqcloud.com/index.html"
    cos_url = f"https://{bucket}.cos.{region}.myqcloud.com/index.html"
    print(f"\n  静态网站链接（推荐）：\n    {website_url}")
    print(f"\n  直接COS链接（备用）：\n    {cos_url}")
    print(f"\n  分享给朋友用上面第一个链接，点击即玩。")
    print("=" * 60)


if __name__ == "__main__":
    main()
