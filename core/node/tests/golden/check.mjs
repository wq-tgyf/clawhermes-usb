#!/usr/bin/env node
/**
 * Golden 基线校验器
 *
 * 重新执行所有命令，与 snapshots/ 下的基线比对（退出码 + stdout + stderr）。
 * 用法：node tests/golden/check.mjs
 * 退出码：0 全部一致 / 1 存在差异或缺失
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CASES, ROOT, normalize } from "./cases.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const snapDir = join(here, "snapshots");

function diff(a, b, path = "") {
  const out = [];
  const ta = a === null ? "null" : Array.isArray(a) ? "array" : typeof a;
  const tb = b === null ? "null" : Array.isArray(b) ? "array" : typeof b;
  if (ta !== tb) { out.push(path + ": 类型 " + ta + " -> " + tb); return out; }
  if (ta === "array") {
    if (a.length !== b.length) out.push(path + ": 长度 " + a.length + " -> " + b.length);
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) out.push(...diff(a[i], b[i], path + "[" + i + "]"));
    return out;
  }
  if (ta === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) { out.push(path + "." + k + ": 新增"); continue; }
      if (!(k in b)) { out.push(path + "." + k + ": 消失"); continue; }
      out.push(...diff(a[k], b[k], path + "." + k));
    }
    return out;
  }
  if (a !== b) out.push(path + ": " + JSON.stringify(a).slice(0, 120) + " -> " + JSON.stringify(b).slice(0, 120));
  return out;
}

function normalizeString(s, root) {
  if (!s) return "";
  return s
    .split(root).join("<ROOT>")
    .split(root.replace(/\\/g, "/")).join("<ROOT>")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "<TIMESTAMP>")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/g, "<TIMESTAMP>")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<DATE>");
}

let same = 0;
let different = 0;
let missing = 0;

for (const c of CASES) {
  const snapFile = join(snapDir, c.name + ".json");
  if (!existsSync(snapFile)) { missing += 1; console.log("  MISSING  " + c.name); continue; }

  const baseline = JSON.parse(readFileSync(snapFile, "utf8"));
  const r = spawnSync(process.execPath, [join(ROOT, "core", "node", "dist", "clawhermes.js"), ...c.args], {
    cwd: ROOT, encoding: "utf8", timeout: c.timeoutMs ?? 30000, windowsHide: true,
  });

  const exitCode = r.status ?? -1;
  const stdoutRaw = (r.stdout ?? "").trim();
  const stderrRaw = (r.stderr ?? "").trim();

  let parsedStdout;
  try {
    parsedStdout = { kind: "json", value: normalize(JSON.parse(stdoutRaw), ROOT) };
  } catch {
    parsedStdout = { kind: "text", value: normalizeString(stdoutRaw, ROOT) };
  }

  const actual = { command: baseline.command, exitCode, stdout: parsedStdout, stderr: normalizeString(stderrRaw, ROOT) };
  const d = diff(baseline, actual);

  if (d.length === 0) { same += 1; console.log("  OK       " + c.name); }
  else {
    different += 1;
    console.log("  DIFF     " + c.name + "  (" + d.length + " 处)");
    for (const line of d.slice(0, 6)) console.log("             " + line);
  }
}

console.log("\n结果: " + same + " 一致, " + different + " 有差异, " + missing + " 缺基线");
process.exitCode = different === 0 && missing === 0 ? 0 : 1;
