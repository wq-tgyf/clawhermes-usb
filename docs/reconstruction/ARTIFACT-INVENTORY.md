# 产物勘察清单（ARTIFACT-INVENTORY）

> 阶段 1 产出。所有结论标注 **observed**（静态直接观察到）/ **inferred**（据观察推断）/ **unknown**（无法由本次静态分析确定）。
> 本次分析为静态读取，**未执行任何目标代码**。

## 1. 产物身份

| 字段 | 值 | 依据 |
|---|---|---|
| 文件 | `ClawHermes-Control-Electrobun-Setup.tar.zst` | observed |
| 大小 | 33,529,388 字节 | observed |
| SHA-256 | `5B501B5C58F5AC343C0B8AC6C2670C10AB74B639472C072CF9A50C891CEC5947` | observed |
| 容器格式 | Zstandard 压缩的 tar（magic `28 B5 2F FD`） | observed |
| 解压后大小 | 129,227,776 字节（123.2 MiB） | observed |
| 打包工具 | Electrobun（由 `Resources/main.js` 的 launcher 逻辑判定） | inferred |
| 标识符 | `dev.clawhermes.control` | observed（`version.json`、`Info.plist`、metadata.json 三处一致） |
| 产品名 | `DTclaw Control` / 内部名 `DTclawControl-canary` | observed |
| 版本 | 0.1.0，channel=canary，hash=`b628tia9xa1h` | observed |
| Bun 版本 | 1.3.9 | observed（`build.json`） |

### 工具环境实测

| 工具 | 状态 |
|---|---|
| `rea inspect-artifact` | **失败**：`unsupported binary format`（REA 不识别 `.tar.zst`） |
| Windows `tar.exe` | 不可用：缺外部 `zstd` 过滤器 |
| 系统 `zstd` / `7z` | 未安装 |
| **Node 24.15.0 `zlib.zstdDecompressSync`** | **可用，本次分析采用此路径** |
| 包内自带 `bin/zig-zstd.exe`（974 KB） | 存在但未调用（避免执行目标程序） |

---

## 2. 成员清单（18 文件 / 9 目录）

| 大小 | 路径 | 作用 |
|---|---|---|
| 0.6 KB | `Info.plist` | macOS 应用声明（CFBundleExecutable=launcher） |
| 0.1 KB | `Resources/build.json` | 构建配置：renderer=native，bunVersion=1.3.9 |
| 6.3 KB | `Resources/main.js` | **Electrobun 启动器**：dlopen libNativeWrapper，从 app.asar 读 bun/index.js 写入临时文件后用 Worker 启动 |
| 0.1 KB | `Resources/version.json` | 版本/渠道/标识符 |
| 0.4 KB | `Resources/app/views/mainview/index.html` | UI 入口，加载 `index-gtvi0VD1.js` |
| 226.1 KB | `.../assets/dtclaw-logo-B8MKFK7O.png` | 图标资源 |
| 25.0 KB | `.../assets/index-DniI81Z1.css` | UI 样式 |
| 99.2 KB | `.../assets/index-gtvi0VD1.js` | **UI 打包产物**（Vue 3.5.34 + Babylon.js，minified） |
| 974.4 KB | `.../assets/product12-DRU2buq8.png` | 图片资源 |
| **8864.0 KB** | `Resources/app/bun/index.js` | **主程序包**（Bun 打包产物，含 Electrobun 框架 + 本项目业务代码） |
| 871.5 KB | `bin/bspatch.exe` | 二进制差分补丁（更新用） |
| 110978.1 KB | `bin/bun.exe` | Bun 运行时 |
| 303.5 KB | `bin/launcher.exe` | 原生启动器 |
| 505.5 KB | `bin/libasar-arm64.dll` | ASAR 读取（ARM64） |
| 570.5 KB | `bin/libasar.dll` | ASAR 读取 |
| 1625.0 KB | `bin/libNativeWrapper.dll` | Electrobun 原生窗口层 |
| 157.1 KB | `bin/WebView2Loader.dll` | WebView2 加载器 |
| 974.0 KB | `bin/zig-zstd.exe` | zstd 解压（更新用） |

**观察**：`bin/bun.exe` 占 110 MB（包体 90%），属于运行时，不是业务逻辑。

---

## 3. 代码分层（关键发现）

`Resources/app/bun/index.js`（8.6 MB，907 万字符）是 **Bun 打成的单文件**，结构上可明确切分为：

| 区域 | 字符范围 | 内容 | 是否需复刻 |
|---|---|---|---|
| Electrobun 框架 | 0 – 9,063,807 | 665 个 function 声明，全部来自 `node_modules/electrobun/` | **否**（直接依赖上游开源框架） |
| **本项目业务代码** | 9,063,807 – 9,076,713 | `// src/bun/index.ts` 起，**12,906 字符**，23 个函数，18 个 RPC 方法 | **是** |

> 这是本次勘察最重要的结论：**真正需要复刻的业务逻辑只有约 1.3 万字符**，其余 890 万字符是可直接安装的公开框架。复刻规模因此从「不可能」降到「一个中等模块」。

### 3.1 本项目业务函数（23 个，observed）

`beginImmediateClose`, `requestJson`, `getControlUrl`, `getControlUrlOrEmpty`, `requestJsonWithTimeout`, `cleanupBeforeExit`, `getStatusPayload`, `startAllServices`, `stopAllServices`, `waitForServicesStopped`, `waitForControlServerShutdown`, `ensureControlServer`, `readControlServerMetadata`, `findUsbRoot`, `rootHintCandidates`, `ancestorPaths`, `nodeCommand`, `readStatusSnapshot`, `runClawHermesLifecycle`, `ping`, `pingSync`, `writeElectrobunLog`, `sleep`

