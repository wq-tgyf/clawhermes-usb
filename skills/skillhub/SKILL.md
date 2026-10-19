---
name: skillhub
description: Browse and install AI skills from SkillHub (skillhub.tencent.com), the curated skill marketplace for Chinese users. Use when user wants to find new skills, browse the skill store, or install skills from SkillHub.
---

# SkillHub 技能商店

浏览和安装来自 [SkillHub](https://skillhub.tencent.com/) 的 AI 技能。

SkillHub 是面向中国用户的 AI 技能社区，精选 Top 50 高质量 AI Skills，经过安全审核与多维度评估。

## 使用方式

### 浏览技能
访问 https://skillhub.tencent.com/ 浏览所有可用技能。

### 安装技能
使用 ClawHub CLI 安装：

```bash
clawhub install <skill-name>
```

### 搜索技能

```bash
clawhub search <keyword>
```

### 更新已安装技能

```bash
clawhub update <skill-name>
```

## 热门技能推荐

- **Summarize** — 网页/文档/视频智能总结
- **Agent Browser** — 浏览器自动化操作
- **Github** — GitHub 仓库管理自动化
- **Weather** — 实时天气查询
- **Nano PDF** — PDF 文档处理
- **Nano Banana Pro** — AI 图片生成与编辑
- **Obsidian** — Obsidian 笔记管理
- **OpenAI Whisper** — 语音转文字

## 注意事项

- 安装新技能需要网络连接
- 首次使用 clawhub 可能需要安装：`npm i -g clawhub`
- 技能安装到 OpenClaw 的 skills 目录，重启后生效
