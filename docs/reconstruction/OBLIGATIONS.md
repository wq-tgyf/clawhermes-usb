# 复刻义务清单（OBLIGATIONS）

> 阶段 2 产出。**本文件是阶段 3 的编码规格书**：每一条都是必须复刻的行为，逐条可测。
> 证据形式：`bun-index.ts:<行号>`，指向 `F:\DTC\reconstruction\business\bun-index.ts`（374 行，从产物中静态提取的业务源码）。
> 状态：`covered`（有明确规格）/ `open`（已知需做，规格待补）/ `unknown`（静态无法确定）
> 统计：**73 条义务**（covered 72、open 1），另列 6 条 unknown 于文末。

---

## 复刻边界（承接 SCOPE.md）

| 范围 | 定义 |
|---|---|
| **必须复刻** | 23 个业务函数 + 19 个 RPC handler + 11 个控制服务端点契约 |
| **直接依赖** | Electrobun 框架（公开开源，不重写） |
| **不复刻** | UI 视觉（Vue 3.5.34 打包产物）、Electrobun 原生层 DLL |

> 证据：`bun-index.ts:1-9`（模块头）表明业务段仅 12,906 字符，其余 890 万字符均为 Electrobun 框架代码。

---

## 第 1 组：启动编排（16 条）

### O-001 · 模块初始化顺序
```text
行为：模块加载时依次执行 root = findUsbRoot()、controlUrl = ""、controlServerPromise = undefined、
      mainWindow = undefined、closingFromUi = false，然后写一行启动日志。
证据：bun-index.ts:2-6
验收：导入模块后，上述 5 个变量初始值符合；日志首行含 "Electrobun control starting. root=<root>"
状态：covered
```

### O-002 · USB 根目录解析：环境变量优先
```text
行为：若 process.env.CLAWHERMES_USB_ROOT 存在，直接 resolve 后返回，不再做后续探测。
证据：bun-index.ts:253-255
验收：设置该环境变量为任意路径时，findUsbRoot() 原样返回其 resolve 结果
状态：covered
```

### O-003 · USB 根目录解析：候选序列
```text
行为：候选顺序为 1) rootHintCandidates(start) 2) rootHintCandidates(cwd)
      3) cwd 4) start 5) ancestorPaths(start) 6) ancestorPaths(cwd)；
      逐个检查 <candidate>/core/node/dist/clawhermes.js 是否存在，首个命中即返回。
证据：bun-index.ts:256-268
验收：构造多层目录，仅在祖先层放置该文件，应返回该祖先层
状态：covered
```

### O-004 · USB 根目录解析：兜底路径
```text
行为：全部候选未命中时返回 resolve(start, "../../../..")，不抛错。
证据：bun-index.ts:268
验收：空目录树调用时返回上溯四级的绝对路径，且不抛异常
状态：covered
```

### O-005 · 根目录提示文件
```text
行为：从 start 及其各级祖先目录中，依次查找 Resources/clawhermes-usb-root.txt 与
      clawhermes-usb-root.txt，读取内容 trim 后作为候选（忽略读失败），过滤空值。
证据：bun-index.ts:269-283
验收：在祖先层放置提示文件，其内容应排在 cwd 之前被尝试
状态：covered
```

### O-006 · 祖先路径枚举
```text
行为：ancestorPaths(start) 从 resolve(start) 开始逐级取上级目录直到根，
      遇 dirname(x) === x 停止，不包含 start 自身。
证据：bun-index.ts:284-292
验收："C:\a\b\c" 返回 ["C:\a\b","C:\a","C:\"]（Windows 语义）
状态：covered
```

### O-007 · Node 运行时选择：Windows
```text
行为：非 darwin 平台时，若 <usbRoot>/runtimes/windows/node/node.exe 存在则用它，
      否则回退到裸命令 "node"。
证据：bun-index.ts:293-301
验收：存在便携 node 时命令数组首元素为该绝对路径；不存在时为 "node"
状态：covered
```

### O-008 · Node 运行时选择：macOS
```text
行为：darwin 平台下按 arch 选 darwin-arm64 / darwin-x64，
      检查 <usbRoot>/runtimes/macos/node/<platform>/bin/node，存在即用，否则回退 "node"。
证据：bun-index.ts:294-298
验收：模拟 darwin+arm64 时路径含 runtimes/macos/node/darwin-arm64/bin/node
状态：covered
```