### 3.2 RPC 方法（18 个，observed）

`getBootstrap`, `getStatus`, `getLogs`, `getSkills`, `getDeviceBinding`, `bindDevice`, `getWeixinChannelStatus`, `getWeixinChannelLogs`, `startWeixinChannelLogin`, `stopWeixinChannelLogin`, `getModelConfig`, `startAll`, `stopAll`, `saveModelConfig`, `openUrl`, `shutdown`, `minimizeWindow`, `maximizeWindow`, `closeWindow`
（注：`startWeixinChannelLogin` 记为第 19 项，边界待阶段 2 复核）

### 3.3 控制服务 API 端点（11 个，observed）

`/api/status`, `/api/services/start`, `/api/services/stop`, `/api/shutdown`, `/api/model-config`, `/api/skills`, `/api/device-binding`, `/api/device-binding/bind`, `/api/channels/weixin`, `/api/channels/weixin/login`, `/api/channels/weixin/stop`
另有健康检查 `/api/health`（observed，见 `ping`/`ensureControlServer` 调用）

---

## 4. 核心启动流程（observed）

```text
main.js (Electrobun launcher)
  └─ 读 version.json → identifier/name/channel
  └─ dlopen libNativeWrapper / libasar
  └─ 从 app.asar 读 bun/index.js → 写入 %TEMP%\electrobun-<ts>-<rand>.js（100ms 后自删）
  └─ new Worker(临时文件) → 跑 bun/index.js
  └─ lib.symbols.startEventLoop(identifier, name, channel)
```

本项目业务层（`src/bun/index.ts`）的控制服务拉起逻辑：

```text
ensureControlServer(usbRoot)
  ├─ 读 control-server metadata，若 /api/health 存活 → 复用已有 URL（observed）
  ├─ 否则 spawnSync: <node> core/node/dist/clawhermes.js control-server --usb-root <root> --port 0 --json
  │   （timeout 10s，windowsHide，cwd=usbRoot）（observed）
  └─ 失败抛错，stderr 记入日志

findUsbRoot()
  └─ 依次尝试 cwd / start / 各级祖先目录，命中含 core/node/dist/clawhermes.js 者（observed）
  └─ 另读 Resources/clawhermes-usb-root.txt 或 <dir>/clawhermes-usb-root.txt 提示文件（observed）

runClawHermesLifecycle(action, options)
  └─ CLI 兜底：<node> core/node/dist/clawhermes.js <action> --usb-root <root> --json
      （start 超时 20s，其它 10s）（observed）
```

---

## 5. 与复刻范围（SCOPE.md）的对应

| 范围项 | 落点 | 证据强度 |
|---|---|---|
| 启动编排 | `findUsbRoot`, `nodeCommand`, `ensureControlServer`, `runClawHermesLifecycle` | **observed**（源码可读） |
| 进程管理 | `startAllServices`, `stopAllServices`, `waitForServicesStopped`, `waitForControlServerShutdown`, `cleanupBeforeExit` | **observed** |
| 配置读写 | `getModelConfig`, `saveModelConfig`, `getDeviceBinding`, `bindDevice`，端点 `/api/model-config`、`/api/device-binding` | observed（调用侧）；服务端实现 unknown |
| 健康检查 | `ping`, `pingSync`, `/api/health`, `readStatusSnapshot` | **observed** |
| UI | `views/mainview` Vue 打包产物 | observed（框架确认），**不复刻** |

---

## 6. 未决项（unknown，需阶段 2 或运行时补齐）

| 编号 | 未决问题 | 需要什么才能确定 |
|---|---|---|
| U-01 | `core/node/dist/clawhermes.js` 的 `control-server` 子命令内部实现 | 读 `F:\DTC\core\node\dist\clawhermes.js`（本仓库有源码，不需要逆向） |
| U-02 | 各 RPC 方法的完整参数与返回结构 | 静态读取 `src/bun/index.ts` 段的 handler 定义 |
| U-03 | UI `index-gtvi0VD1.js` 与 RPC 的调用关系 | 运行时观测或反混淆 UI bundle |
| U-04 | 微信通道 `/api/channels/weixin/*` 的状态机 | 服务端实现 + 运行时 |
| U-05 | `bspatch.exe`/`zig-zstd.exe` 参与的自动更新流程 | 静态读 `Updater` 段 + 运行时 |
| U-06 | `libNativeWrapper.dll` 的原生行为 | 需 Hopper/Ghidra（本机未装），且不在复刻范围内 |

---

## 7. 对阶段 2 的影响

1. 需要复刻的目标**从「整个产物」收缩为 23 个函数 + 19 个 RPC handler**，义务清单预计 40–70 条，落在可控区间。
2. UI 层不复刻，因此 `index-gtvi0VD1.js` 只需提取调用契约，不需重建。
3. `ensureControlServer` 依赖的目标 `core/node/dist/clawhermes.js` **已在本仓库内**，可直接读源码，无需逆向 → U-01 可提前关闭。
4. 建议阶段 2 只覆盖「启动编排 / 进程管理 / 配置读写 / 健康检查」四组，Electrobun 框架部分直接作为依赖引入。

---

## 8. 方法说明与局限

- 全部结论来自**静态读取解压后字节**，未执行任何目标程序。
- 包内 `zig-zstd.exe`、`bspatch.exe`、`launcher.exe` 均**未运行**。
- REA 的 `inspect-artifact` 不支持该容器格式，故成员清单由 Node 24 的 zstd 解压 + tar 头解析得到（已产出与 `tar -tvf` 语义一致的 27 条条目）。
- `analyze-javascript-application` 需要 ASAR 或目录，本次未启用：解压后目录尚未落盘。若阶段 2 需要 REA 的证据 ID，再执行解包到 `F:\DTC\reconstruction\extracted\`。
