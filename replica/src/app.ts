/**
 * 应用装配：把各模块拼成与原产物等价的控制中心运行时。
 * 证据：OBLIGATIONS.md O-042 / O-043 / O-057 / O-058 / O-062 / O-063 / O-073
 * 对应源码：bun-index.ts:94-169
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STATUS_SNAPSHOT_RELATIVE_PATH } from "./constants.ts";
import { requestJson } from "./http.ts";
import { writeElectrobunLog } from "./logger.ts";

/** O-042 状态快照兜底：读 data/tmp/status.json；任何异常返回 { services: [] }。 */
export function readStatusSnapshot(root: string): unknown {
  const path = join(root, ...STATUS_SNAPSHOT_RELATIVE_PATH);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { services: [] };
  }
}

export interface StatusDeps {
  root: string;
  getBaseUrl: () => Promise<string>;
  log: (message: string) => void;
}

/** O-043 状态获取：API 优先，失败写日志并回落状态快照。 */
export async function getStatusPayload(deps: StatusDeps): Promise<unknown> {
  try {
    return await requestJson(await deps.getBaseUrl(), "/api/status");
  } catch (error) {
    deps.log(
      `Control API status failed; falling back to status snapshot. ` +
        (error instanceof Error ? error.message : String(error)),
    );
    return readStatusSnapshot(deps.root);
  }
}

export interface CleanupDeps {
  getBaseUrl: () => Promise<string>;
  stopAllServices: (options: { waitForStopped?: boolean }) => Promise<unknown>;
  waitForControlServerShutdown: () => Promise<boolean>;
  /** 用于测试注入的请求超时（O-057 为 4000ms）。 */
  requestJsonWithTimeout: (
    baseUrl: string,
    path: string,
    options: object,
    timeoutMs: number,
  ) => Promise<unknown>;
}

/**
 * O-057 / O-058 退出清理，严格四步顺序：
 * 1) 停微信（4s，失败吞掉） 2) 停全部服务并等待 3) /api/shutdown（失败吞掉） 4) 等控制服务退出
 */
export async function cleanupBeforeExit(deps: CleanupDeps): Promise<void> {
  try {
    const baseUrl = await deps.getBaseUrl();
    await deps.requestJsonWithTimeout(
      baseUrl,
      "/api/channels/weixin/stop",
      { method: "POST", body: {} },
      4_000,
    );
  } catch {
    // 刻意吞掉
  }
  await deps.stopAllServices({ waitForStopped: true });
  try {
    const baseUrl = await deps.getBaseUrl();
    await deps.requestJsonWithTimeout(baseUrl, "/api/shutdown", { method: "POST", body: {} }, 4_000);
  } catch {
    // 刻意吞掉
  }
  await deps.waitForControlServerShutdown();
}

/**
 * O-062 / O-063 关闭幂等控制器。
 * 首次调用执行清理；后续调用直接返回（对应 closingFromUi 标志）。
 */
export function createCloseController(hooks: {
  cleanup: () => Promise<void>;
  quit: () => void;
  log?: (message: string, error: unknown) => void;
}) {
  let closingFromUi = false;
  return {
    isClosing: () => closingFromUi,
    beginImmediateClose(): void {
      if (closingFromUi) return;
      closingFromUi = true;
      hooks
        .cleanup()
        .catch((error) => {
          if (hooks.log) hooks.log("cleanup before exit failed", error);
          else console.error("cleanup before exit failed", error);
        })
        .finally(() => {
          hooks.quit();
        });
    },
    /** O-062 窗口 close 事件：非 UI 主动关闭时触发清理。 */
    onWindowClose(): void {
      if (!closingFromUi) this.beginImmediateClose();
    },
  };
}

/** 默认日志钩子。 */
export function makeLogger(root: string): (message: string) => void {
  return (message: string) => writeElectrobunLog(root, message);
}
