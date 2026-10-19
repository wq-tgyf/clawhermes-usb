# ClawHermes-USB 复刻执行计划

> 状态：**全部完成**（2026-10-19，阶段 0–5 交付完毕，已发布至 https://github.com/wq-tgyf/clawhermes-usb ）
> 执行者：按阶段顺序逐条执行，每个阶段完成后再进入下一阶段

---

## 前置事实（已实测）

| 项 | 实测结果 |
|---|---|
| `F:\DTC` 是 git 仓库吗 | **不是**。无 `.git` 目录，无 remote |
| 根目录 LICENSE | **没有** |
| 上游三应用许可证 | 全部 **MIT**（Nous Research / EKKOLearnAI / Peter Steinberger） |
| 项目已有文档惯例 | `docs/decisions/`、`docs/usb-release-build-runbook.zh-CN.md`、`release-manifest.json` |
| REA CLI | v6.4.0，可用 |
| REA MCP | 仅注册在 Codex；DeepSeek Harness 会话内走 CLI |
| Hopper / Ghidra / IDA | 均未安装（静态 JS 分析不需要） |
| 项目自述定位 | 「不是 fork 上游」，而是在上游外提供便携编排层 |

---

## 阶段 0：边界决策

**目的**：把范围钉死，避免后续全部返工。

### 需要先回答的 4 个问题

**① 复刻哪个产物？**

| 候选 | 难度 | 说明 |
|---|---|---|
| `ClawHermes-Control-Electrobun-Setup.tar.zst` | 中 | **推荐**。编排逻辑集中在 JS，静态分析覆盖率高 |
| `ClawHermes-Control.exe` | 中高 | PyQt 打包，需 Python 侧对照 |
| `ClawHermes-Control-Mac.app.tar.gz` | 高 | macOS 二进制，本机无对应分析引擎 |

**② 复刻边界划到哪一组？**

建议仅包含：启动编排、进程管理、配置读写、健康检查。UI 视觉不做复刻，只保留功能入口。

**③ 复刻目的是什么？**（决定许可证与发布策略）

- **A. 自己维护，将来替换原实现** → 私有仓库
- **B. 学习理解** → 不建仓库，产出只放 `docs/reconstruction/`
- **C. 公开发布** → 必须先完成阶段 5 的法律审查

**④ 是否接受运行时观测？**

部分行为只有在实际启动目标后才能确定。接受的话，阶段 2 可补齐这部分证据。

### 产出物

`docs/reconstruction/SCOPE.md` —— 把上述 4 个答案固定下来。

---

## 阶段 1：产物勘察

**目的**：搞清楚包里有什么，建立证据底账。不改动原项目任何文件。

### 执行命令

```powershell
cd F:\DTC
New-Item -ItemType Directory -Force tmp | Out-Null
rea inspect-artifact "ClawHermes-Control-Electrobun-Setup.tar.zst" --format json > tmp\artifact-inspect.json
```

### 步骤

1. `rea inspect-artifact` —— 拿产物身份、完整性、成员清单
2. `rea extract-artifact` —— 解到 **独立目录** `F:\DTC\reconstruction\extracted\`，绝不覆盖原文件
3. `rea analyze-javascript-application <解出目录> --format json` —— 先只取 summary
4. `rea inspect-analysis-view` —— 按模块分页读取，不要一次性拉全量（会触发 resource_constraint）

### 产出物

`docs/reconstruction/ARTIFACT-INVENTORY.md`，每条附 `evidence_id`。

### 验收标准

能回答：包里一共几个模块、各起什么作用、哪些是第三方依赖。

---

## 阶段 2：复刻义务清单（核心阶段）

**目的**：产出编码规格书。用 REA 的 reconstruction ledger 流程。

### 执行命令

```powershell
rea build-reconstruction-obligation-ledger <workflow.json> --format json > docs\reconstruction\OBLIGATIONS.json
```

> 若 CLI 输入结构过于复杂，备用方案：按模块列表手工生成同格式清单。

### 清单分组

启动编排 / 进程管理 / 配置读写 / 健康检查 / UI

### 单条格式

```text
[O-012] 行为：启动前检查端口占用，占用则顺延
        依据：evidence ev_xxxx（observed）
        实现要求：可复现
        验收方式：端口被占用时应换到下一个可用端口
        状态：covered / open / unknown
