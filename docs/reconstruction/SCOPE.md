# 复刻范围声明（SCOPE）

> 本文件锁定阶段 0 的四项边界决策。后续任何阶段若需修改范围，必须先改本文件并记录理由。

## 决策记录

| 编号 | 问题 | 决策 | 决策依据 |
|---|---|---|---|
| D1 | 复刻哪个产物 | `ClawHermes-Control-Electrobun-Setup.tar.zst` | 编排逻辑集中在 JavaScript，静态分析覆盖率高；macOS 二进制本机无分析引擎；PyQt EXE 需 Python 侧对照，成本更高 |
| D2 | 复刻边界 | 启动编排 + 进程管理 + 配置读写 + 健康检查（UI 只保留功能入口） | 这四类构成编排层全部可执行行为；UI 视觉样式的复刻价值低、验证成本高 |
| D3 | 复刻目的 | A：自己维护，将来可替换原实现（私有仓库） | 现阶段不引入公开发布的法律审查负担 |
| D4 | 是否接受运行时观测 | 接受（阶段 2 视静态证据缺口启用） | 部分行为仅在目标实际启动后可见 |

## 产物身份（待阶段 1 验证后补全）

| 字段 | 值 |
|---|---|
| 文件名 | `ClawHermes-Control-Electrobun-Setup.tar.zst` |
| 大小 | 33,529,388 字节 |
| SHA-256 | 待阶段 1 计算 |
| 同级文件 | `ClawHermes-Control-Electrobun-Setup.exe`（424,960 字节，疑似引导器） |
| 元数据 | `ClawHermes-Control-Electrobun-Setup.metadata.json`（121 字节） |

## 明确不在范围内

- UI 视觉样式、主题、字体、图标复刻
- 对 `apps/` 下三个上游应用（OpenClaw / Hermes Agent / hermes-web-ui）的任何复刻或修改
- macOS 产物、WSL 适配路径
- U 盘交付包生成流程（已有独立 Runbook）

## 变更记录

| 日期 | 变更 | 原因 |
|---|---|---|
| 本次 | 初始版本，按推荐默认值锁定 | 用户指示「开始第一步计划」 |
