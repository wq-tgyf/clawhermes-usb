import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  cleanupBeforeExit,
  createCloseController,
  getStatusPayload,
  readStatusSnapshot,
} from "../src/app.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

test("O042 状态快照缺失时返回空服务数组", () => {
  const tmp = makeTmpDir();
  try {
    assert.deepEqual(readStatusSnapshot(tmp.path), { services: [] });
    mkdirSync(join(tmp.path, "data", "tmp"), { recursive: true });
    writeFileSync(join(tmp.path, "data", "tmp", "status.json"), "{bad");
    assert.deepEqual(readStatusSnapshot(tmp.path), { services: [] });
    writeFileSync(join(tmp.path, "data", "tmp", "status.json"), '{"services":[{"status":"running"}]}');
    assert.deepEqual(readStatusSnapshot(tmp.path), { services: [{ status: "running" }] });
  } finally { tmp.dispose(); }
});

test("O043 状态请求失败时回落快照并写日志", async () => {
  const tmp = makeTmpDir();
  try {
    const logs: string[] = [];
    const result = await getStatusPayload({
      root: tmp.path,
      getBaseUrl: async () => "http://127.0.0.1:1",
      log: (m) => logs.push(m),
    });
    assert.deepEqual(result, { services: [] });
    assert.ok(logs.some((l) => l.startsWith("Control API status failed; falling back to status snapshot.")));
  } finally { tmp.dispose(); }
});

test("O058 清理顺序严格四步", async () => {
  const tmp = makeTmpDir();
  try {
    const order: string[] = [];
    await cleanupBeforeExit({
      getBaseUrl: async () => "http://x",
      requestJsonWithTimeout: (async (_b: string, path: string) => {
        order.push(`req:${path}`);
        return {};
      }) as never,
      stopAllServices: async (opts: { waitForStopped?: boolean }) => {
        order.push(`stopAll:${opts.waitForStopped}`);
        return {};
      },
      waitForControlServerShutdown: async () => {
        order.push("waitShutdown");
        return true;
      },
    });
    assert.deepEqual(order, [
      "req:/api/channels/weixin/stop",
      "stopAll:true",
      "req:/api/shutdown",
      "waitShutdown",
    ]);
  } finally { tmp.dispose(); }
});

test("O057 微信停止失败不阻断后续步骤", async () => {
  const tmp = makeTmpDir();
  try {
    const order: string[] = [];
    await cleanupBeforeExit({
      getBaseUrl: async () => "http://x",
      requestJsonWithTimeout: (async (_b: string, path: string) => {
        order.push(`req:${path}`);
        if (path === "/api/channels/weixin/stop") throw new Error("weixin down");
        return {};
      }) as never,
      stopAllServices: async () => { order.push("stopAll"); return {}; },
      waitForControlServerShutdown: async () => { order.push("waitShutdown"); return true; },
    });
    assert.deepEqual(order, ["req:/api/channels/weixin/stop", "stopAll", "req:/api/shutdown", "waitShutdown"]);
  } finally { tmp.dispose(); }
});

test("O058 /api/shutdown 失败同样被吞掉", async () => {
  const tmp = makeTmpDir();
  try {
    const order: string[] = [];
    await cleanupBeforeExit({
      getBaseUrl: async () => "http://x",
      requestJsonWithTimeout: (async (_b: string, path: string) => {
        order.push(path);
        if (path === "/api/shutdown") throw new Error("no");
        return {};
      }) as never,
      stopAllServices: async () => { order.push("stopAll"); return {}; },
      waitForControlServerShutdown: async () => { order.push("waitShutdown"); return true; },
    });
    assert.equal(order.at(-1), "waitShutdown");
  } finally { tmp.dispose(); }
});

test("O063 关闭幂等：cleanup 只执行一次", async () => {
  let cleanups = 0;
  let quits = 0;
  const ctl = createCloseController({
    cleanup: async () => { cleanups += 1; },
    quit: () => { quits += 1; },
  });
  ctl.beginImmediateClose();
  ctl.beginImmediateClose();
  ctl.beginImmediateClose();
  assert.equal(ctl.isClosing(), true);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(cleanups, 1);
  assert.equal(quits, 1);
});

test("O062 窗口 close 事件在非 UI 关闭时触发清理", async () => {
  let cleanups = 0;
  const ctl = createCloseController({ cleanup: async () => { cleanups += 1; }, quit: () => {} });
  ctl.onWindowClose();
  await new Promise((r) => setTimeout(r, 20));
  ctl.onWindowClose();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(cleanups, 1);
});

test("O063 清理异常只记录不抛出，quit 仍执行", async () => {
  const errors: string[] = [];
  let quits = 0;
  const ctl = createCloseController({
    cleanup: async () => { throw new Error("boom"); },
    quit: () => { quits += 1; },
    log: (m) => errors.push(m),
  });
  ctl.beginImmediateClose();
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(errors, ["cleanup before exit failed"]);
  assert.equal(quits, 1);
});
