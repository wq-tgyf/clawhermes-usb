import assert from "node:assert/strict";
import { test } from "node:test";
import { startAllServices, stopAllServices, waitForServicesStopped } from "../src/services.ts";
import { startFakeServer } from "./helpers/fakeServer.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

function makeDeps(url: string, root: string, overrides: Record<string, unknown> = {}) {
  const logs: string[] = [];
  const cliCalls: string[] = [];
  const deps = {
    root,
    log: (m: string) => logs.push(m),
    getBaseUrl: async () => url,
    spawnSync: ((_c: string, args: string[]) => {
      cliCalls.push(args[1]);
      return { status: 0, stdout: '{"cli":true}', stderr: "", signal: null, error: undefined };
    }) as never,
    ...overrides,
  };
  return { deps, logs, cliCalls };
}

test("O017 start 走 API 且不触发 CLI", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: { started: true } }));
  try {
    const { deps, cliCalls } = makeDeps(s.url, tmp.path);
    const result = await startAllServices(deps);
    assert.deepEqual(result, { started: true });
    assert.equal(cliCalls.length, 0);
    assert.equal(s.requests[0].url, "/api/services/start");
    assert.equal(s.requests[0].method, "POST");
    assert.equal(s.requests[0].body, "{}");
  } finally {
    await s.close();
    tmp.dispose();
  }
});

test("O018 start 失败时走 CLI 且 action=start", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 500, json: { error: { message: "nope" } } }));
  try {
    const { deps, cliCalls, logs } = makeDeps(s.url, tmp.path);
    const result = await startAllServices(deps);
    assert.deepEqual(result, { cli: true });
    assert.deepEqual(cliCalls, ["start"]);
    assert.ok(logs.some((l) => l.startsWith("Control API start failed; falling back to CLI start.")));
  } finally {
    await s.close();
    tmp.dispose();
  }
});

test("O019 stop 无论 API 成败都执行一次 CLI stop", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: { api: true } }));
  try {
    const { deps, cliCalls } = makeDeps(s.url, tmp.path);
    const result = await stopAllServices({}, deps);
    assert.deepEqual(result, { api: true });
    assert.deepEqual(cliCalls, ["stop"], "API 成功时 CLI 仍必须执行一次");
  } finally {
    await s.close();
    tmp.dispose();
  }
});

test("O019 API 失败时返回 CLI 结果", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 500, json: { error: { message: "down" } } }));
  try {
    const { deps, logs } = makeDeps(s.url, tmp.path);
    const result = await stopAllServices({}, deps);
    assert.deepEqual(result, { cli: true });
    assert.ok(logs.some((l) => l.startsWith("Control API stop failed; falling back to CLI stop.")));
  } finally {
    await s.close();
    tmp.dispose();
  }
});

test("O021 服务全部 stopped 时立即返回 true", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({
    status: 200,
    json: { services: [{ status: "stopped" }, { status: "stopped" }] },
  }));
  try {
    const { deps } = makeDeps(s.url, tmp.path);
    const started = Date.now();
    const ok = await waitForServicesStopped(undefined, deps);
    assert.equal(ok, true);
    assert.ok(Date.now() - started < 1000);
    assert.equal(s.requests.length, 1, "只轮询一次，不应重发 stop");
  } finally {
    await s.close();
    tmp.dispose();
  }
});

test("O022 存在 running 时重发 stop 并轮询", async () => {
  const tmp = makeTmpDir();
  let polls = 0;
  const s = await startFakeServer((req) => {
    if (req.url === "/api/status") {
      polls += 1;
      return { status: 200, json: { services: [{ status: polls >= 2 ? "stopped" : "running" }] } };
    }
    return { status: 200, json: { ok: true } };
  });
  try {
    const { deps } = makeDeps(s.url, tmp.path);
    const ok = await waitForServicesStopped(3000, deps);
    assert.equal(ok, true);
    const stopPosts = s.requests.filter((r) => r.url === "/api/services/stop");
    assert.ok(stopPosts.length >= 1, "running 时必须重发 stop");
  } finally {
    await s.close();
    tmp.dispose();
  }
});

test("O023 超时返回 false 且不抛错", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({
    status: 200,
    json: { services: [{ status: "running" }] },
  }));
  try {
    const { deps } = makeDeps(s.url, tmp.path);
    const ok = await waitForServicesStopped(400, deps);
    assert.equal(ok, false);
  } finally {
    await s.close();
    tmp.dispose();
  }
});

test("O074 services 字段缺失时按空数组处理", async () => {
  const tmp = makeTmpDir();
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    const { deps } = makeDeps(s.url, tmp.path);
    const ok = await waitForServicesStopped(1000, deps);
    assert.equal(ok, true);
  } finally {
    await s.close();
    tmp.dispose();
  }
});
