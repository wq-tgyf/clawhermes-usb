# 第三方组件声明

本项目以「便携编排层」形式分发，不 fork 上游应用。以下上游组件的许可证义务由本项目承接。

## 上游应用（apps/ 目录，交付版以预构建产物分发）

| 组件 | 许可证 | 版权 | 上游来源 |
|---|---|---|---|
| OpenClaw | MIT | Copyright (c) 2025 Peter Steinberger | https://github.com/openclaw/openclaw |
| Hermes Agent | MIT | Copyright (c) 2025 Nous Research | https://github.com/NousResearch/hermes-agent |
| hermes-web-ui | MIT | Copyright (c) 2025 EKKOLearnAI | https://github.com/EKKOLearnAI/hermes-web-ui |

三个组件的完整许可证文本分别位于：
- `apps/openclaw/LICENSE`
- `apps/hermes-agent/LICENSE`
- `apps/hermes-web-ui/LICENSE`

**分发要求**：若对外分发包含上述组件的交付包，必须随包附带对应的 LICENSE 文本与版权声明。

## 运行时与框架

| 组件 | 许可证 | 说明 |
|---|---|---|
| Node.js | MIT | 运行时，`runtimes/` 下以未修改二进制分发 |
| Electrobun | 见上游仓库 | 控制中心桌面壳框架，`ClawHermes-Control-*` 产物内嵌 |
| Bun | MIT | `bin/bun.exe` 运行时 |
| Vue 3.5.34 | MIT | UI 框架（打包进 `views/mainview`） |

## 复刻产物（replica/ 目录）

`replica/` 是对 `ClawHermes-Control-Electrobun-Setup.tar.zst` 中业务逻辑段的**独立复刻实现**，
通过静态逆向分析（REA）得出，**不包含任何第三方代码副本**。

| 项 | 说明 |
|---|---|
| 复刻对象 | `ClawHermes-Control-Electrobun-Setup.tar.zst`（SHA-256 `5B501B5C...CEC5947`） |
| 复刻内容 | 23 个业务函数 + 19 个 RPC handler + 输出契约 |
| 未复制内容 | Electrobun 框架代码、UI 打包产物、原生 DLL |
| 许可证 | 与本项目一致（Apache-2.0） |

> **合规提示**：复刻产物的公开发布须由项目责任人单独评估，本文档不构成法律意见。

## 技能包（skills/ 目录）

`skills/` 共 88 个技能（含 `SKILL.md`），另有 `references/`、`scripts/` 两个共享目录，不属于技能。

来源与许可证现状：

- 23 个 `.clawhub/origin.json` 记录安装来源，去重后为 20 个技能（`multi-search-engine`、`openclaw-tavily-search`、`skill-vetter` 各含一份同名嵌套副本）。
- 仅 `skills/skill-creator/license.txt` 附带完整许可证文本（Apache-2.0）。
- 其余技能目录未附带 LICENSE 文件，其中 4 个在 `SKILL.md` 内含许可证字段。

| 技能 | 版本 | 来源 |
|---|---|---|
| agent-browser | 0.2.0 | https://clawhub.ai |
| gog | 1.0.0 | https://clawhub.ai |
| healthcheck | 1.0.2 | https://clawhub.ai |
| mcporter | 1.0.0 | https://clawhub.ai |
| memory-setup | 1.0.0 | https://clawhub.ai |
| multi-search-engine | 2.0.1 | https://clawhub.ai |
| nano-banana-pro | 1.0.1 | https://clawhub.ai |
| nano-pdf | 1.0.0 | https://clawhub.ai |
| obsidian | 1.0.0 | https://clawhub.ai |
| openclaw-agent-browser | 1.0.0 | https://clawhub.ai |
| openclaw-tavily-search | 0.1.0 | https://clawhub.ai |
| ppt | 1.0.0 | https://clawhub.ai |
| proactive-agent | 3.1.0 | https://clawhub.ai |
| self-improving-agent-cn | 1.0.0 | https://clawhub.ai |
| skill-creator-2 | 0.1.0 | https://clawhub.ai |
| skill-vetter | 1.0.0 | https://clawhub.ai |
| summarize | 1.0.0 | https://clawhub.ai |
| tencent-docs | 1.0.31 | https://clawhub.ai |
| video-download | 0.1.5 | https://clawhub.ai |
| weather | 1.0.0 | https://clawhub.ai |

> **合规提示**：上表仅记录可追溯来源；未登记来源的其余技能不视为本项目作品，对外分发前须逐一补齐许可证与版权信息。

## 备注

本文件在 `apps/` 被 `.gitignore` 排除的情况下仍然重要 —— 它记录了交付包中实际分发的上游组件，
保证接收方能够追溯许可证来源。
