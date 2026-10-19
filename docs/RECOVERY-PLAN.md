# 项目续建计划（RECOVERY-PLAN）

> 创建于 2026-10-19。本文件是**当前实际状态下的执行计划**，替代早期设想。
> 背景：`F:\DTC` 是从 U 盘拷贝的**交付包**，不是开发仓库——源码根目录不完整，
> 但 REA 复刻子系统 `replica/` 已完成并可运行。

---

## 一、现状盘点（实测）

### 已具备

| 项 | 状态 | 说明 |
|---|---|---|
| `replica/` 复刻子系统 | ✅ 完成 | 10 个模块，82 个测试通过，覆盖原产物业务段 |
| `core/node/dist/` | ✅ 有 | 34 个已编译 JS（`clawhermes.js`、`control-server.js` 等） |
| `apps/` 上游应用 | ✅ 有 | openclaw / hermes-agent / hermes-web-ui 三个 checkout |
| `skills/` | ✅ 有 | 90 个技能包 |
| `config/` `adapters/` `portal/` | ✅ 有 | 配置、适配器契约、门户页面 |
| `docs/` | ✅ 有 | 产品/架构/交付/逆向复刻全套文档 |
| Git 仓库 | ✅ 已建 | 私有仓库已推送，CI 通过 |

### 缺失（关键）

| 项 | 影响 |
|---|---|
| `package.json` | **无法执行 `npm install` / `npm run build` / `npm test`** |
| `core/node/src/` | **无法修改核心逻辑**，只能改编译后的 `dist/*.js` |
| `tsconfig.json` | 无法类型检查 |
| `launcher/` | README 多处引用（VBS/BAT/pyqt 入口），实际不存在 |
| `launcher/pyqt/clawhermes_control.py` | README 明确提到的 PyQt 控制面板源码不存在 |
| `scripts/` | README 提到的自动化脚本目录不存在 |

> 结论：**这是一个"能跑但改不动"的发行版**。`core/node/dist/*.js` 可直接 `node` 运行，
> 但没有源码工程，无法按 README 描述的方式开发。

---

## 二、三条可选路线

### 路线 A：重建开发工程（推荐）

**目标**：让 `core/` 可构建、可测试、可迭代。

**做法**：

1. 从 `core/node/dist/*.js` 反向还原 TypeScript 源码（这些是 `tsc` 编译产物，保留了 `require`/`export` 结构，还原度较高）
2. 或直接用 dist 的 JS 重建一个可直接运行的工程（不转 TS，先跑起来）
3. 补齐 `package.json`、`tsconfig.json`、`scripts/`
4. 建立测试基线（当前 `core/` 完全没有测试）

| 优点 | 缺点 |
|---|---|
| 相对忠实于原实现 | 还原 34 个文件工作量大 |
| 有 REA 方法论可复用 | 类型信息已丢失，还原的 TS 需要人工补类型 |

### 路线 B：以 replica 为基础，向上长成完整产品

**目标**：把已验证的 `replica/` 作为**新的编排核心**，逐步替换 `core/node/dist`。

**做法**：

1. 扩展 `replica/` 覆盖 `clawhermes.js` 的 CLI 子命令面（setup/start/stop/status/backup…）
2. 直接调用现成的 `core/node/dist/*.js` 作为**依赖**，而不是复刻它们
3. 用 `replica/` 替换掉 Electrobun 控制壳那一层

| 优点 | 缺点 |
|---|---|
| 复用已完成且有测试的代码 | 只覆盖"壳"，不覆盖"核" |
| 风险最低，能快速看到成果 | 依赖 `dist` 二进制，升级上游会断裂 |

### 路线 C：只修文档，不动代码

**目标**：承认当前是发行版，把 README 改成"使用说明"，删掉所有 `npm install` / `npm run build` 的误导。

| 优点 | 缺点 |
|---|---|
| 半天就能做完 | 项目止步于"能跑"，无后续开发能力 |

---

## 三、建议方案：A + B 组合，分四阶段

### 阶段 1：止血（半天，立即可做）

**目标**：消除文档与现实的不一致，让任何人进来不再踩坑。

| # | 任务 | 产出 |
|---|---|---|
| 1.1 | 修正 README，标注当前为「发行版」，把开发命令移到「源码仓库」章节并注明源码不在此目录 | README.md |
| 1.2 | 在 `core/node/dist/` 加 `README` 说明：这是编译产物，源码不在本仓库 | 说明文件 |
| 1.3 | 记录缺失清单到 `docs/RECOVERY-PLAN.md`（本文件） | 本文档 |
| 1.4 | 提交并推送 | commit |

**验收**：新人照 README 操作，不会遇到 `npm error enoent`。

### 阶段 2：让 core 可运行、可测试（2–3 天）

**目标**：不还原源码，先让 `core/` 有**可执行的验证**。

