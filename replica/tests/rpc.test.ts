import assert from "node:assert/strict";
import { test } from "node:test";
import { createRpcHandlers, normalizeModelConfigBody } from "../src/rpc.ts";
import { startFakeServer } from "./helpers/fakeServer.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

function makeHandlers(url: string, root: string, extra: Record<string, unknown> = {}) {
  const openCalls: string[] = [];
  let minimized = 0;
  let maximized = 0;
  let unmaximized = 0;
  let maximizedState = false;
  let closeCalls = 0;
  const deps = {
    root,
    log: () => {},
    getBaseUrl: async () => url,
    getControlUrlOrEmpty: async () => url,
    getStatusPayload: async () => ({ services: [] }),
    openExternal: (u: string) => openCalls.push(u),
    cleanupBeforeExit: async () => { closeCalls += 1; },
    startAllServices: async () => ({ started: true }),
    stopAllServices: async () => ({ stopped: true }),
    beginImmediateClose: () => { closeCalls += 1; },
    window: {
      minimize: () => { minimized += 1; },
      maximize: () => { maximized += 1; maximizedState = true; },
      unmaximize: () => { unmaximized += 1; maximizedState = false; },
      isMaximized: () => maximizedState,
    },
    ...extra,
  };
  return {
    handlers: createRpcHandlers(deps as never),
    state: () => ({ openCalls, minimized, maximized, unmaximized, closeCalls }),
  };
}

test("O061 getBootstrap 返回 root 与控制 URL", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    const { handlers } = makeHandlers(s.url, tmp.path);
    assert.deepEqual(await handlers.getBootstrap(), { root: tmp.path, controlUrl: s.url });
  } finally { await s.close(); tmp.dispose(); }
});

test("O061 控制服务不可达时 controlUrl 为空字符串", async () => {
  const tmp = makeTmpDir();
  try {
    const { handlers } = makeHandlers("http://127.0.0.1:1", tmp.path, {
      getControlUrlOrEmpty: async () => "",
    });
    assert.deepEqual(await handlers.getBootstrap(), { root: tmp.path, controlUrl: "" });
  } finally { tmp.dispose(); }
});

test("O049 getLogs 查询串逐字符正确", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: { lines: [] } }));
  try {
    const { handlers } = makeHandlers(s.url, tmp.path);
    await handlers.getLogs();
    assert.equal(s.requests[0].url, "/api/logs?service=launcher&lines=140");
  } finally { await s.close(); tmp.dispose(); }
});

test("O054 微信日志 lines=160", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    const { handlers } = makeHandlers(s.url, tmp.path);
    await handlers.getWeixinChannelLogs();
    assert.equal(s.requests[0].url, "/api/channels/weixin/logs?lines=160");
  } finally { await s.close(); tmp.dispose(); }
});

test("O038 saveModelConfig 归一字段且忽略入参 providerType", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: { ok: true } }));
  try {
    const { handlers } = makeHandlers(s.url, tmp.path);
    await handlers.saveModelConfig({
      providerType: "evil",
      apply: "none",
      apiUrl: "https://x",
      model: "m1",
      apiKey: "k1",
      extra: "dropped",
    } as never);
    const body = JSON.parse(s.requests[0].body);
    assert.deepEqual(body, {
      providerType: "openai-compatible",
      apiUrl: "https://x",
      model: "m1",
      apiKey: "k1",
      apply: "both",
    });
    assert.equal(s.requests[0].method, "POST");
    assert.equal(s.requests[0].url, "/api/model-config");
  } finally { await s.close(); tmp.dispose(); }
});

test("O038 normalizeModelConfigBody 是纯函数", () => {
  assert.deepEqual(normalizeModelConfigBody({}), {
    providerType: "openai-compatible",
    apiUrl: undefined,
    model: undefined,
    apiKey: undefined,
    apply: "both",
  });
});