### O-009 · 控制服务拉起：复用已有实例
```text
行为：先读 <usbRoot>/data/tmp/control-server.json 得到 metadata；
      若 pingSync(metadata.url 去掉尾部斜杠 + "/api/health") 为真，
      写日志 "Reusing control server metadata: <url>" 并直接返回 metadata.url。
证据：bun-index.ts:212-217
验收：预置 metadata 文件且健康检查可达时，不产生新的 spawnSync 调用
状态：covered
```

### O-010 · 控制服务拉起：命令行构造
```text
行为：命令为 [...nodeCommand(usbRoot), <usbRoot>/core/node/dist/clawhermes.js,
      "control-server", "--usb-root", usbRoot, "--port", "0", "--json"]；
      --port 0 表示由系统分配端口。
证据：bun-index.ts:218-227
验收：捕获的 argv 与上述序列逐项相等（"--port","0" 是两个独立元素）
状态：covered
```

### O-011 · 控制服务拉起：执行参数
```text
行为：spawnSync(command[0], command.slice(1), { cwd: usbRoot, encoding: "utf8",
      timeout: 10000, windowsHide: true })，同步阻塞等待。
证据：bun-index.ts:229-234
验收：cwd 为 usbRoot；timeout 为 10000ms；windowsHide 为 true
状态：covered
```

### O-012 · 控制服务拉起：失败处理
```text
行为：status !== 0 时，若 stdout/stderr 非空则各截取末尾 2000 字符写日志，
      然后抛 Error(stderr || "Failed to start control server.")。
证据：bun-index.ts:236-243
验收：命令返回 1 且 stderr 有内容时，抛出的 message 等于该 stderr
状态：covered
```

### O-013 · 控制服务拉起：成功解析
```text
行为：解析 stdout 为 JSON，返回 payload.url（不额外校验字段存在性）。
证据：bun-index.ts:244-245
验收：stdout 为 {"url":"http://127.0.0.1:12345"} 时返回该 url
状态：covered
```

### O-014 · 控制服务元数据读取
```text
行为：读 <usbRoot>/data/tmp/control-server.json 并 JSON.parse；任何异常返回 null。
证据：bun-index.ts:246-252
验收：文件不存在、内容非法 JSON、读取无权限三种情况均返回 null 且不抛错
状态：covered
```

### O-015 · 控制 URL 并发去重
```text
行为：getControlUrl() 若已有 controlUrl 直接返回；否则若 controlServerPromise 为空，
      创建 Promise 链：ensureControlServer(root) → 去尾部斜杠 → 缓存到 controlUrl；
      失败时把 controlServerPromise 置回 undefined 并重新抛出。
证据：bun-index.ts:127-139
验收：并发调用 3 次 getControlUrl()，ensureControlServer 仅被执行 1 次
状态：covered
```

### O-016 · 控制 URL 容错读取
```text
行为：getControlUrlOrEmpty() 捕获全部异常，写日志
      "Control server bootstrap failed; UI will use fallback status paths. <msg>"，返回空字符串。
证据：bun-index.ts:140-148
验收：控制服务不可达时返回 "" 且不抛出
状态：covered
```

---

## 第 2 组：进程管理（14 条）

### O-017 · 启动全部服务：首选 API
```text
行为：POST /api/services/start，body {}；成功即返回其结果。
证据：bun-index.ts:170-173
验收：HTTP 200 时返回值等于响应 JSON，且不调用 CLI 兜底
状态：covered
```

### O-018 · 启动全部服务：CLI 兜底
```text
行为：API 失败时写日志 "Control API start failed; falling back to CLI start. <msg>"，
      然后 runClawHermesLifecycle("start", { throwOnFailure: true })。
证据：bun-index.ts:173-176
验收：API 抛错时 CLI 被调用一次，且 action 为 "start"
状态：covered
```

### O-019 · 停止全部服务：双通道执行
```text
行为：先 POST /api/services/stop（超时 5000ms，body {}）；
      若 options.waitForStopped 为真，随后 await waitForServicesStopped()；
      无论 API 成功与否，都再执行 runClawHermesLifecycle("stop", { throwOnFailure: false })；
      最终返回 apiResult ?? cliResult。
证据：bun-index.ts:178-189
验收：API 成功时仍发生一次 CLI stop；返回值为 API 结果而非 CLI 结果
状态：covered
```

