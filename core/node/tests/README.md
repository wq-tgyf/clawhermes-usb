# core/node/tests

> 为**只有编译产物、没有源码**的 `core/node/dist/` 建立的第一道回归防线。

## 为什么需要它

当前 `core/node/` 下只有 `dist/*.js`，没有 `src/` 和测试。
在没有测试保护的情况下修改 `dist`，等于盲改——改坏了也发现不了。

本目录提供两层保护：

| 层 | 作用 | 命令 |
|---|---|---|
| **冒烟测试** | 验证 CLI 基本契约没被破坏 | `npm test` |
| **Golden 基线** | 逐字节比对 20 条命令的完整执行契约 | `npm run golden:check` |

## 冒烟测试（smoke/）

```powershell
cd core/node
npm test
```

覆盖 8 项：CLI 入口存在、无参诊断输出、`status` / `adapters` / `payloads` 的 JSON 结构、
未知子命令失败、错误路径提示、所有 `--json` 命令输出可被 `JSON.parse`。

## Golden 基线（golden/）

### 记录的是什么

不是「输出长什么样」，而是**完整执行契约**：

```json
{
  "command": ["clawhermes.js", "status", "--json"],
  "exitCode": 0,
  "stdout": { "kind": "json", "value": { ... } },
  "stderr": ""
}
```

**退出码也记录** —— 错误路径同样是契约。例如 `restore-plan` 对不存在的归档
必须 `exit 1` 且 stderr 含 `Backup archive not found`，改动后静默变化会被发现。

### 归一化规则

以下易变字段被替换为占位符，否则每次都会误报差异：

| 原值 | 替换为 |
|---|---|
| `F:\DTC`（及其子路径前缀） | `<ROOT>` |
| `2026-10-19T07:59:24.895Z` | `<TIMESTAMP>` |
| `2026-10-19T07-59-24-895Z`（文件名形式） | `<TIMESTAMP>` |
| `2026-10-19`（纯日期） | `<DATE>` |

### 用法

```powershell
cd core/node
npm run golden:check     # 校验
npm run golden:record    # 重录（改动经过评审后使用）
```

> 警告：`golden:record` 会覆盖基线。**只有在确认行为变化是预期的之后**才能重录，
> 否则就是把 bug 固化进基线。

### 命令清单（20 条，均为只读）

| 类别 | 命令 |
|---|---|
| 状态 | `status` |
| 适配器 | `adapters`、`adapters hermes-web-ui` |
| payload | `payloads`、`payload-export --dry-run` |
| 源码 | `sources`、`sources hermes-web-ui` |
| 运行时 | `runtimes` |
| WSL | `wsl`、`wsl-rootfs-guide`、`wsl-import-plan`、`wsl-unregister-plan` |
| 配置 | `model-config-status`、`device-binding`、`setup`、`init-env` |
| **预期失败** | `checkout-source --dry-run`、`restore-plan`（不存在的归档） |

不收录会启停服务、写文件、改宿主机状态的命令。

## CI

`.github/workflows/replica-tests.yml` 的 `core-smoke` 任务会跑 `npm test` 与 `npm run golden:check`。

## 局限

| 局限 | 说明 |
|---|---|
| 只覆盖 CLI 层 | 内部函数无单元测试（没有源码，无法 import 单测） |
| 只覆盖只读命令 | 启停流程需要真实服务，未纳入 |
| 基线随环境变化 | 若本机端口/服务状态变化，某些命令输出会变，需要重录 |

这些局限正是 [续建计划](../../../docs/RECOVERY-PLAN.md) 阶段 3 要解决的问题。