| # | 任务 | 产出 |
|---|---|---|
| 2.1 | 写一个 `core/package.json`，只声明 `bin` 与 `engines`，不引依赖 | `core/node/package.json` |
| 2.2 | 为 `clawhermes.js` 的每个子命令写冒烟测试（`--help` / `--json` 输出结构） | `core/tests/smoke/` |
| 2.3 | 建立 golden 基线：记录每个命令当前的 JSON 输出，作为后续改动的回归参照 | `core/tests/golden/` |
| 2.4 | 接入 CI | `.github/workflows/core-smoke.yml` |

**验收**：`npm test` 在 `core/` 下可跑，CI 通过，改动 `dist` 有回归保护。

**为什么先做这个**：没有测试基线就动 `dist`，等于盲改。

### 阶段 3：还原或重建关键模块（3–5 天，按需）

**目标**：让**最常改的部分**可维护。不需要全部还原。

优先级（按改动频率与复杂度）：

| 优先级 | 模块 | 理由 |
|---|---|---|
| P0 | `portable.js` / `status.js` / `environment.js` | 路径与状态判定，最基础 |
| P0 | `control-server.js` | 所有客户端依赖的契约层 |
| P1 | `core.js` / `lifecycle.js` | 启停逻辑，最容易出 bug |
| P2 | `adapters.js` / `adapter-*.js` | 适配器加载与验证 |
| P3 | `wsl*.js` | 可选路径，稳定后可不动 |

**做法**：对每个模块，用 REA 方法学（已在本项目验证过）做：

```text
读 dist/*.js  →  生成行为义务清单  →  写带测试的替代实现  →  与 golden 基线比对
```

**验收**：P0 模块有独立测试，且与 golden 基线行为一致。

### 阶段 4：整合（视情况）

| # | 任务 |
|---|---|
| 4.1 | 决定 `replica/` 与还原后的 `core/` 如何衔接（谁调用谁） |
| 4.2 | 补回 `launcher/` 入口（VBS/BAT 至少能拉起控制服务） |
| 4.3 | 端到端验证：从启动到门户可用 |

---

## 四、执行进度

### 阶段 1：止血 —— ✅ 已完成（2026-10-19）

- [x] 1.1 修正 README 的发行版/开发仓库定位
- [x] 1.2 `core/node/dist/README.md` 说明编译产物属性
- [x] 1.3 本文件入库
- [x] 1.4 提交推送（commit `ef2ea96`）

### 阶段 2：让 core 可测试 —— ✅ 已完成（2026-10-19）

| # | 任务 | 产出 | 状态 |
|---|---|---|---|
| 2.1 | `core/node/package.json`（仅 bin + engines，无依赖） | `core/node/package.json` | ✅ |
| 2.2 | CLI 冒烟测试 | `core/node/tests/smoke/cli.test.mjs` —— **8 项全绿** | ✅ |
| 2.3 | Golden 基线（20 条只读命令） | `core/node/tests/golden/` —— **20/20 一致** | ✅ |
| 2.4 | 接入 CI | `core-smoke` 任务 | ✅ |

**实测结果**：

```text
cd core/node && npm test
✔ 8 项通过

cd core/node && npm run golden:check
结果: 20 一致, 0 有差异, 0 缺基线
```

**这一步解决了什么**：现在改动 `core/node/dist/*.js` 有回归保护了。
任何命令的退出码、stdout 结构、stderr 文案发生变化，`golden:check` 都会报出来。

**执行中发现并修正的问题**：

| 问题 | 现象 | 修正 |
|---|---|---|
| 归一化失效 | 绝对路径未被替换（JSON 序列化后反斜杠被转义，split 匹配不上） | 改为在原始值上归一化，而非序列化字符串 |
| 文件名时间戳漏网 | `payload-export` 输出含 `...2026-10-19T07-59-24-895Z.zip`，标准 ISO 正则不匹配 | 增加紧凑时间戳与纯日期两种模式 |
| 错误路径未覆盖 | 两条命令本就以非零退出，被当作"失败"丢弃 | 引入 `EXPECTS_FAILURE`，把错误行为也固化为契约 |
| 目录位置错误 | 文件误写到 `core/tests`，与 `package.json` 不同级 | 移至 `core/node/tests` |

### 阶段 3：还原关键模块 —— ⏸ 待开始

**开始前需确认**：你手上是否有原始开发仓库（含 `core/node/src/` 与 `tsconfig.json`）？
有的话直接用真源码，跳过还原。

---

## 五、风险与边界

| 风险 | 应对 |
|---|---|
| 改 `dist/*.js` 无测试保护 | 阶段 2 先建 golden 基线，再动代码 |
| 还原的 TS 与原始语义有偏差 | 以现有 `dist` 行为为准，不追求"更好" |
| 源码可能在别处（你手上有另一个仓库） | **如果有，优先用真源码，不要还原** |
| `apps/` 上游应用体积大 | 保持为 payload，不做源码级修改 |

> **重要前提**：如果你能找到原始开发仓库（含 `src/` 和 `package.json`），
> 本计划的阶段 3 就完全不需要——直接 clone 真源码即可。
