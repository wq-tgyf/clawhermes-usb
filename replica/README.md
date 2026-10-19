# ClawHermes Control 编排层复刻（replica）

> **来源声明**：本目录是对 `ClawHermes-Control-Electrobun-Setup.tar.zst`
> （标识符 `dev.clawhermes.control`，版本 0.1.0，channel=canary，
> SHA-256 `5B501B5C58F5AC343C0B8AC6C2670C10AB74B639472C072CF9A50C891CEC5947`）
> 中**业务逻辑段**的独立复刻实现，通过 REA 静态逆向分析得出。
>
> 本实现**不包含**第三方代码副本。Electrobun 框架部分未复制，作为外部依赖对待。
> 公开发布前请由责任人单独评估合规性（见 `docs/reconstruction/OBLIGATIONS.md` 附录）。

## 复刻范围

| 项 | 内容 |
|---|---|
| 复刻 | 23 个业务函数 + 19 个 RPC handler + 18 条控制服务路由契约 |
| 不复刻 | Electrobun 框架、UI 视觉（Vue 打包产物）、原生层 DLL |
| 原产物业务段 | 12,906 字符（`F:\DTC\reconstruction\business\bun-index.ts`） |
| 原产物框架段 | 890 万字符（不读、不复刻） |

## 目录

```text
replica/
  src/
    constants.ts        全部硬编码常量（超时、尺寸、API 路径、模型配置字段）
    root.ts             O-002~O-008  USB 根目录解析 + Node 运行时选择
    logger.ts           O-046~O-050  日志与睡眠
    health.ts           O-044/O-045/O-052  健康检查（异步 + 子进程同步）
    control-server.ts   O-009~O-016  控制服务拉起、复用、并发去重
    http.ts             O-031~O-036  通用 JSON 请求
    lifecycle.ts        O-026~O-030  CLI 生命周期兜底
    services.ts         O-017~O-025  服务启停与等待收敛
    rpc.ts              O-037~O-072  19 个 RPC handler 契约层
    app.ts              O-042/O-043/O-057/O-058/O-062/O-063  装配与退出清理
  tests/                与 OBLIGATIONS.md 逐条对应的验收测试
```

## 运行

```powershell
cd F:\DTC\replica
npm test
```

要求 Node >= 22（使用原生 TypeScript 类型剥离）。当前实测：Node 24.15.0，**81 个测试全部通过**。

### 资源约束（已知环境问题）

`npm test` 已固定 `--test-concurrency=2`。原因：Node 的测试运行器按文件并行，
每个子进程都要加载 TypeScript 类型剥离器（amaro/WASM）。在内存吃紧的机器上
（实测本机总内存 14.73 GB、可用仅 0.4 GB）并发过高会报：

```text
RangeError: Failed to allocate memory
FATAL ERROR: Committing semi space failed. Allocation failed - JavaScript heap out of memory
```

**这是宿主内存不足，不是代码缺陷。** 若仍失败：

1. 先关掉其它占用内存的程序，确认可用内存 > 1 GB
2. 或临时改用串行：`node --test --test-concurrency=1 "tests/**/*.test.ts"`
3. 需要全速并行时用 `npm run test:single`（无并发限制）

## 与原产物的等价性约束

复刻遵循"不做改进"原则，以下原产物行为被**刻意保留**：

1. `saveModelConfig` 的 `providerType` 固定 `"openai-compatible"`、`apply` 固定 `"both"`，忽略入参
2. `stopAllServices` 无论 API 成败**都**执行一次 CLI stop（调用在 try/catch 之外）
3. `stopAllServices` 返回 `apiResult ?? cliResult`，API 成功时丢弃 CLI 结果
4. `pingSync` 用独立 node 子进程 + 退出码，而非直接 fetch
5. RPC `maxRequestTime` 为 `Infinity`
6. `waitForControlServerShutdown` 在 controlUrl 为空时立即返回 true
7. 日志文件只 append，无轮转
8. 退出流程存在并发竞态，未加锁

## 未覆盖（明确声明）

| 项 | 原因 |
|---|---|
| Electrobun 运行时（BrowserWindow / RPC 传输 / Utils.quit） | 公开框架，作为依赖而非复刻对象 |
| UI 层（`views/mainview`） | 不在 SCOPE 内 |
| 自动更新流程（bspatch + zig-zstd） | 不在 SCOPE 内（原 U-05） |
| 原生窗口层 `libNativeWrapper.dll` | 不在 SCOPE 内（原 U-06） |
| 控制服务端实现 | 已在本仓库 `core/node/dist/` 中存在，无需复刻 |

## 追溯

| 文件 | 内容 |
|---|---|
| `docs/reconstruction/REPLICA-PLAN.md` | 阶段 0–5 执行计划 |
| `docs/reconstruction/SCOPE.md` | 范围决策与变更记录 |
| `docs/reconstruction/ARTIFACT-INVENTORY.md` | 产物勘察清单（成员、分层、启动链路） |
| `docs/reconstruction/OBLIGATIONS.md` | 78 条复刻义务清单（本目录的编码规格书） |
| `docs/reconstruction/COVERAGE.md` | 覆盖率三态自评 |
| `reconstruction/business/bun-index.ts` | 从产物中提取的业务源码（唯一逆向底本） |
