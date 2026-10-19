---
name: jimeng-video
description: 即梦AI视频生成 - 使用字节跳动即梦Seedance模型生成视频。支持文生视频、图生视频、视频配音（音频素材），10秒高清画质。
---

# 即梦AI视频生成技能

## 配置

- **Base URL**: `https://sd2.mengfactory.cn`
- **API Key**: `sk-ueeTbpRAbwiopqGa3NQopQPmDOzqWaXiePXf1vDEhiGNFW9V`
- **模型**: `seedance-2.0-fast`
- **提交接口**: `POST /v1/videos`
- **查询接口**: `GET /v1/videos/{task_id}`

## 功能

1. **文生视频**：纯文本提示词生成视频
2. **图生视频**：参考图片 + 提示词生成视频
3. **视频配音**：支持上传音频文件（audio_file_1 ~ audio_file_3），总时长不超过15.4秒

## 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| model | string | 是 | 固定为 `seedance-2.0-fast` |
| prompt | string | 是 | 视频提示词 |
| duration | integer | 是 | 视频时长，4-15秒整数 |
| ratio | string | 否 | 画面比例：21:9、16:9、4:3、1:1、3:4、9:16，默认 4:3 |
| reference_mode | string | 否 | 默认 `omni_reference` |
| image_file_1 ~ image_file_9 | file/string | 否 | 参考图片，最多9张 |
| video_file_1 ~ video_file_3 | file/string | 否 | 参考视频，总时长不超过15.4秒 |
| audio_file_1 ~ audio_file_3 | file/string | 否 | 音频素材，总时长不超过15.4秒 |

## 使用方式

### 文生视频
直接告诉我想生成的视频内容，例如：
- "生成视频：唯美治愈风，长发女生漫步海边沙滩，落日晚霞氛围感"
- "用即梦生成：一只猫咪在樱花树下玩耍，镜头缓慢推进"

### 图生视频（人物动作控制）
告诉我要用的参考图和动作要求，例如：
- "让图片中的人物开始微笑，镜头缓慢推进"
- "图生视频：参考图里的人物坐在沙发上喝茶打电话"

### 视频配音
支持在生成视频时直接传入音频文件，例如：
- "生成视频：山水风景，云雾缭绕，配音：audio_file_1"

## 技术细节

- 调用端点：`POST https://sd2.mengfactory.cn/v1/videos`
- 查询端点：`GET https://sd2.mengfactory.cn/v1/videos/{task_id}`
- 音频支持：总时长不超过15.4秒
- 鉴权：`Authorization: Bearer sk-606MqnWUlVW8BQ5SirMviwwdcGIyubJVhimQUqzc4HoSSHeZ`
