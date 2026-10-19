/**
 * 日志与时间工具。
 * 证据：OBLIGATIONS.md O-046 / O-047 / O-048 / O-050
 * 对应源码：bun-index.ts:354-365
 */
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { LOG_RELATIVE_PATH } from "./constants.ts";

/** O-046 日志文件绝对路径。 */
export function logFilePath(root: string): string {
  return join(root, ...LOG_RELATIVE_PATH);
}

/**
 * O-046 / O-047 / O-048
 * 追加一行 "<ISO8601> <消息>"，写入前递归建目录；任何失败仅走 onError，不抛出。
 */
export function writeElectrobunLog(
  root: string,
  message: string,
  hooks: { onError?: (message: string, error: unknown) => void } = {},
): boolean {
  try {
    const logFile = logFilePath(root);
    mkdirSync(dirname(logFile), { recursive: true });
    appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`, "utf8");
    return true;
  } catch (error) {
    // O-048 静默：默认只记录到 console，不向上抛出
    if (hooks.onError) hooks.onError("electrobun log write failed", error);
    else console.error("electrobun log write failed", error);
    return false;
  }
}

/** 读取日志内容（复刻测试与诊断用，非原产物行为）。 */
export function readLog(root: string): string[] {
  const file = logFilePath(root);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean);
}

/** O-050 睡眠。 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}
