# core/node/dist

> **这是编译产物，不是源码。源码位于 `core/node/src/`。**

## 这是什么

本目录包含 ClawHermes-USB 编排核心的 **34 个已编译 JavaScript 文件**，
由 `core/node/src/` 通过 `tsc` 编译生成。

## 如何构建

```bash
npm install
npm run build
```

## 如果你想修改它

修改 `core/node/src/`，不要直接改本目录；`dist/` 会在下次构建时被覆盖。

`src/` 已由原 `dist/` 迁入并全部转为 TypeScript，`dist/` 完全由 `tsc` 生成。

详见 [docs/RECOVERY-PLAN.md](../../../docs/RECOVERY-PLAN.md)。

## 文件分组（便于定位）

| 分组 | 文件 |
|---|---|
| CLI 入口 | `clawhermes.js` |
| 核心编排 | `core.js`, `lifecycle.js`, `status.js`, `portable.js`, `environment.js`, `platform.js` |
| 控制服务 | `control-server.js`, `portal.js`, `portal-server.js`, `channels.js` |
| 适配器 | `adapters.js`, `adapter-guidance.js`, `adapter-metadata.js`, `adapter-setup.js`, `adapter-verification.js` |
| 安装/诊断 | `setup-wizard.js`, `diagnostics.js`, `runtimes.js`, `payloads.js`, `payload-export.js` |
| 模型与设备 | `model-config.js`, `device-binding.js`, `skills.js` |
| 备份恢复 | `backup.js` |
| 端口 | `ports-runtime.js` |
| WSL2 | `wsl.js`, `wsl-adapter.js`, `wsl-import.js`, `wsl-workflow.js` |
| 微信通道 | `weixin-compat.js`, `weixin-fetch-preload.js` |
| 工具 | `command-template.js`, `types.js` |

## 已知限制

- `src/` 为 TypeScript 源码，类型检查由 `npm run typecheck` 覆盖
- 少数从上游复刻的行为刻意保留，修改前请查阅对应文档