test("O040 / O055 / O056 POST 空对象", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    const { handlers } = makeHandlers(s.url, tmp.path);
    await handlers.bindDevice();
    await handlers.startWeixinChannelLogin();
    await handlers.stopWeixinChannelLogin();
    assert.deepEqual(s.requests.map((r) => [r.method, r.url, r.body]), [
      ["POST", "/api/device-binding/bind", "{}"],
      ["POST", "/api/channels/weixin/login", "{}"],
      ["POST", "/api/channels/weixin/stop", "{}"],
    ]);
  } finally { await s.close(); tmp.dispose(); }
});

test("O039 / O041 / O053 GET 透传", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: { passthrough: true } }));
  try {
    const { handlers } = makeHandlers(s.url, tmp.path);
    assert.deepEqual(await handlers.getDeviceBinding(), { passthrough: true });
    assert.deepEqual(await handlers.getSkills(), { passthrough: true });
    assert.deepEqual(await handlers.getWeixinChannelStatus(), { passthrough: true });
    assert.deepEqual(s.requests.map((r) => r.url), [
      "/api/device-binding",
      "/api/skills",
      "/api/channels/weixin",
    ]);
  } finally { await s.close(); tmp.dispose(); }
});

test("O068 openUrl 无条件返回 opened 且仅在 url 存在时打开", async () => {
  const tmp = makeTmpDir();
  try {
    const { handlers, state } = makeHandlers("http://127.0.0.1:1", tmp.path);
    assert.deepEqual(handlers.openUrl({}), { opened: true });
    assert.deepEqual(state().openCalls, []);
    assert.deepEqual(handlers.openUrl({ url: "https://a" }), { opened: true });
    assert.deepEqual(state().openCalls, ["https://a"]);
  } finally { tmp.dispose(); }
});

test("O066 最小化返回 minimized:true", () => {
  const tmp = makeTmpDir();
  try {
    const { handlers, state } = makeHandlers("http://127.0.0.1:1", tmp.path);
    assert.deepEqual(handlers.minimizeWindow(), { minimized: true });
    assert.equal(state().minimized, 1);
  } finally { tmp.dispose(); }
});

test("O067 最大化在 true/false 间交替", () => {
  const tmp = makeTmpDir();
  try {
    const { handlers } = makeHandlers("http://127.0.0.1:1", tmp.path);
    assert.deepEqual(handlers.maximizeWindow(), { maximized: true });
    assert.deepEqual(handlers.maximizeWindow(), { maximized: false });
    assert.deepEqual(handlers.maximizeWindow(), { maximized: true });
  } finally { tmp.dispose(); }
});

test("O064 closeWindow 返回固定字面值并触发关闭", async () => {
  const tmp = makeTmpDir();
  try {
    const { handlers, state } = makeHandlers("http://127.0.0.1:1", tmp.path);
    assert.deepEqual(await handlers.closeWindow(), { closed: true, cleanup: "foreground" });
    assert.equal(state().closeCalls, 1);
  } finally { tmp.dispose(); }
});

test("O065 shutdown 先清理再返回 stopping", async () => {
  const tmp = makeTmpDir();
  try {
    let cleaned = false;
    const { handlers } = makeHandlers("http://127.0.0.1:1", tmp.path, {
      cleanupBeforeExit: async () => { cleaned = true; },
    });
    const result = await handlers.shutdown();
    assert.deepEqual(result, { status: "stopping" });
    assert.equal(cleaned, true);
  } finally { tmp.dispose(); }
});

test("O017 / O019 startAll 与 stopAll 委托到服务层", async () => {
  const tmp = makeTmpDir();
  try {
    const { handlers } = makeHandlers("http://127.0.0.1:1", tmp.path);
    assert.deepEqual(await handlers.startAll(), { started: true });
    assert.deepEqual(await handlers.stopAll(), { stopped: true });
  } finally { tmp.dispose(); }
});
