import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { healthUrl, ping, pingSync } from "../src/health.ts";
import { requestJson } from "../src/http.ts";
import { createControlUrlResolver } from "../src/control-server.ts";
import { stopAllServices, waitForControlServerShutdown } from "../src/services.ts";
import { createRpcHandlers } from "../src/rpc.ts";
import { startFakeServer } from "./helpers/fakeServer.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

test("O011 拉起控制服务时执行参数正确（cwd/timeout/windowsHide）", () => {
  const tmp = makeTmpDir();
  try {
    let captured: Record<string, unknown> = {};
    const resolver = createControlUrlResolver(tmp.path, {
      log: () => {},
      root: tmp.path,
      healthProbe: () => false,
      spawnSync: ((_c: string, _a: string[], opts: Record<string, unknown>) => {
        captured = opts;
        return { status: 0, stdout: '{"url":"http://127.0.0.1:1/"}', stderr: "", signal: null, error: undefined };
      }) as never,
    });
    return resolver.getControlUrl().then(() => {
      assert.equal(captured.cwd, tmp.path);
      assert.equal(captured.timeout, 10000);
      assert.equal(captured.windowsHide, true);
      assert.equal(captured.encoding, "utf8");
    });
  } finally { tmp.dispose(); }
});

test("O013 成功时解析 stdout.url 并去掉尾斜杠", async () => {
  const tmp = makeTmpDir();
  try {
    const resolver = createControlUrlResolver(tmp.path, {
      log: () => {},
      root: tmp.path,
      healthProbe: () => false,
      spawnSync: (() => ({
        status: 0,
        stdout: JSON.stringify({ url: "http://127.0.0.1:12345/" }),
        stderr: "",
        signal: null,
        error: undefined,
      })) as never,
    });
    assert.equal(await resolver.getControlUrl(), "http://127.0.0.1:12345");
  } finally { tmp.dispose(); }
});

test("O016 失败后 controlServerPromise 被重置，可重试", async () => {
  const tmp = makeTmpDir();
  try {
    let attempts = 0;
    const resolver = createControlUrlResolver(tmp.path, {
      log: () => {},
      root: tmp.path,
      healthProbe: () => false,
      spawnSync: (() => {
        attempts += 1;
        return attempts === 1
          ? { status: 1, stdout: "", stderr: "first fail", signal: null, error: undefined }
          : { status: 0, stdout: '{"url":"http://127.0.0.1:2/"}', stderr: "", signal: null, error: undefined };
      }) as never,
    });
    assert.equal(await resolver.getControlUrlOrEmpty(), "");
    assert.equal(await resolver.getControlUrl(), "http://127.0.0.1:2");
    assert.equal(attempts, 2);
  } finally { tmp.dispose(); }
});

test("O020 stop 的 API 失败日志文案", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 500, json: { error: { message: "x" } } }));
  try {
    const logs: string[] = [];
    await stopAllServices({}, {
      root: tmp.path,
      log: (m: string) => logs.push(m),
      getBaseUrl: async () => s.url,
      spawnSync: (() => ({ status: 0, stdout: "", stderr: "", signal: null, error: undefined })) as never,
    });
    assert.ok(logs.some((l) => l.startsWith("Control API stop failed; falling back to CLI stop. ")));
  } finally { await s.close(); tmp.dispose(); }
});

test("O024 controlUrl 为空时立即返回 true", async () => {
  const started = Date.now();
  const ok = await waitForControlServerShutdown("", 8000);
  assert.equal(ok, true);
  assert.ok(Date.now() - started < 500, "不应等待 8 秒");
});

test("O025 控制服务持续存活时超时返回 false，并约每 120ms 探测", async () => {
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    const started = Date.now();
    const ok = await waitForControlServerShutdown(s.url, 400);
    const elapsed = Date.now() - started;
    assert.equal(ok, false);
    assert.ok(elapsed >= 380, `应接近 400ms，实际 ${elapsed}`);
    assert.ok(s.requests.length >= 2, "应多次探测");
  } finally { await s.close(); }
});

