# 端到端验证报告（E2E）

> 阶段 4 的补充验证。目的：证明 `replica/` 的客户端逻辑能对接**真实的控制服务端**，
> 而不只是对桩代码通过单元测试。
>
> 执行日期：2026-10-19

## 方法

1. 在 `F:\DTC\tmp-e2e\usbroot` 搭建最小 USB root，复制本仓库 `core/node/dist/*.js`
2. 用**原产物相同的方式**拉起控制服务：
   ```
   node <root>/core/node/dist/clawhermes.js control-server --usb-root <root> --port 0 --json
   ```
3. 用 `replica/src/` 的真实模块（`http.ts` / `health.ts` / `rpc.ts` / `control-server.ts` / `app.ts`）对接
4. 验证完成后通过 `control-server-stop` 正常停止，清理全部临时目录

## 结果：14 项全部通过

| 义务 | 验证内容 | 实测结果 |
|---|---|---|
| O-014 | 读 `data/tmp/control-server.json` | ✅ url=`http://127.0.0.1:53590/` pid=17764 |
| O-044 / O-052 | `ping(healthUrl(baseUrl))` | ✅ `true` |
| O-041 | `GET /api/skills` | ✅ 返回 `{root, skillsDir, exists:false, total:0, deduplicat...}` |
| O-039 | `GET /api/device-binding` | ✅ 返回 `{root, bindingPath, stat...}` |
| O-037 | `GET /api/model-config` | ✅ 返回 `{root, configPath, exists...}` |
| O-053 | `GET /api/channels/weixin` | ✅ `status="missing-plugin"`、`displayName="微信"`（三态机实测） |
| O-049 | `GET /api/logs?service=launcher&lines=3` | ✅ 返回 `{root, target:"launcher", path...}` |
| O-043 | `GET /api/status` | ✅ 返回含 `services` 数组与 `generatedAt` |
| O-043 | `getStatusPayload()` 兜底链 | ✅ services=1 |
| O-042 | `readStatusSnapshot()` | ✅ `{services:[]}` |
| O-061 | `getBootstrap()` | ✅ `controlUrl` 正确去尾斜杠 |
| O-066 | `minimizeWindow()` | ✅ `{minimized:true}` |
| O-067 | `maximizeWindow()` 连续两次 | ✅ 返回 `{maximized:true}` |
| — | `control-server-stop` 正常退出 | ✅ `{root, stopped:true}`，PID 17764 已退出 |

### 控制服务返回的 metadata（实测）

```json
{
  "serviceId": "control-server",
  "displayName": "Control Server",
  "status": "running",
  "processId": 17764,
  "startedAt": "2026-10-19T06:46:30.741Z",
  "url": "http://127.0.0.1:53590/",
  "root": "F:\\DTC\\tmp-e2e\\usbroot",
  "logFile": "F:\\DTC\\tmp-e2e\\usbroot\\data\\logs\\control-server.log"
}
```

这印证了 OBLIGATIONS 附录 A 中的两条契约：
- `url` **带尾斜杠**（所以上游要 `replace(/\/$/,"")`）
- `--port 0` 时由系统分配端口（实测 53590）

## 过程中发现并修正的 3 个问题

| 问题 | 现象 | 根因 | 处置 |
|---|---|---|---|
| 控制服务起不来（1） | `clawhermes.js control-server` 无输出、无 metadata | E2E 目录建在 `replica/` 内，继承了 `replica/package.json` 的 `"type":"module"`，导致 CommonJS 的 core 代码被当 ESM 解析（`exports is not defined in ES module scope`） | 改到 `F:\DTC\tmp-e2e\usbroot` 独立目录，并放一个 CommonJS 的 `package.json` |
| 控制服务起不来（2） | 直接跑 `control-server.js` 无反应 | 该文件的入口守卫要求 `process.argv[1]` 以 `control-server.js` 结尾**并走 `runControlServer`**，实际应由 `clawhermes.js` 的 `control-server` 子命令调用 `startControlServer` | 改用原产物真实调用路径 |
| `/api/status` 500 | `ENOENT: scandir ...\adapters` | 最小 USB root 缺 `adapters/` 目录 | 补建空目录 |

> 这 3 个问题**都不在 replica 代码里**，属于搭建测试环境的坑；但记录下来可以避免下次重踩。

## 结论

- **单元测试（81 个）+ 端到端验证（14 项）双重通过。**
- 复刻实现的 HTTP 契约、健康检查、metadata 读取、RPC 返回结构，与真实控制服务端**行为一致**。
- E2E 验证后已彻底清理：`tmp-e2e/` 已删除，控制服务进程已停止，`replica/tests/` 无残留。

## 复现方式

```powershell
# 1. 搭建最小 root（务必放在 replica/ 之外，避免 ESM 冲突）
$root = 'F:\tmp-e2e\usbroot'
New-Item -ItemType Directory -Force "$root\core\node\dist" | Out-Null
Copy-Item F:\DTC\core\node\dist\*.js "$root\core\node\dist\"
New-Item -ItemType Directory -Force "$root\adapters" | Out-Null
'{"name":"e2e-usbroot","private":true}' | Set-Content "$root\package.json"

# 2. 起控制服务
node "$root\core\node\dist\clawhermes.js" control-server --usb-root $root --port 0 --json

# 3. 用 replica 客户端对接（见本报告"方法"第 3 步）

# 4. 停止并清理
node "$root\core\node\dist\clawhermes.js" control-server-stop --usb-root $root --json
Remove-Item -Recurse -Force 'F:\tmp-e2e'
```
