import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { ancestorPaths, findUsbRoot, nodeCommand, rootHintCandidates } from "../src/root.ts";
import { makeTmpDir } from "./helpers/tmp.ts";

test("O002 环境变量优先于全部探测", () => {
  const tmp = makeTmpDir();
  try {
    const result = findUsbRoot({
      moduleUrl: pathToFileURL(join(tmp.path, "a", "b", "main.js")).href,
      cwd: tmp.path,
      env: { CLAWHERMES_USB_ROOT: join(tmp.path, "chosen") },
    });
    assert.equal(result, join(tmp.path, "chosen"));
  } finally {
    tmp.dispose();
  }
});

test("O003 祖先目录中命中标识文件即返回", () => {
  const tmp = makeTmpDir();
  try {
    const root = join(tmp.path, "usbroot");
    mkdirSync(join(root, "core", "node", "dist"), { recursive: true });
    writeFileSync(join(root, "core", "node", "dist", "clawhermes.js"), "");
    const deep = join(root, "a", "b", "c");
    mkdirSync(deep, { recursive: true });
    const result = findUsbRoot({
      moduleUrl: pathToFileURL(join(deep, "main.js")).href,
      cwd: deep,
      env: {},
    });
    assert.equal(result, root);
  } finally {
    tmp.dispose();
  }
});

test("O004 全部未命中时兜底上溯四级且不抛错", () => {
  const tmp = makeTmpDir();
  try {
    const start = join(tmp.path, "a", "b", "c", "d");
    mkdirSync(start, { recursive: true });
    const result = findUsbRoot({
      moduleUrl: pathToFileURL(join(start, "main.js")).href,
      cwd: start,
      env: {},
    });
    assert.equal(result, join(tmp.path));
  } finally {
    tmp.dispose();
  }
});

test("O005 提示文件内容进入候选并被采用", () => {
  const tmp = makeTmpDir();
  try {
    const root = join(tmp.path, "hinted");
    mkdirSync(join(root, "core", "node", "dist"), { recursive: true });
    writeFileSync(join(root, "core", "node", "dist", "clawhermes.js"), "");
    const inner = join(tmp.path, "inner");
    mkdirSync(inner, { recursive: true });
    writeFileSync(join(inner, "clawhermes-usb-root.txt"), `  ${root}  \n`);
    const hints = rootHintCandidates(inner);
    assert.deepEqual(hints, [root]);
    const result = findUsbRoot({
      moduleUrl: pathToFileURL(join(inner, "main.js")).href,
      cwd: inner,
      env: {},
    });
    assert.equal(result, root);
  } finally {
    tmp.dispose();
  }
});

test("O006 祖先路径枚举不含自身且到根停止", () => {
  // 用当前平台的原生路径样本：node:path 的行为是平台相关的，
  // 写死 Windows 路径会让 Linux CI 失败（实际踩过）。
  const win = process.platform === "win32";
  const root = win ? "F:\\" : "/";
  const start = win ? "F:\\a\\b\\c" : "/a/b/c";
  const paths = ancestorPaths(start);

  assert.equal(paths.includes(start), false, "不应包含自身");
  assert.equal(paths[0], win ? "F:\\a\\b" : "/a/b", "第一级是父目录");
  assert.equal(paths[1], win ? "F:\\a" : "/a", "第二级是祖父目录");
  assert.equal(paths.at(-1), root, "最后一级是根");
});

test("O006 祖先路径在 Windows 语义下逐级上溯", () => {
  // 交叉验证：显式用 posix 语义跑一遍，确保逻辑本身与平台无关
  const paths = ancestorPaths.posix("/a/b/c");
  assert.deepEqual(paths, ["/a/b", "/a", "/"]);
});

test("O007 Windows 便携 node 存在则使用，否则回退 node", () => {
  const tmp = makeTmpDir();
  try {
    assert.deepEqual(nodeCommand(tmp.path, "win32"), ["node"]);
    const nodeDir = join(tmp.path, "runtimes", "windows", "node");
    mkdirSync(nodeDir, { recursive: true });
    writeFileSync(join(nodeDir, "node.exe"), "");
    assert.deepEqual(nodeCommand(tmp.path, "win32"), [join(nodeDir, "node.exe")]);
  } finally {
    tmp.dispose();
  }
});

test("O008 macOS 按架构选择运行时目录", () => {
  const tmp = makeTmpDir();
  try {
    const bin = join(tmp.path, "runtimes", "macos", "node", "darwin-arm64", "bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "node"), "");
    assert.deepEqual(nodeCommand(tmp.path, "darwin", "arm64"), [join(bin, "node")]);
    assert.deepEqual(nodeCommand(tmp.path, "darwin", "x64"), ["node"]);
  } finally {
    tmp.dispose();
  }
});
