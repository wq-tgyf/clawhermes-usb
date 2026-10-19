import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = join(here, "..", "..");
const REPO_ROOT = join(CORE_ROOT, "..", "..");
const CLI = join(CORE_ROOT, "dist", "clawhermes.js");

function run(args, timeoutMs = 30000) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });
}

test("CLI 入口文件存在", () => {
  assert.ok(existsSync(CLI), "dist/clawhermes.js 应存在");
});

test("无参调用输出 setup 诊断并成功退出", () => {
  const r = run([]);
  assert.equal(r.status, 0);
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  assert.match(out, /ClawHermes-USB setup diagnostics/);
});

test("status --json 返回合法 JSON 且含 services 数组", () => {
  const r = run(["status", "--json"]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.equal(typeof parsed.root, "string");
  assert.ok(Array.isArray(parsed.services), "services 应为数组");
  for (const s of parsed.services) {
    assert.equal(typeof s.id, "string");
    assert.ok(["running", "stopped"].includes(s.status) || typeof s.status === "string");
  }
});

test("adapters --json 列出三个上游适配器", () => {
  const r = run(["adapters", "--json"]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  const text = JSON.stringify(parsed);
  for (const id of ["openclaw", "hermes-agent", "hermes-web-ui"]) {
    assert.ok(text.includes(id), "应包含适配器 " + id);
  }
});

test("payloads --json 返回合法 JSON", () => {
  const r = run(["payloads", "--json"]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.equal(typeof parsed, "object");
});

test("未知子命令以非零退出码结束并给出提示", () => {
  const r = run(["definitely-not-a-command", "--json"]);
  assert.notEqual(r.status, 0, "未知命令应失败");
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  assert.match(out, /Unknown action/i);
});

test("restore-plan 对不存在的归档给出明确错误", () => {
  const r = run(["restore-plan", "--archive", "data/backups/__does_not_exist__.zip", "--json"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr ?? "", /Backup archive not found/);
});

test("所有 --json 命令的输出都可以被 JSON.parse", () => {
  const okCommands = [
    ["status", "--json"],
    ["adapters", "--json"],
    ["payloads", "--json"],
    ["runtimes", "--json"],
    ["model-config-status", "--json"],
    ["device-binding", "--json"],
  ];
  for (const args of okCommands) {
    const r = run(args);
    assert.equal(r.status, 0, args.join(" ") + " 应成功");
    assert.doesNotThrow(() => JSON.parse(r.stdout), args.join(" ") + " 输出应为合法 JSON");
  }
});
