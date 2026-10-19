# core/node/dist

> **这是编译产物，不是源码。**

## 这是什么

本目录包含 ClawHermes-USB 编排核心的 **34 个已编译 JavaScript 文件**，
由 TypeScript 源码编译而来（原 `core/node/src/`，**当前目录中不存在**）。

## 为什么可以直接运行

这些文件是 CommonJS 模块，不需要构建即可执行：

```powershell
node core/node/dist/clawhermes.js status --json
node core/node/dist/clawhermes.js control-server --port 0 --json
```

## 如果你想修改它

**没有源码就无法按正常流程修改。** 可选做法：

| 做法 | 说明 | 风险 |
|---|---|---|
| 直接改 `.js` | 能改，但下次重新构建会被覆盖 | 中 |
| 反向还原 TS 源码 | 结构可还原，类型信息已丢失 | 中 |
| 找回原始开发仓库 | **如果有，这是唯一正确做法** | 无 |

详见 [docs/RECOVERY-PLAN.md](../../docs/RECOVERY-PLAN.md)。

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

- 无 `package.json`：无法 `npm install`、`npm test`
- 无类型声明：编辑 `.js` 时没有类型提示
- 无测试覆盖：改动没有回归保护（见续建计划阶段 2）