### O-020 · 停止全部服务：API 失败日志
```text
行为：API 失败时写日志 "Control API stop failed; falling back to CLI stop. <msg>"，不抛出。
证据：bun-index.ts:184-186
验收：API 返回 500 时函数正常返回 CLI 结果，无异常抛出
状态：covered
```

### O-021 · 等待服务停止：轮询条件
```text
行为：默认超时 9000ms。循环内 GET /api/status（超时 3000ms），
      取 (status.services ?? []) 中 status === "running" 的项；为空则立即返回 true。
证据：bun-index.ts:190-197
验收：服务全部停止后首次轮询即返回 true
状态：covered
```

### O-022 · 等待服务停止：重试节拍
```text
行为：仍有 running 服务时，再发一次 POST /api/services/stop（超时 3000ms），
      然后 sleep(250)，继续循环。
证据：bun-index.ts:198-201
验收：轮询间隔约 250ms，且每轮都重发一次 stop
状态：covered
```

### O-023 · 等待服务停止：超时
```text
行为：超过 deadline 仍未停止则返回 false（不抛错）。
证据：bun-index.ts:202
验收：服务永不停止时，约 9000ms 后返回 false
状态：covered
```

### O-024 · 等待控制服务关闭：返回条件
```text
行为：默认超时 8000ms。循环内若 controlUrl 为空，或 ping(controlUrl + "/api/health")
      为假，立即返回 true。
证据：bun-index.ts:203-210
验收：controlUrl 为 "" 时立即返回 true，不等待
状态：covered
```

### O-025 · 等待控制服务关闭：节拍
```text
行为：仍存活时 sleep(120) 后继续；超时返回 false。
证据：bun-index.ts:208
验收：健康检查间隔约 120ms
状态：covered
```

### O-026 · CLI 生命周期兜底：命令构造
```text
行为：命令为 [...nodeCommand(root), <root>/core/node/dist/clawhermes.js,
      action, "--usb-root", root, "--json"]。
证据：bun-index.ts:309-316
验收：action="stop" 时 argv 中该位置为 "stop"
状态：covered
```

### O-027 · CLI 生命周期兜底：差异化超时
```text
行为：timeout 为 action === "start" ? 20000 : 10000；windowsHide 为 true；cwd 为 root。
证据：bun-index.ts:318-323
验收：action="start" 时超时 20000ms，action="stop" 时 10000ms
状态：covered
```

### O-028 · CLI 生命周期兜底：失败策略
```text
行为：status !== 0 且 options.throwOnFailure 为真时抛错，message 优先取 stderr，
      其次 completed.error.message，最后 "<action> fallback failed."；否则不抛错。
证据：bun-index.ts:329-331
验收：throwOnFailure=false 时退出码非零不抛错
状态：covered
```

### O-029 · CLI 生命周期兜底：返回值三级降级
```text
行为：1) 有 stdout 且能 JSON.parse → 返回解析结果
      2) 有 stdout 但解析失败 → 返回 { root, action, status, stdout, stderr }
      3) 无 stdout → 返回 { root, action, status }
证据：bun-index.ts:332-337
验收：stdout="not json" 时返回含原始 stdout 字段的对象
状态：covered
```

### O-030 · CLI 兜底日志
```text
行为：执行前写 "Running CLI lifecycle fallback: <命令拼接>"；执行后写
      "CLI lifecycle fallback completed. action=<a> status=<s> signal=<sig> error=<msg>"；
      stdout/stderr 非空时各写末尾 2000 字符。
证据：bun-index.ts:317, 324-328
验收：日志文件出现上述三类记录
状态：covered
```

---

## 第 3 组：配置读写（13 条）

### O-031 · 通用 JSON 请求：超时机制
```text
行为：requestJson 用 AbortController，默认 timeoutMs=15000，到时 abort 请求。
证据：bun-index.ts:101-107
验收：故意延迟的接口在 15s 后触发 abort，函数抛出
状态：covered
```

### O-032 · 通用 JSON 请求：默认方法与前缀
```text
行为：URL 为 <baseUrl><path>，baseUrl 来自 await getControlUrl()（已去尾斜杠）；
      method 默认 "GET"。
证据：bun-index.ts:101, 105-111
验收：连续调用不产生 "//" 拼接
状态：covered
```

### O-033 · 通用 JSON 请求：请求头只在有 body 时设置
```text
行为：headers 为 options.body ? { "content-type": "application/json" } : undefined；
      有 body 时用 JSON.stringify 序列化。
证据：bun-index.ts:108-110
验收：无 body 的请求不带 content-type 头
状态：covered
```

