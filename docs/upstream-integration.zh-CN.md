# 上游集成说明

最后核验：2026-05-01

本文记录影响 ClawHermes-USB 适配器的上游启动事实。它刻意保守：
在便携数据路径、进程行为、Windows 支持程度都经过实测验证之前，不启用生产适配器命令。

## OpenClaw

来源：

- <https://docs.openclaw.ai/platforms/windows>
- <https://docs.openclaw.kr/cli/gateway>

当前结论：

- WSL2 是完整 OpenClaw 体验在 Windows 上更稳定、更被推荐的路径。
- 原生 Windows CLI 与 gateway 流程是存在的，但上游仍记录了 onboarding、gateway 安装、计划任务、启动文件夹回退等方面的注意事项。
- 在便携 U 盘场景下，前台运行 `node openclaw.mjs gateway --port 18789 --verbose --allow-unconfigured`
  是经过验证的源码 checkout 启动路径，因为它避免安装受管服务。
- 本地 `apps/openclaw` 存有真实上游 checkout 用于 WSL2 验证，本轮验证固定在 commit `e8f9c3e6`。
- `adapters/openclaw/adapter.json` 现在把 OpenClaw 建模为 WSL2 适配器，目标为受管发行版 `ClawHermes-Ubuntu`，
  并用 `sourceDistro: Ubuntu` 做 rootfs/导入/导出计划。
- 在 WSL2 中实测环境：Node.js 24.15.0、pnpm 10.33.2、项目内 `data/openclaw/openclaw.json`、
  项目内运行日志 `data/logs/openclaw-runtime.log`。
- `status --json` 与 `verify-adapter openclaw --json` 报告 `http://127.0.0.1:18789/healthz` 就绪，状态码 `200`。
- OpenClaw 健康检查在启动期或事件循环高负载时可能超过 10 秒，因此适配器使用 **30 秒** HTTP 健康超时。

适配器状态：见 `adapters/openclaw/adapter.json` 的 `status` 字段。

## Hermes Agent

- 当前默认走 **Windows 原生路径**（项目内 Python venv），不再强制 WSL2。
- 健康检查端点：`http://127.0.0.1:8642/health`
- 本地验证 commit：`f27fcb6a82b8487174ca941c15e7a5887371eede`

## Hermes Web UI

- **Windows Node 适配器**，已验证。
- 通过 `npm` / `pnpm` 在项目内安装，数据目录 `data/hermes-web-ui`。
- 与本项目共享控制服务与门户。

## 注意事项

- 上游行为可能随时变化。**改动适配器前先实测**，不要只依据上游文档。
- 三个上游均为 MIT 许可，分发时必须保留各自的 LICENSE，详见 [第三方组件声明](../THIRD_PARTY_NOTICES.md)。
- 健康超时、端口、启动参数这些数值都有实测依据，不要随意调整。