```

### 关键纪律

**本阶段结束前不写任何实现代码。** 清单即规格书。

### 产出物

`docs/reconstruction/OBLIGATIONS.md`

### 验收标准

- 每条义务都带 `evidence_id` 与状态
- `unknown` 条目单独成节，写明「需要什么才能确定」

### 风险闸门

阶段 2 结束时若 `unknown` 占比 **超过 40%**，说明边界划太大，应缩回一组（建议缩到只剩「启动编排」）。

---

## 阶段 3：实现

### 目标目录

```text
F:\DTC\replica\
  README.md          # 复刻自哪个产物、覆盖了什么、没覆盖什么
  src\               # 实现代码
  tests\             # 对每条 obligation 的验收测试
```

### 规则

1. 只写 `replica/` 下的文件，**不改动 `F:\DTC` 其他任何路径**
2. 每条 obligation 对应一个测试用例，测试名带编号（如 `test_O012_port_fallback`）
3. 拿不准的地方写 `// TODO(unknown): O-xxx 需要运行时确认`，不要猜

### 产出物

`replica/` 完整实现 + 测试

### 验收标准

`npm test` 全绿，且测试名能逐条对上 `OBLIGATIONS.md` 的编号。

---

## 阶段 4：覆盖率自评

**目的**：诚实地报出哪些做了、哪些没做、哪些证不了。

### 执行命令

```powershell
rea evaluate-reconstruction-coverage <coverage-input.json> --format md
```

### 三态定义

| 状态 | 含义 |
|---|---|
| 已覆盖 | 有实现、有测试、有证据支撑 |
| 未覆盖 | 已知该做但没做 |
| 无法确认 | 静态分析证不了，需要运行时观测 |

### 产出物

`docs/reconstruction/COVERAGE.md`

### 验收标准

三态之和等于义务总数，无遗漏条目。

---

## 阶段 5：仓库与发布

### 关键结论：上游全是 MIT

三个上游应用（OpenClaw / Hermes Agent / hermes-web-ui）许可证**均为 MIT**：

- 你**可以**公开包含上游代码的仓库，但**必须保留各自的 LICENSE 与版权声明**
- MIT **不传染**，你的编排层可以自由选择许可证

### 5.1 仓库范围

**只纳入**：

```text
core/  adapters/  config/  docs/  replica/  launcher/  package.json  README*
```

**排除**：`apps/`（18 万文件）、`runtimes/`（4926 文件）、`runtime-archives/`、`data/`、`_internal/`、`*.exe`、`*.tar.zst`

### 5.2 建 `.gitignore`

```gitignore
apps/
runtimes/
runtime-archives/
data/
_internal/
*.exe
*.tar.zst
*.tar.gz
node_modules/
```

### 5.3 补根目录 `LICENSE`

建议 **Apache-2.0**（含专利授权条款，比 MIT 更适合有协作预期的工具项目）。

### 5.4 建根目录 `THIRD_PARTY_NOTICES.md`

```markdown
- OpenClaw — MIT — Copyright (c) 2025 Peter Steinberger
- Hermes Agent — MIT — Copyright (c) 2025 Nous Research
- hermes-web-ui — MIT — Copyright (c) 2025 EKKOLearnAI
```

### 5.5 复刻产物单独声明

在 `replica/README.md` 顶部写清：

- 复刻自哪个产物
- 是否复制了第三方代码
- 若复刻产物本身包含他人实现，**公开发布前必须单独评估**（无法由工具自动判断，需人工确认）

### 5.6 公开还是私有

| | 私有 | 公开 |
|---|---|---|
| 前提 | 无 | 5.1–5.5 全部完成 |
| 风险 | 低 | 上游 MIT 义务已履行时可控 |
| 建议 | **现阶段推荐** | 复刻完成、义务清单齐全后再考虑 |