### O-034 · 通用 JSON 请求：错误详情提取
```text
行为：!response.ok 时，先构造 "<status> <statusText>"，尝试解析响应体，
      若 payload.error.message 存在则用它替换 detail；
      最终抛 Error("Control API failed: <detail>")。
证据：bun-index.ts:112-122
验收：响应 {"error":{"message":"boom"}} + 500 时，message 为 "Control API failed: boom"
状态：covered
```

### O-035 · 通用 JSON 请求：超时清理
```text
行为：用 try/finally 保证 clearTimeout(timeout) 一定执行。
证据：bun-index.ts:123-125
验收：请求即时返回后定时器被清除，进程不残留挂起的 timeout
状态：covered
```

### O-036 · 简化超时封装
```text
行为：requestJsonWithTimeout(path, options, timeoutMs=4000) 等价于
      requestJson(path, { ...options, timeoutMs })。
证据：bun-index.ts:149-151
验收：传入 5000 时最终 requestJson 收到 timeoutMs=5000
状态：covered
```

### O-037 · 读取模型配置
```text
行为：RPC getModelConfig → GET /api/model-config。
证据：bun-index.ts:31
验收：返回体透传，不做字段改写
状态：covered
```

### O-038 · 保存模型配置：字段归一
```text
行为：RPC saveModelConfig(config) → POST /api/model-config，
      body 固定为 { providerType: "openai-compatible", apiUrl, model, apiKey, apply: "both" }。
      providerType 与 apply 是硬编码，不从入参读取；入参多余字段被丢弃。
证据：bun-index.ts:33-43
验收：入参含 providerType:"x" 时，请求体中仍为 "openai-compatible"
状态：covered
```

### O-039 · 读取设备绑定
```text
行为：RPC getDeviceBinding → GET /api/device-binding。
证据：bun-index.ts:23
验收：返回体透传
状态：covered
```

### O-040 · 绑定设备
```text
行为：RPC bindDevice → POST /api/device-binding/bind，body {}（无参）。
证据：bun-index.ts:24
验收：请求体为 "{}"
状态：covered
```

### O-041 · 读取技能清单
```text
行为：RPC getSkills → GET /api/skills。
证据：bun-index.ts:22
验收：返回体透传
状态：covered
```

### O-042 · 状态快照兜底
```text
行为：readStatusSnapshot() 读 <root>/data/tmp/status.json 并 JSON.parse；
      任何异常返回 { services: [] }。
证据：bun-index.ts:302-308
验收：文件缺失时返回对象含空数组而非 null
状态：covered
```

### O-043 · 状态获取兜底链
```text
行为：RPC getStatus → getStatusPayload() → 先 GET /api/status；失败则写日志
      "Control API status failed; falling back to status snapshot. <msg>"，
      返回 readStatusSnapshot()。
证据：bun-index.ts:162-169
验收：控制服务不可达时返回 { services: [] }
状态：covered
```

---

## 第 4 组：健康检查与日志（9 条）

### O-044 · 异步健康检查
```text
行为：ping(url) 用 fetch，response.ok 为真返回 true；任何异常返回 false。
证据：bun-index.ts:338-345
验收：URL 不可达时返回 false 且不抛错
状态：covered
```

### O-045 · 同步健康检查
```text
行为：pingSync(url) 用 nodeCommand(root) 起子进程执行
      -e "fetch(<url>).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"，
      timeout 3000，windowsHide true；退出码 0 视为健康。
证据：bun-index.ts:346-353
验收：健康返回 true，不健康返回 false，超时返回 false
状态：covered
```

### O-046 · 日志文件位置
```text
行为：日志写入 <root>/data/logs/electrobun-control.log，写入前 mkdir 递归创建目录。
证据：bun-index.ts:354-360
验收：root 下不存在 data/logs 时自动创建
状态：covered
```

### O-047 · 日志行格式
```text
行为：每行 "<ISO8601 时间戳> <消息>" + 换行，append 模式，utf8。
证据：bun-index.ts:358-359
验收：时间戳可被 new Date() 解析；同一秒多条各占一行
状态：covered
```

### O-048 · 日志写入失败静默
```text
行为：写盘异常时 console.error("electrobun log write failed", error)，
      不向上抛出，不影响主流程。
证据：bun-index.ts:360-362
验收：日志目录不可写时主流程照常执行
状态：covered
```

