import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { lifecycleCommand, runClawHermesLifecycle } from "../src/lifecycle.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

function deps(root: string, completed: Record<string, unknown>, logs: string[] = []) {
  return {
    root,
    log: (m: string) => logs.push(m),
    spawnSync: (() => ({ signal: null, error: undefined, ...completed })) as never,
  };
}

test("O026 命令参数序列正确", () => {
  // 用平台原生路径构造，避免 Linux CI 上 join() 行为不同导致误判
  const root = process.platform === "win32" ? "F:\\usb" : "/usb";
  assert.deepEqual(lifecycleCommand(root, "stop").slice(1), [
    join(root, "core", "node", "dist", "clawhermes.js"),
    "stop",
    "--usb-root",
    root,
    "--json",
  ]);
});

test("O027 start 与 stop 的超时不同", () => {
  const tmp = makeTmpDir();
  try {
    const seen: number[] = [];
    const d = {
      root: tmp.path,
      log: () => {},
      spawnSync: ((_c: string, _a: string[], opts: { timeout: number }) => {
        seen.push(opts.timeout);
        return { status: 0, stdout: "{}", stderr: "", signal: null, error: undefined };
      }) as never,
    };
    runClawHermesLifecycle("start", { throwOnFailure: true }, d);
    runClawHermesLifecycle("stop", { throwOnFailure: true }, d);
    assert.deepEqual(seen, [20000, 10000]);
  } finally {
    tmp.dispose();
  }
});

test("O028 throwOnFailure=false 时不抛错", () => {
  const tmp = makeTmpDir();
  try {
    const result = runClawHermesLifecycle(
      "stop",
      { throwOnFailure: false },
      deps(tmp.path, { status: 1, stdout: "", stderr: "bad" }),
    );
    assert.deepEqual(result, { root: tmp.path, action: "stop", status: 1 });
  } finally {
    tmp.dispose();
  }
});

test("O028 throwOnFailure=true 时以 stderr 作 message", () => {
  const tmp = makeTmpDir();
  try {
    assert.throws(
      () => runClawHermesLifecycle("start", { throwOnFailure: true }, deps(tmp.path, { status: 1, stdout: "", stderr: "failed hard" })),
      (e: Error) => e.message === "failed hard",
    );
  } finally {
    tmp.dispose();
  }
});

test("O029 返回值三级降级", () => {
  const tmp = makeTmpDir();
  try {
    const parsed = runClawHermesLifecycle("start", { throwOnFailure: false }, deps(tmp.path, { status: 0, stdout: '{"a":1}' }));
    assert.deepEqual(parsed, { a: 1 });

    const raw = runClawHermesLifecycle("start", { throwOnFailure: false }, deps(tmp.path, { status: 0, stdout: "not json", stderr: "x" })) as Record<string, unknown>;
    assert.equal(raw.stdout, "not json");
    assert.equal(raw.stderr, "x");

    const bare = runClawHermesLifecycle("start", { throwOnFailure: false }, deps(tmp.path, { status: 0, stdout: "" })) as Record<string, unknown>;
    assert.deepEqual(bare, { root: tmp.path, action: "start", status: 0 });
  } finally {
    tmp.dispose();
  }
});

test("O030 执行前后都写日志", () => {
  const tmp = makeTmpDir();
  const logs: string[] = [];
  runClawHermesLifecycle("stop", { throwOnFailure: false }, deps(tmp.path, { status: 0, stdout: "" }, logs));
  assert.ok(logs.some((l) => l.startsWith("Running CLI lifecycle fallback: ")));
  assert.ok(logs.some((l) => l.startsWith("CLI lifecycle fallback completed. action=stop")));
});

test("O030 stdout 超长时只记末尾 2000 字符", () => {
  const tmp = makeTmpDir();
  const logs: string[] = [];
  const long = "x".repeat(5000);
  runClawHermesLifecycle("stop", { throwOnFailure: false }, deps(tmp.path, { status: 0, stdout: long }, logs));
  const line = logs.find((l) => l.startsWith("CLI lifecycle stdout: "))!;
  assert.equal(line.length, "CLI lifecycle stdout: ".length + 2000);
});
