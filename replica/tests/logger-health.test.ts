import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { healthUrl } from "../src/health.ts";
import { logFilePath, readLog, sleep, writeElectrobunLog } from "../src/logger.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

test("O046 日志目录不存在时自动创建", () => {
  const tmp = makeTmpDir();
  try {
    assert.equal(writeElectrobunLog(tmp.path, "hello"), true);
    assert.ok(existsSync(join(tmp.path, "data", "logs")));
    assert.equal(logFilePath(tmp.path), join(tmp.path, "data", "logs", "electrobun-control.log"));
  } finally { tmp.dispose(); }
});

test("O047 每行含可解析的 ISO 时间戳", () => {
  const tmp = makeTmpDir();
  try {
    writeElectrobunLog(tmp.path, "first");
    writeElectrobunLog(tmp.path, "second");
    const lines = readLog(tmp.path);
    assert.equal(lines.length, 2);
    for (const line of lines) {
      const [ts, ...rest] = line.split(" ");
      assert.ok(!Number.isNaN(Date.parse(ts)), `时间戳不可解析: ${ts}`);
      assert.ok(rest.length > 0);
    }
    assert.ok(lines[0].endsWith("first"));
  } finally { tmp.dispose(); }
});

test("O048 写失败不抛出，只回调 onError", () => {
  const tmp = makeTmpDir();
  try {
    // 用一个文件占住 data 路径，使 mkdir 失败
    writeFileSync(join(tmp.path, "data"), "occupied");
    const errors: string[] = [];
    const ok = writeElectrobunLog(tmp.path, "x", { onError: (m) => errors.push(m) });
    assert.equal(ok, false);
    assert.deepEqual(errors, ["electrobun log write failed"]);
  } finally { tmp.dispose(); }
});

test("O050 sleep 至少等待指定时长", async () => {
  const start = Date.now();
  await sleep(60);
  assert.ok(Date.now() - start >= 55);
});

test("O052 healthUrl 不产生双斜杠", () => {
  assert.equal(healthUrl("http://127.0.0.1:17100/"), "http://127.0.0.1:17100/api/health");
  assert.equal(healthUrl("http://127.0.0.1:17100"), "http://127.0.0.1:17100/api/health");
});
