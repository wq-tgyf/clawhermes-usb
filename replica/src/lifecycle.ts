/**
 * CLI 生命周期兜底。
 * 证据：OBLIGATIONS.md O-026 / O-027 / O-028 / O-029 / O-030
 * 对应源码：bun-index.ts:309-337
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { CLI_OTHER_TIMEOUT_MS, CLI_START_TIMEOUT_MS } from "./constants.ts";
import { nodeCommand } from "./root.ts";

export interface LifecycleOptions {
  throwOnFailure: boolean;
}

export interface LifecycleDeps {
  spawnSync: typeof import("node:child_process").spawnSync;
  log: (message: string) => void;
  root: string;
}

/** O-026 构造 CLI 命令。 */
export function lifecycleCommand(root: string, action: string): string[] {
  return [
    ...nodeCommand(root),
    join(root, "core", "node", "dist", "clawhermes.js"),
    action,
    "--usb-root",
    root,
    "--json",
  ];
}

/**
 * O-026 ~ O-030 执行 CLI 生命周期命令。
 * - 超时：start 20000ms，其它 10000ms
 * - 失败策略由 options.throwOnFailure 决定
 * - 返回值三级降级：JSON 解析成功 > 原始 stdout > 仅状态
 */
export function runClawHermesLifecycle(
  action: string,
  options: LifecycleOptions,
  deps: LifecycleDeps,
): unknown {
  const root = deps.root;
  const command = lifecycleCommand(root, action);
  deps.log(`Running CLI lifecycle fallback: ${command.join(" ")}`);

  // O-027 差异化超时
  const completed = deps.spawnSync(command[0], command.slice(1), {
    cwd: root,
    encoding: "utf8",
    timeout: action === "start" ? CLI_START_TIMEOUT_MS : CLI_OTHER_TIMEOUT_MS,
    windowsHide: true,
  });

  // O-030 执行后日志
  deps.log(
    `CLI lifecycle fallback completed. action=${action} status=${completed.status ?? "null"} ` +
      `signal=${completed.signal ?? "null"} error=${completed.error?.message ?? "none"}`,
  );
  const stdout = (completed.stdout as string) ?? "";
  const stderr = (completed.stderr as string) ?? "";
  if (stdout) deps.log(`CLI lifecycle stdout: ${stdout.slice(-2000)}`);
  if (stderr) deps.log(`CLI lifecycle stderr: ${stderr.slice(-2000)}`);

  // O-028 失败策略
  if (completed.status !== 0 && options.throwOnFailure) {
    throw new Error(
      stderr || completed.error?.message || `${action} fallback failed.`,
    );
  }

  // O-029 返回值三级降级
  if (stdout) {
    try {
      return JSON.parse(stdout);
    } catch {
      return { root, action, status: completed.status, stdout, stderr };
    }
  }
  return { root, action, status: completed.status };
}