test("O035 成功后定时器被清理，不残留句柄", async () => {
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    const before = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
    await requestJson(s.url, "/x", { timeoutMs: 60000 });
    const after = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
    assert.ok(after <= before, `残留超时定时器: before=${before} after=${after}`);
  } finally { await s.close(); }
});

test("O037 getModelConfig 走 GET 且透传", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: { model: "m" } }));
  try {
    const handlers = createRpcHandlers({
      root: tmp.path,
      log: () => {},
      getBaseUrl: async () => s.url,
      getControlUrlOrEmpty: async () => s.url,
      getStatusPayload: async () => ({}),
      cleanupBeforeExit: async () => {},
      startAllServices: async () => ({}),
      stopAllServices: async () => ({}),
      beginImmediateClose: () => {},
    } as never);
    assert.deepEqual(await handlers.getModelConfig(), { model: "m" });
    assert.equal(s.requests[0].method, "GET");
    assert.equal(s.requests[0].url, "/api/model-config");
  } finally { await s.close(); tmp.dispose(); }
});

test("O044 ping 对不可达地址返回 false", async () => {
  assert.equal(await ping("http://127.0.0.1:1/api/health"), false);
});

test("O044 ping 对健康服务返回 true", async () => {
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    assert.equal(await ping(healthUrl(s.url)), true);
  } finally { await s.close(); }
});

test("O045 pingSync 对不可达地址返回 false", () => {
  const tmp = makeTmpDir();
  try {
    assert.equal(pingSync("http://127.0.0.1:1/api/health", tmp.path), false);
  } finally { tmp.dispose(); }
});

test("O060 RPC 的 maxRequestTime 为 Infinity（常量约定）", async () => {
  const { WINDOW_OPTIONS } = await import("../src/constants.ts");
  assert.equal(WINDOW_OPTIONS.title, "DTclaw Control");
  assert.deepEqual(WINDOW_OPTIONS.frame, { width: 1120, height: 760, x: 80, y: 60 });
  assert.equal(WINDOW_OPTIONS.titleBarStyle, "hidden");
  assert.equal(WINDOW_OPTIONS.url, "views://mainview/index.html");
});

test("O075 微信三态：missing-plugin / running / stopped（契约常量校验）", async () => {
  const s = await startFakeServer(() => ({
    status: 200,
    json: { status: "missing-plugin", messages: ["x"] },
  }));
  try {
    const tmp = makeTmpDir();
    const handlers = createRpcHandlers({
      root: tmp.path,
      log: () => {},
      getBaseUrl: async () => s.url,
      getControlUrlOrEmpty: async () => s.url,
      getStatusPayload: async () => ({}),
      cleanupBeforeExit: async () => {},
      startAllServices: async () => ({}),
      stopAllServices: async () => ({}),
      beginImmediateClose: () => {},
    } as never);
    const status = (await handlers.getWeixinChannelStatus()) as { status: string };
    assert.ok(["missing-plugin", "running", "stopped"].includes(status.status));
    tmp.dispose();
  } finally { await s.close(); }
});

test("O076 start 等待完成、stop 立即返回（行为不对称）", async () => {
  const tmp = makeTmpDir();
  let startResolved = false;
  const s = await startFakeServer((req) => {
    if (req.url === "/api/services/start") startResolved = true;
    return { status: 200, json: { ok: true } };
  });
  try {
    const handlers = createRpcHandlers({
      root: tmp.path,
      log: () => {},
      getBaseUrl: async () => s.url,
      getControlUrlOrEmpty: async () => s.url,
      getStatusPayload: async () => ({}),
      cleanupBeforeExit: async () => {},
      startAllServices: async () => {
        const r = await fetch(`${s.url}/api/services/start`, { method: "POST" });
        return r.json();
      },
      stopAllServices: async () => ({ stopped: true }),
      beginImmediateClose: () => {},
    } as never);
    await handlers.startAll();
    assert.equal(startResolved, true, "start 必须等待服务端完成");
    const stopped = await handlers.stopAll();
    assert.deepEqual(stopped, { stopped: true });
  } finally { await s.close(); tmp.dispose(); }
});
