/**
 * 控制服务生命周期：拉起、复用、并发去重。
 * 证据：OBLIGATIONS.md O-009 / O-010 / O-011 / O-012 / O-013 / O-014 / O-015 / O-016
 * 对应源码：bun-index.ts:127-148, 212-252
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTROL_SERVER_ARGS,
  CONTROL_SERVER_METADATA_RELATIVE_PATH,
  CONTROL_SERVER_SPAWN_TIMEOUT_MS,
} from "./constants.ts";
import { healthUrl, pingSync } from "./health.ts";
import { nodeCommand } from "./root.ts";

export interface ControlServerMetadata {
  serviceId?: string;
  displayName?: string;
  status?: string;
  processId?: number;
  startedAt?: string;
  url: string;
  root?: string;
  logFile?: string;
}

export interface ControlServerDeps {
  spawnSync: typeof import("node:child_process").spawnSync;
  log: (message: string) => void;
  root: string;
  /** O-009 探活注入点，默认走真实 pingSync；测试可覆写。 */
  healthProbe?: (healthUrl: string) => boolean;
}

/** O-014 读 data/tmp/control-server.json；任何异常返回 null。 */
export function readControlServerMetadata(usbRoot: string): ControlServerMetadata | null {
  const path = join(usbRoot, ...CONTROL_SERVER_METADATA_RELATIVE_PATH);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ControlServerMetadata;
  } catch {
    return null;
  }
}

/** O-010 构造控制服务命令行。 */
export function controlServerCommand(usbRoot: string): string[] {
  const args = [...CONTROL_SERVER_ARGS];
  args[2] = usbRoot; // --usb-root 的值
  return [...nodeCommand(usbRoot), join(usbRoot, "core", "node", "dist", "clawhermes.js"), ...args];
}

/**
 * O-009 ~ O-013
 * 先复用 metadata（pingSync 探活），否则 spawnSync 拉起，超时 10s，cwd=usbRoot。
 * 非零退出：写日志后抛 Error(stderr || "Failed to start control server.")。
 */
export function ensureControlServer(usbRoot: string, deps: ControlServerDeps): string {
  deps.log("Ensuring control server.");

  // O-009 复用已有实例
  const metadata = readControlServerMetadata(usbRoot);
  const probe = deps.healthProbe ?? ((url: string) => pingSync(url, usbRoot));
  if (metadata && probe(healthUrl(metadata.url))) {
    deps.log(`Reusing control server metadata: ${metadata.url}`);
    return metadata.url;
  }

  const command = controlServerCommand(usbRoot);
  deps.log(`Starting control server command: ${command.join(" ")}`);

  // O-011 执行参数
  const completed = deps.spawnSync(command[0], command.slice(1), {
    cwd: usbRoot,
    encoding: "utf8",
    timeout: CONTROL_SERVER_SPAWN_TIMEOUT_MS,
    windowsHide: true,
  });

  deps.log(
    `Control server command completed. status=${completed.status ?? "null"} ` +
      `signal=${completed.signal ?? "null"} error=${completed.error?.message ?? "none"}`,
  );

  // O-012 失败处理
  if (completed.status !== 0) {
    const stdout = (completed.stdout as string) ?? "";
    const stderr = (completed.stderr as string) ?? "";
    if (stdout) deps.log(`Control server stdout: ${stdout.slice(-2000)}`);
    if (stderr) deps.log(`Control server stderr: ${stderr.slice(-2000)}`);
    throw new Error(stderr || "Failed to start control server.");
  }

  // O-013 成功解析
  const payload = JSON.parse((completed.stdout as string) ?? "{}") as { url: string };
  return payload.url;
}

/**
 * O-015 / O-016 控制 URL 并发去重与容错读取。
 * 构造一次，返回带缓存语义的读取器。
 */
export function createControlUrlResolver(usbRoot: string, deps: ControlServerDeps) {
  let controlUrl = "";
  let controlServerPromise: Promise<string> | undefined;

  async function getControlUrl(): Promise<string> {
    if (controlUrl) return controlUrl;
    if (!controlServerPromise) {
      controlServerPromise = Promise.resolve()
        .then(() => ensureControlServer(usbRoot, deps).replace(/\/$/, ""))
        .then((url) => {
          controlUrl = url;
          return url;
        })
        .catch((error) => {
          controlServerPromise = undefined;
          throw error;
        });
    }
    return controlServerPromise;
  }

  async function getControlUrlOrEmpty(): Promise<string> {
    try {
      return await getControlUrl();
    } catch (error) {
      deps.log(
        "Control server bootstrap failed; UI will use fallback status paths. " +
          (error instanceof Error ? error.message : String(error)),
      );
      return "";
    }
  }

  return { getControlUrl, getControlUrlOrEmpty, current: () => controlUrl };
}
