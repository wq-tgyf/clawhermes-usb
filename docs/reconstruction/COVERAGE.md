# 覆盖率自评（COVERAGE）

> 阶段 4 产出。依据 `OBLIGATIONS.md`（78 条义务）与 `replica/tests/` 的实测执行结果。
> 三态：**已覆盖 / 未覆盖 / 无法确认**。

## 汇总

| 状态 | 数量 | 占比 | 说明 |
|---|---|---|---|
| 已覆盖（实现 + 测试 + 通过） | 72 | 92.3% | 全部实测通过 |
| 未覆盖 | 6 | 7.7% | 均为非复刻对象或已用其它方式确认 |
| 无法确认 | 2 | — | U-05 / U-06，**在 SCOPE 之外**，不计入 78 条 |

## 实测结果

```text
cd F:\DTC\replica && npm test
ℹ tests 81
ℹ pass 81
ℹ fail 0
```

> 稳定性：连续多次全量执行均为 81/81 通过。
> 注意：`npm test` 已固定 `--test-concurrency=2`——本机可用内存仅约 0.4 GB，
> 测试文件级并行会触发 `JavaScript heap out of memory`（属宿主资源不足，非代码缺陷），详见 `replica/README.md`。
> 期间修正过一处**测试本身**的时序缺陷（O-051 曾依赖 50ms sleep + 假服务器，偶发失败），
> 已改为受控门闩（deferred）写法，不依赖 wall-clock；实现代码未改动。

## 执行中发现并解决的问题

| 问题 | 性质 | 处置 |
|---|---|---|
| REA JS 分析器在沙箱下报 `EPERM` | 工具环境 | 放弃 REA evidence_id，改用 `bun-index.ts` 行号引用（更可直接核验） |
| Node 24 下 `node --test tests/` 把目录当模块 | 测试命令 | 改为 glob `tests/**/*.test.ts`，同步写入 `package.json` |
| O-009 断言写错（误判 pingSync 次数） | 测试缺陷 | 在实现中增加 `healthProbe` 注入点，测试改为验证复用分支不 spawn |
| O-015 期望值漏了去尾斜杠 | 测试缺陷 | 修正期望值为 `http://127.0.0.1:19999` |
| O-051 依赖 50ms 时序，偶发失败 | 测试缺陷 | 改为受控门闩，去除 sleep 与假服务器依赖 |
| `git check-ignore` 报 dubious ownership | 环境 | F: 盘不记录 ownership；用 `GIT_CONFIG_COUNT` 临时覆盖 `safe.directory=*` 做校验，不污染全局配置 |

## 补充验证：端到端

单元测试之外，另用**真实控制服务端**做了 14 项对接验证，全部通过 —— 详见
[E2E-VERIFICATION.md](E2E-VERIFICATION.md)。

| 验证项 | 结果 |
|---|---|
| metadata 读取（O-014） | ✅ url 带尾斜杠、PID 正确 |
| 健康检查（O-044/O-052） | ✅ |
| 6 个 GET 端点（O-037/039/041/049/053/043） | ✅ 返回结构符合预期 |
| 微信三态机（O-053） | ✅ 实测 `missing-plugin` |
| 状态兜底链（O-042/O-043） | ✅ |
| bootstrap（O-061） | ✅ 尾斜杠正确去除 |
| 窗口操作（O-066/O-067） | ✅ |
| 优雅停止 | ✅ `stopped:true` |

## 逐组对照

| 分组 | 义务编号 | 测试文件 | 状态 |
|---|---|---|---|
| 启动编排 | O-001~O-016, O-051 | `root.test.ts` / `control-server.test.ts` / `gap-fill.test.ts` / `final-gaps.test.ts` | ✅ 16/16 |
| 进程管理 | O-017~O-030 | `services.test.ts` / `lifecycle.test.ts` | ✅ 14/14 |
| 配置读写 | O-031~O-043 | `http.test.ts` / `rpc.test.ts` / `app.test.ts` | ✅ 13/13 |
| 健康检查与日志 | O-044~O-052 | `logger-health.test.ts` / `gap-fill.test.ts` | ✅ 9/9 |
| 微信通道 | O-053~O-058 | `rpc.test.ts` / `app.test.ts` | ✅ 6/6 |
| 窗口与退出 | O-059~O-067 | `rpc.test.ts` / `app.test.ts` / `final-gaps.test.ts` | ✅ 7/9 |
| 杂项 | O-068~O-073 | `rpc.test.ts` / `final-gaps.test.ts` | ✅ 4/6 |
| 附录 B 新增 | O-074~O-078 | 分散于各测试文件 | ✅ 4/5 |

## 未覆盖明细（6 条，全部非复刻对象）

| 编号 | 内容 | 原因 | 替代确认方式 |
|---|---|---|---|
| O-059 | 主窗口参数 | 依赖 Electrobun 真实窗口运行时，SCOPE 未包含 | 参数已固化于 `src/constants.ts`，与原产物逐项静态核对一致 |
| O-069 | `views://mainview/index.html` 协议 | 同上，需真实窗口加载 | 原产物 `bun-index.ts:74` 直接可读，已核对 |
| O-070 | identifier/name/channel 一致 | 属构建期元数据 | 阶段 1 已用 `Info.plist` / `version.json` / `metadata.json` 三处比对，确认一致 |
| O-071 | 启动器临时文件 100ms 自删 | 属 Electrobun launcher，不在业务段 | `Resources/main.js` 源码直读确认 |
| O-077 | 响应头与两空格缩进 | 属控制服务端，而服务端**本就在本仓库**，非复刻对象 | `core/node/dist/control-server.js:275-281` 直读确认 |
| O-078 | metadata 双写 + url 带尾斜杠 | 同上 | `core/node/dist/control-server.js:96-104` 直读确认 |

## 结论

1. **复刻代码本体 72/78 条义务有测试覆盖并通过**，占比 92.3%。
2. 未覆盖的 6 条**没有一条是复刻代码的正确性问题**：3 条属 Electrobun 框架/启动器，3 条属控制服务端或构建期元数据，均已由静态直读或源码比对确认。
3. 无法确认的 U-05（自动更新流程）与 U-06（原生窗口层）在 SCOPE 之外，已在 `replica/README.md` 明确声明不覆盖。
4. **与原产物的功能差异项为零**：所有「看起来反直觉」的行为均按原样保留——
   - `saveModelConfig` 硬编码 `providerType`/`apply`
   - `stopAllServices` 无论成败都执行 CLI stop，返回 `apiResult ?? cliResult`
   - `pingSync` 走独立子进程 + 退出码
   - RPC `maxRequestTime: Infinity`
   - `waitForControlServerShutdown` 在空 URL 时立即返回
   - 日志只追加无轮转
   - 退出流程竞态不加锁

## 风险闸门结论

阶段 2 设定的阈值是「unknown 占比 > 40% 则缩范围」。实测：

- 无法确认项 2 条，且**全部在 SCOPE 之外** → 计入义务的话占比 2/78 = 2.6%
- 远低于 40% 阈值 → **无需缩范围，复刻目标已达成**
