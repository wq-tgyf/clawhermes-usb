#!/usr/bin/env python3
"""
即梦AI视频生成 - 通过NewAPI调用Seedance
"""
import urllib.request
import json
import sys

def generate_video(prompt, api_key, base_url="http://47.110.87.12:3000", model="seedance-2.0-fast"):
    """调用即梦视频生成API"""
    
    endpoint = f"{base_url}/v1/video/generations"
    
    payload = {
        "model": model,
        "prompt": prompt
    }
    
    data = json.dumps(payload).encode('utf-8')
    
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {"error": f"HTTP {e.code}", "details": error_body}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python jimeng_video.py <提示词> [api_key]")
        sys.exit(1)
    
    prompt = sys.argv[1]
    api_key = sys.argv[2] if len(sys.argv) > 2 else "sk-p4ZXfj5d8Nst53uW69ICp9kt9JUzYrWSGwen2Lx0jNiZpXdQ"
    
    result = generate_video(prompt, api_key)
    print(json.dumps(result, indent=2, ensure_ascii=False))
