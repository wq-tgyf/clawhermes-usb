#!/usr/bin/env node
/**
 * Golden 基线记录器
 *
 * 用途：把每条 CLI 命令当前的**完整执行契约**（退出码 + stdout + stderr）保存为基线。
 * 用法：node tests/golden/record.mjs
 *
 * 设计说明：
 * - 记录退出码，不只记录成功输出 —— 错误路径同样是契约
 * - 输出里的绝对路径、时间戳会做归一化
 * - 只收录只读命令，不改变系统状态
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CASES, EXPECTS_FAILURE, ROOT, normalize } from "./cases.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const snapDir = join(here, "snapshots");
mkdirSync(snapDir, { recursive: true });

let ok = 0;
let unexpected = 0;

for (const c of CASES) {
  const r = spawnSync(process.execPath, [join(ROOT, "core", "node", "dist", "clawhermes.js"), ...c.args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: c.timeoutMs ?? 30000,
    windowsHide: true,
  });

  const exitCode = r.status ?? -1;
  const stdout = (r.stdout ?? "").trim();
  const stderr = (r.stderr ?? "").trim();

  // 哪些命令"应该"失败
  const shouldFail = EXPECTS_FAILURE.has(c.name);
  const failed = exitCode !== 0;
  if (shouldFail !== failed) {
    unexpected += 1;
    console.log("  UNEXPECTED " + c.name + "  exit=" + exitCode + "  期望失败=" + shouldFail);
  }

  // stdout 尽量解析为 JSON，解析不了就保留原文
  let normalizedStdout;
  try {
    normalizedStdout = { kind: "json", value: normalize(JSON.parse(stdout), ROOT) };
  } catch {
    normalizedStdout = { kind: "text", value: normalizeString(stdout, ROOT) };
  }

  const snapshot = {
    command: ["clawhermes.js", ...c.args],
    exitCode,
    stdout: normalizedStdout,
    stderr: normalizeString(stderr, ROOT),
  };

  writeFileSync(join(snapDir, c.name + ".json"), JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  ok += 1;
  console.log("  recorded " + c.name + "  (exit " + exitCode + ")");
}

console.log("\n记录完成: " + ok + " 条, " + unexpected + " 条退出码与预期不符");

function normalizeString(s, root) {
  if (!s) return "";
  return s
    .split(root).join("<ROOT>")
    .split(root.replace(/\\/g, "/")).join("<ROOT>")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "<TIMESTAMP>")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/g, "<TIMESTAMP>")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<DATE>");
}

process.exitCode = unexpected === 0 ? 0 : 1;
