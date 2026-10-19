#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
视频生成技能 - 调用即梦Seedance等视频生成API
"""
import urllib.request
import json
import ssl
import os
import sys

def load_config():
    """加载配置"""
    config_paths = [
        os.path.expanduser("~/memory/video-config.json"),
        "H:/data/.openclaw/workspace/memory/video-config.json",
        "./video-config.json",
    ]
    
    default_config = {
        "api_key": "sk-p4ZXfj5d8Nst53uW69ICp9kt9JUzYrWSGwen2Lx0jNiZpXdQ",
        "base_url": "http://47.110.87.12:3000",
        "model": "seedance-2.0-fast"
    }
    
    for path in config_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
    
    return default_config

def generate_video(prompt, config=None):
    """生成视频"""
    if config is None:
        config = load_config()
    
    api_key = config.get("api_key")
    base_url = config.get("base_url", "http://47.110.87.12:3000").rstrip("/")
    model = config.get("model", "seedance-2.0-fast")
    
    # 尝试多个可能的端点
    endpoints = [
        f"{base_url}/v1/video/generations",
        f"{base_url}/v1/videos/generations",
        f"{base_url}/api/video/generate",
    ]
    
    payload = {
        "model": model,
        "prompt": prompt,
    }
    
    data = json.dumps(payload).encode('utf-8')
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    for endpoint in endpoints:
        try:
            req = urllib.request.Request(
                endpoint,
                data=data,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=60, context=ctx) as response:
                result = json.loads(response.read().decode('utf-8'))
                return {
                    "success": True,
                    "endpoint": endpoint,
                    "result": result
                }
        except urllib.error.HTTPError as e:
            error = e.read().decode('utf-8')
            if e.code == 404:
                continue  # 尝试下一个端点
            return {
                "success": False,
                "endpoint": endpoint,
                "error": f"HTTP {e.code}",
                "details": error
            }
        except Exception as e:
            return {
                "success": False,
                "endpoint": endpoint,
                "error": str(e)
            }
    
    return {
        "success": False,
        "error": "所有端点都不可用"
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python video_generation.py <提示词>")
        sys.exit(1)
    
    prompt = sys.argv[1]
    print(f"生成视频: {prompt}\n")
    
    result = generate_video(prompt)
    print(json.dumps(result, indent=2, ensure_ascii=False))
