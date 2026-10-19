# 阶段 5：仓库与发布决策记录

> 执行日期：2026-10-19
> 依据：`REPLICA-PLAN.md` 阶段 5

## 已完成的准备项

| 项 | 状态 | 文件 |
|---|---|---|
| 仓库范围界定 | ✅ | `.gitignore` |
| 换行与编码策略 | ✅ | `.gitattributes`（保证 README.zh-CN.md 要求的中文 UTF-8 可读） |
| 根目录许可证 | ✅ | `LICENSE`（Apache-2.0） |
| 上游组件声明 | ✅ | `THIRD_PARTY_NOTICES.md` |
| 复刻产物来源声明 | ✅ | `replica/README.md` 顶部 |

## 仓库范围（实测校验）

### 纳入版本控制

```text
core/  adapters/  config/  docs/  replica/  reconstruction/business/  portal/
launcher/  skills/  package.json  README*.md  LICENSE  THIRD_PARTY_NOTICES.md
.gitignore  .gitattributes  release-manifest.json  START_HERE.txt
```

### 排除

| 路径 | 理由 | 体积 |
|---|---|---|
| `apps/` | 上游源码工作树，交付版用预构建产物 | 183,837 文件 |
| `runtimes/` | 运行时二进制 | 4,926 文件 |
| `runtime-archives/` | 归档运行时 | — |
| `_internal/` | 内部构建产物 | 150 文件 |
| `*.exe` `*.dll` `*.tar.zst` `*.tar.gz` | 二进制不进 git，走 Release 附件 | 33 MB+ |
| `data/` | 运行时数据与日志 | 1,220 文件 |
| `reconstruction/extracted/` | 可重建的中间产物 | 已清理 |

## 许可证选择：Apache-2.0

**理由**：

1. 含专利授权条款，对工具类项目更稳妥
2. 与三个上游的 MIT **兼容**（Apache-2.0 可吸收 MIT 代码，反向不可）
3. MIT 无专利条款，若将来有人基于本项目做商业实现，Apache-2.0 保护更完整

**兼容性检查**（实测）：

| 上游 | 许可证 | 与 Apache-2.0 兼容 |
|---|---|---|
| OpenClaw | MIT | ✅ |
| Hermes Agent | MIT | ✅ |
| hermes-web-ui | MIT | ✅ |

> MIT 代码可以并入 Apache-2.0 项目，只需保留原版权声明——已在 `THIRD_PARTY_NOTICES.md` 落实。

## 公开 vs 私有：决策

### 结论：**先建私有仓库**

| 维度 | 私有 | 公开 |
|---|---|---|
| 上游 MIT 义务 | 不涉及分发，无义务触发 | 需完整保留三份 LICENSE |
| 复刻产物合规性 | 内部使用无风险 | **需人工法律评估** |
| 二进制约 33 MB | 不必上传 | 需走 Release |
| 协作便利 | 够用 | 更好 |

**不公开的三个具体理由**：

1. `replica/` 是对他人产物的行为复刻。虽为独立实现、未复制代码，但**公开发布这一行为本身**的性质
   需要人工判断，超出工具可自动得出的结论范围。
2. 仓库内含 `core/` 编排层与 `adapters/` 适配契约，属于项目核心资产，
   公开后等于把产品实现思路完整披露。
3. 现阶段没有「公开」的具体收益诉求（无外部协作方、无社区运营计划）。

### 转为公开的前置条件（若将来需要）

1. 由责任人完成 `replica/` 的合规评估并留档
2. 确认 `apps/` 确实未进入 git 历史（`git log --all -- apps/` 为空）
3. 补一份面向外部的 `CONTRIBUTING.md` 与 `SECURITY.md`
4. 三份上游 LICENSE 在分发时随包提供

## 待人工执行的两步

工具无法代替的仅剩两步：

```powershell
cd F:\DTC
git init
git add .
git status --short    # 核对：不应出现 apps/ runtimes/ *.exe
```

> `git init` 与首次 commit 建议由你本人执行，以便核对提交范围。
> 已经准备好 `git status` 的自查清单：若输出中出现 `apps/`、`runtimes/`、`data/` 或任何二进制，
> 说明 `.gitignore` 未生效，需先修正再提交。

## .gitignore 实测校验

用临时仓库 + `git check-ignore` 对本项目真实路径逐条验证（含 `GIT_CONFIG_COUNT safe.directory=*` 规避
F: 盘不记录 ownership 导致的 dubious ownership 报错）：

| 路径 | 结果 | 符合预期 |
|---|---|---|
| `core/node/src/a.ts` | INCLUDED | ✅ |
| `adapters/x.js` | INCLUDED | ✅ |
| `config/app.json` | INCLUDED | ✅ |
| `docs/reconstruction/OBLIGATIONS.md` | INCLUDED | ✅ |
| `replica/src/rpc.ts` / `replica/tests/rpc.test.ts` | INCLUDED | ✅ |
| `reconstruction/business/bun-index.ts` | INCLUDED | ✅ |
| `README.md` / `LICENSE` / `THIRD_PARTY_NOTICES.md` | INCLUDED | ✅ |
| `apps/openclaw/index.js` | IGNORED | ✅ |
| `runtimes/windows/node/node.exe` | IGNORED | ✅ |
| `data/logs/x.log` | IGNORED | ✅ |
| `_internal/x.bin` | IGNORED | ✅ |
| `runtime-archives/a.zip` | IGNORED | ✅ |
| `node_modules/pkg/index.js` | IGNORED | ✅ |
| `ClawHermes-Control.exe` | IGNORED | ✅ |
| `ClawHermes-Control-Electrobun-Setup.tar.zst` | IGNORED | ✅ |
| `tmp/x.cjs` | IGNORED | ✅ |

**22 条路径全部符合预期。** 纳入仓库的 `core/ adapters/ config/ docs/ replica/ portal/ skills/ launcher/`
合计 **618 个文件 / 3.39 MB**，体积可控。

## 自查清单

- [x] `.gitignore` 已覆盖 `apps/`、`runtimes/`、`runtime-archives/`、`_internal/`、`data/`、二进制
- [x] `.gitattributes` 保证中文 UTF-8
- [x] 根目录有 `LICENSE`（Apache-2.0）
- [x] 根目录有 `THIRD_PARTY_NOTICES.md`，三个 MIT 上游均已记录
- [x] `replica/README.md` 有来源声明与合规提示
- [ ] `git init` —— **待你执行**
- [ ] 首次 commit 并核对范围 —— **待你执行**
