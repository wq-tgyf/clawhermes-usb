---
name: video-generation
description: 视频生成技能 - 支持即梦Seedance等视频生成模型。通过直接调用视频生成API，绕过OpenClaw的文本模型限制，实现文生视频功能。
---

# 视频生成技能

## 功能

支持通过 NewAPI 等平台调用即梦 Seedance 视频生成模型。

## 配置

在 `memory/video-config.json` 中配置：

```json
{
  "api_key": "your-api-key",
  "base_url": "http://47.110.87.12:3000",
  "model": "seedance-2.0-fast"
}
```

## 使用方式

在对话中直接说：
- "生成视频：唯美治愈风，长发女生漫步海边沙滩"
- "用即梦生成视频：一只猫咪在樱花树下玩耍"

## 支持的平台

- NewAPI (new-api)
- 即梦官方 API
- 其他 OpenAI 兼容的视频生成接口