### O-049 · 读取启动器日志
```text
行为：RPC getLogs → GET /api/logs?service=launcher&lines=140。
证据：bun-index.ts:21
验收：查询串逐字符相等，含 lines=140
状态：covered
```

### O-050 · 睡眠工具
```text
行为：sleep(ms) 返回 setTimeout 的 Promise。
证据：bun-index.ts:363-365
验收：sleep(100) 约 100ms 后 resolve
状态：covered
```

### O-051 · 启动后异步预热控制服务
```text
行为：BrowserWindow 创建后立即调用 getControlUrl()，成功写
      "Control server ready: <url>"，失败写 "Control server startup failed: <msg>"；
      该调用不 await，不阻塞窗口显示。
证据：bun-index.ts:88-93
验收：窗口先出现，日志随后出现；控制服务失败不影响窗口
状态：covered
```

### O-052 · 健康检查端点契约
```text
行为：所有健康探测统一使用 <baseUrl>/api/health，且 baseUrl 去尾部斜杠后拼接。
证据：bun-index.ts:208, 216, 350
验收：不出现 "//api/health"
状态：covered
```

---

## 第 5 组：微信通道（6 条）

### O-053 · 查询通道状态
```text
行为：RPC getWeixinChannelStatus → GET /api/channels/weixin。
证据：bun-index.ts:25
验收：返回体透传
状态：covered
```

### O-054 · 查询通道日志
```text
行为：RPC getWeixinChannelLogs → GET /api/channels/weixin/logs?lines=160。
证据：bun-index.ts:26
验收：查询串含 lines=160
状态：covered
```

### O-055 · 启动通道登录
```text
行为：RPC startWeixinChannelLogin → POST /api/channels/weixin/login，body {}。
证据：bun-index.ts:27
验收：请求体为 "{}"
状态：covered
```

### O-056 · 停止通道登录
```text
行为：RPC stopWeixinChannelLogin → POST /api/channels/weixin/stop，body {}。
证据：bun-index.ts:28
验收：请求体为 "{}"
状态：covered
```

### O-057 · 退出前先停微信
```text
行为：cleanupBeforeExit() 第一步即 POST /api/channels/weixin/stop（超时 4000ms），
      失败被吞掉。
证据：bun-index.ts:152-155
验收：微信接口报错时后续步骤仍照常执行
状态：covered
```

### O-058 · 退出清理顺序
```text
行为：严格顺序 1) 停微信 → 2) stopAllServices({waitForStopped:true})
      → 3) POST /api/shutdown（失败吞掉） → 4) waitForControlServerShutdown()。
证据：bun-index.ts:152-161
验收：用调用记录验证四步顺序
状态：covered
```

---

## 第 6 组：窗口与退出（9 条）

### O-059 · 主窗口参数
```text
行为：new BrowserWindow({ title: "DTclaw Control", url: "views://mainview/index.html",
      frame: { width: 1120, height: 760, x: 80, y: 60 },
      styleMask: { Resizable: true }, titleBarStyle: "hidden", rpc })。
证据：bun-index.ts:71-85
验收：尺寸/坐标/标题逐项相等；titleBarStyle 为 "hidden"
状态：covered
```

### O-060 · RPC 全局约束
```text
行为：BrowserView.defineRPC({ maxRequestTime: Infinity, handlers: { requests: {...} } })。
证据：bun-index.ts:9-10
验收：maxRequestTime 为 Infinity，即 RPC 无超时上限
状态：covered
```

### O-061 · bootstrap 返回结构
```text
行为：RPC getBootstrap → { root, controlUrl: await getControlUrlOrEmpty() }。
      controlUrl 可能为 ""，不抛错。
证据：bun-index.ts:13
验收：控制服务不可达时返回 { root, controlUrl: "" }
状态：covered
```

### O-062 · 关闭事件接线
```text
行为：mainWindow.on("close", ...) 中，若 closingFromUi 为假则调用 beginImmediateClose()。
证据：bun-index.ts:94-96
验收：用户点窗口关闭钮触发清理；UI 主动关闭时不重复触发
状态：covered
```

### O-063 · 立即关闭幂等
```text
行为：beginImmediateClose() 首行判断 closingFromUi，为真直接 return；
      否则置 true，随后 cleanupBeforeExit()，finally 中 Utils.quit()；
      清理异常仅 console.error("cleanup before exit failed", e)。
证据：bun-index.ts:97-106
验收：连续调用两次，cleanupBeforeExit 只执行一次
状态：covered
```

