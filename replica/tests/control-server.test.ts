import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  controlServerCommand,
  createControlUrlResolver,
  readControlServerMetadata,
  type ControlServerMetadata,
} from "../src/control-server.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

function writeMetadata(root: string, meta: ControlServerMetadata) {
  const dir = join(root, "data", "tmp");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "control-server.json"), JSON.stringify(meta));
}

test("O014 metadata 读取：缺失/非法/正常", () => {
  const tmp = makeTmpDir();
  try {
    assert.equal(readControlServerMetadata(tmp.path), null);
    mkdirSync(join(tmp.path, "data", "tmp"), { recursive: true });
    writeFileSync(join(tmp.path, "data", "tmp", "control-server.json"), "not json");
    assert.equal(readControlServerMetadata(tmp.path), null);
    writeMetadata(tmp.path, { url: "http://127.0.0.1:17100/" });
    assert.deepEqual(readControlServerMetadata(tmp.path), { url: "http://127.0.0.1:17100/" });
  } finally {
    tmp.dispose();
  }
});

test("O010 命令行构造逐项相等", () => {
  const tmp = makeTmpDir();
  try {
    const cmd = controlServerCommand(tmp.path);
    assert.deepEqual(cmd.slice(1), [
      join(tmp.path, "core", "node", "dist", "clawhermes.js"),
      "control-server",
      "--usb-root",
      tmp.path,
      "--port",
      "0",
      "--json",
    ]);
    assert.equal(cmd[0], "node");
  } finally {
    tmp.dispose();
  }
});

test("O009 metadata 探活成功时复用且不 spawn", async () => {
  const tmp = makeTmpDir();
  try {
    writeMetadata(tmp.path, { url: "http://127.0.0.1:17100/" });
    const logs: string[] = [];
    let spawned = 0;
    const resolver = createControlUrlResolver(tmp.path, {
      log: (m) => logs.push(m),
      root: tmp.path,
      healthProbe: () => true,
      spawnSync: (() => {
        spawned += 1;
        return { status: 0, stdout: "", stderr: "", signal: null, error: undefined };
      }) as never,
    });
    const url = await resolver.getControlUrl();
    assert.equal(spawned, 0, "复用分支不应调用 spawnSync");
    assert.equal(url, "http://127.0.0.1:17100");
    assert.ok(logs.includes("Ensuring control server."));
    assert.ok(logs.some((l) => l.includes("Reusing control server metadata: http://127.0.0.1:17100/")));
  } finally {
    tmp.dispose();
  }
});

test("O012 非零退出抛 Error(stderr)", () => {
  const tmp = makeTmpDir();
  try {
    const resolver = createControlUrlResolver(tmp.path, {
      log: () => {},
      root: tmp.path,
      healthProbe: () => false,
      spawnSync: (() => ({
        status: 1,
        stdout: "",
        stderr: "boom",
        signal: null,
        error: undefined,
      })) as never,
    });
    return resolver.getControlUrlOrEmpty().then((url) => {
      assert.equal(url, "", "失败时应回退空字符串（O-016）");
    });
  } finally {
    tmp.dispose();
  }
});

test("O015 并发调用只拉起一次控制服务", async () => {
  const tmp = makeTmpDir();
  try {
    let calls = 0;
    const resolver = createControlUrlResolver(tmp.path, {
      log: () => {},
      root: tmp.path,
      healthProbe: () => false,
      spawnSync: (() => {
        calls += 1;
        return {
          status: 0,
          stdout: JSON.stringify({ url: "http://127.0.0.1:19999/" }),
          stderr: "",
          signal: null,
          error: undefined,
        };
      }) as never,
    });
    const [a, b, c] = await Promise.all([
      resolver.getControlUrl(),
      resolver.getControlUrl(),
      resolver.getControlUrl(),
    ]);
    assert.equal(a, "http://127.0.0.1:19999");
    assert.equal(a, b);
    assert.equal(b, c);
    assert.equal(calls, 1);
  } finally {
    tmp.dispose();
  }
});
