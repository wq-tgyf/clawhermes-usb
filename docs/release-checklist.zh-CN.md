# 发布检查清单

在发布或移交 ClawHermes-USB 构建之前，逐项过一遍本清单。

## 源码状态

- 确认父仓库干净：`git status --short`
- 确认被忽略的上游 payload checkout 干净：
  - `git -C apps/hermes-agent status --short`
  - `git -C apps/hermes-web-ui status --short`
  - `git -C apps/openclaw status --short`
- 确认 `.gitkeep` 占位文件仍被父仓库跟踪，而真实 payload 内容仍被忽略。

## 构建与测试

- 构建 TypeScript 核心：`npm run build`
- 以 UTF-8 模式跑完整行为测试：`$env:PYTHONUTF8='1'; npm test`
- 检查空白字符问题：`git diff --check`
- 跑中文文档可读性冒烟测试：`$env:PYTHONUTF8='1'; python -m unittest tests.test_windows_core.WindowsCoreTests.test_chinese_docs_are_readable_utf8 -v`
- 跑复刻子系统测试：`cd replica; npm test`（应 82 项全绿）

## Payload

- 只读盘点被忽略的 payload：`node core/node/dist/clawhermes.js payloads --json`
- 预览 payload 导出：`node core/node/dist/clawhermes.js payload-export --dry-run --json`
- **仅在确实要产出发布物时**才创建 payload 导出：`node core/node/dist/clawhermes.js payload-export --confirm-export --json`
- payload 导出归档放在 `data/backups/payloads/`
- **不要提交**上游 app payload、`node_modules`、WSL rootfs 归档、WSL 备份、env 文件、生成的依赖缓存。

## WSL2 产物

- 确认 WSL2 就绪：`node core/node/dist/clawhermes.js wsl --distro ClawHermes-Ubuntu --json`
- 确认导入/导出指引：`node core/node/dist/clawhermes.js wsl-workflow hermes-agent --json`
- **仅在刷新发布 payload 时**才导出受管发行版：`node core/node/dist/clawhermes.js wsl-export --distro Ubuntu --confirm-export --json`
- 确认 rootfs 产物位于 `runtimes/wsl/`（见 [WSL2 Rootfs 产物策略](wsl-rootfs-artifacts.zh-CN.md)）

## 文档

- 中文文档必须保持 UTF-8 可读，无乱码
- 更新 `docs/PROGRESS.md` 中本次改动的内容
- 若改变了架构决策，新增 `docs/decisions/` 下的 ADR

## 移交前最后一步

- 确认 `release-manifest.json` 中的 `copiedPaths`、`entryPoints`、`warnings` 与本次构建一致
- 在干净机器上做一次 U 盘实际启动验证（见 [U 盘交付包生成 Runbook](usb-release-build-runbook.zh-CN.md)）