### O-064 · UI 发起关闭
```text
行为：RPC closeWindow → beginImmediateClose()，返回 { closed: true, cleanup: "foreground" }。
证据：bun-index.ts:64-67
验收：返回值键名与字面值完全一致
状态：covered
```

### O-065 · 优雅关闭
```text
行为：RPC shutdown → await cleanupBeforeExit()，返回 { status: "stopping" }。
证据：bun-index.ts:50-53
验收：返回 { status: "stopping" }
状态：covered
```

### O-066 · 最小化
```text
行为：RPC minimizeWindow → mainWindow?.minimize()，返回 { minimized: true }。
证据：bun-index.ts:54-57
验收：无窗口时不抛错（可选链）
状态：covered
```

### O-067 · 最大化切换
```text
行为：RPC maximizeWindow → 若 mainWindow.isMaximized() 则 unmaximize 并返回
      { maximized: false }；否则 maximize 并返回 { maximized: true }。
证据：bun-index.ts:58-63
验收：连点两次应在 true/false 之间交替
状态：covered
```

---

## 第 7 组：杂项（6 条）

### O-068 · 打开外部链接
```text
行为：RPC openUrl(payload) → payload.url 存在时 Utils.openExternal(url)，
      无条件返回 { opened: true }。
证据：bun-index.ts:44-49
验收：url 为空时不调用 openExternal，但仍返回 { opened: true }
状态：covered
```

### O-069 · UI 视图协议
```text
行为：窗口 url 使用 "views://mainview/index.html" 自定义协议，
      对应磁盘 views/mainview/index.html。
证据：bun-index.ts:74
验收：窗口能加载 index.html（含 /assets/index-gtvi0VD1.js）
状态：covered
```

### O-070 · 版本标识一致性
```text
行为：identifier "dev.clawhermes.control"、name "DTclawControl-canary"、
      channel "canary" 由 version.json 提供，原样传递给原生层。
证据：Info.plist / version.json｜inferred
验收：三处取值一致（阶段 1 已实测一致）
状态：covered
```

### O-071 · 启动器临时文件行为
```text
行为：main.js 从 app.asar 读 bun/index.js → 写 %TEMP%/electrobun-<ts>-<rand>.js，
      setTimeout 100ms 后 unlinkSync 自删，再用 Worker 加载。
证据：Resources/main.js（6473 字节）｜observed
验收：启动后临时文件在 100ms 内消失；文件名含时间戳与随机串
状态：covered
```

### O-072 · 日志轮转策略
```text
行为：目标产物对日志文件不做轮转/截断，仅 append。
证据：bun-index.ts:354-360｜inferred（未见轮转代码）
验收：长期运行后文件持续增长
状态：open（启动器侧已确认；控制服务端是否另有轮转未知）
```

### O-073 · 退出时的并发竞态
```text
行为：stopAllServices 内部 waitForServicesStopped 与 cleanupBeforeExit 的
      waitForControlServerShutdown 可能并行推进，目标产物未加锁。
证据：bun-index.ts:152-161, 178-189｜inferred
验收：复刻实现对竞态行为不做额外保证，也不主动加锁（保持等价）
状态：covered
```

---

## 未决项（unknown）

| 编号 | 未决问题 | 需要的证据 | 影响 |
|---|---|---|---|
| U-01 | `core/node/dist/clawhermes.js control-server` 输出 JSON 字段全集 | 读本仓库该文件源码（**不需要逆向**） | O-010 返回值契约 |
| U-02 | `/api/status` 返回体中 `services[].status` 的取值域 | 同上 | O-021 过滤条件 |
| U-03 | `/api/services/start` 内部分阶段启动与失败回滚语义 | 同上 | O-017 兜底触发时机 |
| U-04 | `/api/channels/weixin/*` 状态机 | 同上 | O-053~O-058 |
| U-05 | 自动更新流程（bspatch.exe + zig-zstd.exe） | Electrobun `Updater` 段静态分析 | 不在 SCOPE 内，不覆盖 |
| U-06 | `libNativeWrapper.dll` 原生窗口行为 | 需 Ghidra/Hopper（未安装） | 不在 SCOPE 内，不复刻 |

