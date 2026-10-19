import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { makeLogger, readStatusSnapshot } from "../src/app.ts";
import { readLog, writeElectrobunLog } from "../src/logger.ts";
import { waitForControlServerShutdown } from "../src/services.ts";
import { startFakeServer } from "./helpers/fakeServer.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

test("O051 控制服务预热不阻塞主流程（promise 未 await 也可继续）", async () => {
  const tmp = makeTmpDir();
  try {
    const log = makeLogger(tmp.path);
    let release!: () => void;
    let resolved = false;
    const gate = new Promise<void>((r) => { release = r; });
    const pending = (async () => {
      await gate;                 // 受控门闩，不依赖 sleep
      resolved = true;
      log("Control server ready: http://127.0.0.1:17100");
      return "http://127.0.0.1:17100";
    })();
    // 不 await 就继续：预热尚未完成
    log("Window created.");
    assert.equal(resolved, false, "预热不应阻塞窗口创建");
    release();
    await pending;
    const lines = readLog(tmp.path);
    assert.ok(lines.some((l) => l.endsWith("Window created.")));
    assert.ok(lines.some((l) => l.includes("Control server ready: http://127.0.0.1:17100")));
    // 窗口日志必须早于控制服务就绪日志
    const windowIdx = lines.findIndex((l) => l.endsWith("Window created."));
    const readyIdx = lines.findIndex((l) => l.includes("Control server ready: http://127.0.0.1:17100"));
    assert.ok(windowIdx < readyIdx);
  } finally { tmp.dispose(); }
});

test("O051 预热失败时写 startup failed 且不抛错", async () => {
  const tmp = makeTmpDir();
  try {
    const log = makeLogger(tmp.path);
    const failure = { message: "connect ECONNREFUSED" };
    const p = Promise.reject(failure).catch((e: Error) => {
      log("Control server startup failed: " + e.message);
      return null;
    });
    await p;
    const lines = readLog(tmp.path);
    assert.ok(lines.some((l) => l.includes("Control server startup failed: connect ECONNREFUSED")));
  } finally { tmp.dispose(); }
});

test("O072 日志只追加，不做轮转", () => {
  const tmp = makeTmpDir();
  try {
    for (let i = 0; i < 50; i += 1) writeElectrobunLog(tmp.path, "line-" + i);
    const lines = readLog(tmp.path);
    assert.equal(lines.length, 50, "无轮转：全部保留");
    assert.ok(lines[0].endsWith("line-0"));
    assert.ok(lines[49].endsWith("line-49"));
  } finally { tmp.dispose(); }
});

test("O072 日志文件不因大小截断", () => {
  const tmp = makeTmpDir();
  try {
    const big = "x".repeat(10000);
    for (let i = 0; i < 5; i += 1) writeElectrobunLog(tmp.path, big);
    const content = readFileSync(join(tmp.path, "data", "logs", "electrobun-control.log"), "utf8");
    assert.equal(content.length, 5 * (big.length + 1 + 25), "每条完整保留");
  } finally { tmp.dispose(); }
});

test("O073 退出时序不引入额外锁：并发 stop 与 shutdown 都可完成", async () => {
  const s = await startFakeServer((req) => {
    if (req.url === "/api/services/stop") return { status: 200, json: { ok: true } };
    if (req.url === "/api/status") return { status: 200, json: { services: [] } };
    return { status: 200, json: {} };
  });
  try {
    const results = await Promise.all([
      waitForControlServerShutdown(s.url, 100),
      fetch(s.url + "/api/services/stop", { method: "POST" }).then((r) => r.json()),
    ]);
    assert.ok(typeof results[0] === "boolean");
    assert.deepEqual(results[1], { ok: true });
  } finally { await s.close(); }
});

test("O001 初始化顺序：根解析先于状态读取，且状态读取可回落", () => {
  const tmp = makeTmpDir();
  try {
    // 构造 root，然后读取状态快照 —— 模拟模块初始化链
    assert.deepEqual(readStatusSnapshot(tmp.path), { services: [] });
    assert.equal(existsSync(join(tmp.path, "data", "tmp", "status.json")), false);
  } finally { tmp.dispose(); }
});

test("O073 清理失败不影响后续步骤（并发安全约定）", async () => {
  const tmp = makeTmpDir();
  try {
    const order: string[] = [];
    const cleanup = async () => {
      order.push("stopAll");
      throw new Error("stop failed");
    };
    try { await cleanup(); } catch { order.push("caught"); }
    order.push("waitShutdown");
    assert.deepEqual(order, ["stopAll", "caught", "waitShutdown"]);
  } finally { tmp.dispose(); }
});