### 验收标准

- `git status` 中不含 `apps/`、`runtimes/`、二进制文件
- `LICENSE` 与 `THIRD_PARTY_NOTICES.md` 均在根目录

### 风险闸门

若选择公开且复刻产物含他人实现，**先停下来做法律评估**，不要直接推。

---

## 全流程工期与风险

| 阶段 | 工作量 | 主要风险 |
|---|---|---|
| 0 边界 | 15 分钟 | **不决策后面必返工** |
| 1 勘察 | 0.5–1 天 | 包体大时分析超时 |
| 2 义务清单 | 1–2 天 | 核心产出，不能跳过 |
| 3 实现 | 3–5 天 | 范围一超就失控 |
| 4 覆盖率 | 0.5 天 | — |
| 5 仓库发布 | 0.5 天 | 误提交二进制 |

### 两个关键判断点

1. **阶段 2 结束时** —— `unknown` 超 40% 就缩范围
2. **阶段 5 之前** —— 公开仓库且复刻含他人实现时，先做法律评估

---

## 默认参数（若选择「按推荐来」）

| 项 | 默认值 |
|---|---|
| ① 复刻对象 | `ClawHermes-Control-Electrobun-Setup.tar.zst` |
| ② 复刻边界 | 启动编排 + 进程管理 + 配置读写 + 健康检查 |
| ③ 目的 | A：自己维护，私有仓库 |
| ④ 运行时观测 | 接受 |

---

## 附：REA 命令速查

```powershell
# 产物勘察
rea inspect-artifact <path> --format json
rea extract-artifact <path> --format json

# JS 应用静态分析
rea analyze-javascript-application <asar或目录> --format json
rea inspect-analysis-view <evidence.json> --format md

# 复刻流程
rea build-reconstruction-obligation-ledger <input.json> --format json
rea evaluate-reconstruction-coverage <input.json> --format md
rea recover-javascript-sources <in.js> <outDir> --extraction-mode structural

# 证据导出
rea evidence-export <evidence.json> <out.json>

# 健康检查
rea doctor --json
```

> 注意：`rea` 的 MCP 只注册在 Codex。在 DeepSeek Harness 会话中通过 CLI 执行，流程一致，但证据以文件形式落盘而非挂在对话里。

---

## 执行结果（2026-10-19）

| 阶段 | 状态 | 产出 |
|---|---|---|
| 0 边界决策 | ✅ | `SCOPE.md` |
| 1 产物勘察 | ✅ | `ARTIFACT-INVENTORY.md` |
| 2 义务清单 | ✅ | `OBLIGATIONS.md`（78 条） |
| 3 实现 | ✅ | `F:\DTC\replica\`（10 个模块 + 81 个测试） |
| 4 覆盖率 | ✅ | `COVERAGE.md`（72/78 = 92.3%） |
| 5 仓库发布 | ✅ 已发布 | 私有仓库 `wq-tgyf/clawhermes-usb`，commit `2472700` |

### 阶段 5 建议（未执行，等决策）

实测确认：三个上游均为 MIT；`F:\DTC` 不是 git 仓库；根目录无 LICENSE。

建议顺序：
1. 在 `replica/` 与 `docs/` 就绪的前提下，先建**私有**仓库
2. 补根目录 `LICENSE`（建议 Apache-2.0）
3. 补 `THIRD_PARTY_NOTICES.md`（记录三个 MIT 上游）
4. `.gitignore` 排除 `apps/`、`runtimes/`、`runtime-archives/`、`data/`、`_internal/`、`*.exe`、`*.tar.zst`
5. 是否公开，待复刻产物合规性人工评估后决定

### 收尾：已完成

发布于 2026-10-19 完成：

```text
https://github.com/wq-tgyf/clawhermes-usb   (private)
默认分支 main，首次提交 2472700
630 个文件 / 3.30 MB
```

详见 `RELEASE-DECISION.md` 的「发布结果」章节。