> U-01 至 U-04 均可通过读 `F:\DTC\core\node\dist\clawhermes.js` 直接关闭，**建议阶段 3 开工前先做**。

---

## 统计

| 分组 | 条数 | covered | open |
|---|---|---|---|
| 启动编排 | 16 | 16 | 0 |
| 进程管理 | 14 | 14 | 0 |
| 配置读写 | 13 | 13 | 0 |
| 健康检查与日志 | 9 | 9 | 0 |
| 微信通道 | 6 | 6 | 0 |
| 窗口与退出 | 9 | 9 | 0 |
| 杂项 | 6 | 5 | 1 |
| **合计** | **73** | **72** | **1** |

> unknown 6 条中 4 条可由本仓库源码关闭，实际风险占比 2/73 ≈ 2.7%，**远低于 40% 阈值** → 无需缩范围，可进入阶段 3。

### 阶段 3 编码约束（由本清单推导）

1. 每条 O-xxx 对应一个测试，命名 `test_O0xx_<短名>`
2. 硬编码值（`providerType`、`apply`、超时数值、窗口尺寸、查询串）必须原样保留
3. 兜底链的**触发条件**与**返回值优先级**（`apiResult ?? cliResult`）必须逐字复刻
4. 不做「改进」：竞态、无日志轮转、错误吞掉等行为均按原样保留


---

## 附录 A：U-01 ~ U-04 的关闭结果（读本仓库源码后补齐）

> 依据文件：`F:\DTC\core\node\dist\control-server.js`（281 行，**已在仓库内，非逆向所得**）
> 辅助：`core\node\dist\core.js:244`（getStatus）、`core\node\dist\channels.js:17-58`（微信通道）

### A-1 · 控制服务路由全表（关闭 U-01 与端点契约）

| 方法 | 路径 | 处理函数 | 响应 |
|---|---|---|---|
| GET | `/api/health` | 内联 | `{ serviceId:"control-server", status:"running", root, generatedAt }` |
| GET | `/api/status` | `getStatus(root)` | 见 A-2 |
| GET | `/api/install/status` | `setupDiagnostics(root)` | — |
| GET | `/api/skills` | `listPortableSkills(root)` | — |
| GET | `/api/device-binding` | `getDeviceBindingStatus(root)` | — |
| POST | `/api/device-binding/bind` | `ensureDeviceBinding(root)` | — |
| GET | `/api/model-config` | `sharedModelConfigStatus` | `{ ...status, configured: status.exists }` |
| POST | `/api/model-config` | `configureSharedModel` | 字段经 `stringBodyValue` 过滤，非字符串转 undefined |
| GET | `/api/logs` | `readLogTail(root, service, lines)` | `service` 默认 "launcher"，`lines` 默认 80 |
| GET | `/api/channels/weixin` | `getWeixinChannelStatus` | 见 A-3 |
| GET | `/api/channels/weixin/logs` | `readWeixinChannelLog` | `lines` 默认 120 |
| POST | `/api/channels/weixin/login` | `startWeixinChannelLogin` | — |
| POST | `/api/channels/weixin/stop` | `stopWeixinChannelLogin` | — |
| POST | `/api/services/start` | `startSkeleton(root, { attachManagedToParent: true })` | — |
| POST | `/api/services/stop` | `stopSkeleton(root)` | — |
| POST | `/api/services/:id/start` | `startSingleAdapter(root, id, { dryRun:false, confirm:true, attachManagedToParent:true })` | 正则 `^\/api\/services\/([^/]+)\/(start|stop)$` |
| POST | `/api/services/:id/stop` | `stopSingleAdapter(root, id)` | 同上 |
| POST | `/api/shutdown` | 立即返回 `{ status:"stopping" }`，20ms 后删 metadata 并发 SIGTERM | — |
| * | 其它 | 404 | `{ error:{ code:"not_found", message:"No control API route for <M> <path>." } }` |

**关键契约（复刻必须遵守）**

| 编号 | 契约 |
|---|---|
| C-01 | 监听地址固定 `127.0.0.1`；`--port 0` 时由系统分配，实际端口写入 metadata |
| C-02 | 响应头固定 `content-type: application/json; charset=utf-8` 与 `cache-control: no-store` |
| C-03 | 响应体用 `JSON.stringify(payload, null, 2)`（两空格缩进） |
| C-04 | 未捕获异常统一回 500：`{ error:{ code:"operation_failed", message } }` |
| C-05 | metadata 同时写两处：`data/tmp/control-server.json` 与 `data/tmp/pids/control-server.pid`（同一内容） |
| C-06 | metadata 字段：`serviceId, displayName, status, processId, startedAt, url, root, logFile` | 
| C-07 | `url` 形如 `http://127.0.0.1:<port>/`（**带尾斜杠**），这就是上游 `replace(/\/$/,"")` 的原因 |
| C-08 | `--port` 默认 17100；`--usb-root` 默认 `process.cwd()` |
| C-09 | SIGTERM/SIGINT 时先删 metadata 再 `server.close()`，1s 兜底 `process.exit(0)` |
| C-10 | `/api/shutdown` 先回包再延迟 20ms 自杀，保证调用方能收到响应 |

### A-2 · `/api/status` 返回结构（关闭 U-02）

`getStatus` 返回 `{ ... , services: [...] }`，每个 service 至少含：

```text
services[i] = {
  ...adapter 字段,
  status: "running" | "stopped" | <metadata.status>,
  processId: number | null,
  ...
}
```

判定逻辑（`core.js:244-290+`）：

1. 读 `<root>/data/tmp/ports.json` 的 portState，套用到 adapter
2. 读 adapter 的 pidFile；文件不存在 → `status = "stopped"`
3. metadata.placeholder === false 且 runner === "wsl2-background" → 走健康检查分支
4. metadata.placeholder === false 且 PID 无效/进程不存在 → 候选状态 + 健康检查；不 ready 则**删除 pidFile** 并置 stopped
5. 其余情况按 metadata.status ?? "running"

> 对 O-021 的意义：`(status.services ?? []).filter(s => s.status === "running")` 的过滤条件是**准确的**，`status` 取值域确认为 `"running" | "stopped"`（另有 metadata 透传值）。
> **新增义务 O-074**：控制服务端必须在 PID 失效时主动删除 pidFile（自愈），否则状态会永远卡在 running。

### A-3 · 微信通道状态机（关闭 U-04）

`getWeixinChannelStatus` 为三态机，返回结构固定含
`{ root, channel:"openclaw-weixin", displayName:"微信", status, command, logFile, messages }`：

| status | 触发条件 | 是否含 processId |
|---|---|---|
| `missing-plugin` | `apps/openclaw/node_modules` 下未安装 weixin 插件 | 否 |
| `running` | metadata 有 processId 且进程存在 | 是 |
| `stopped` | 其余全部 | 否 |

**新增义务 O-075**：三态互斥且按上述优先级判定；`messages` 文案随状态变化（英文句子，见源码 32-33、46、56 行）。

### A-4 · `/api/services/start` 语义（关闭 U-03）

`startSkeleton(root, { attachManagedToParent: true })` —— 注意 `await` 后才返回，故该端点可能耗时较长。
`/api/services/stop` 调 `stopSkeleton(root)`，**不 await**（同步函数）。

**新增义务 O-076**：start 为异步等待完成，stop 为同步立即返回；两者行为不对称，复刻时不得统一。

> 对 O-017 的意义：API 失败兜底触发时机 = `startSkeleton` 抛异常或 HTTP 非 2xx，而非超时。

---

## 附录 B：新增义务（由附录 A 推导）

| 编号 | 行为 | 证据 | 状态 |
|---|---|---|---|
| O-074 | 控制服务在 PID 失效时删除 pidFile 并置 status=stopped | `core.js:273-272` | covered |
| O-075 | 微信通道三态判定优先级 missing-plugin > running > stopped | `channels.js:23-57` | covered |
| O-076 | `/api/services/start` 异步等待，`/api/services/stop` 同步返回 | `control-server.js:229-236` | covered |
| O-077 | 响应体统一两空格缩进 + 固定响应头 | `control-server.js:275-281` | covered |
| O-078 | metadata 双写（json + pid）且 url 带尾斜杠 | `control-server.js:96-104` | covered |

## 附录 C：更新后的统计

| 项 | 阶段 2 初版 | 关闭 U 之后 |
|---|---|---|
| 义务总数 | 73 | **78** |
| covered | 72 | 78 |
| open | 1 | 0（O-072 由附录 A 佐证，启动器侧无轮转） |
| unknown | 6 | **2**（U-05 更新流程、U-06 原生层，均在 SCOPE 之外） |

> 剩余 2 条 unknown 均**不在复刻范围内**（自动更新流程、原生窗口层），对本复刻无阻塞。
