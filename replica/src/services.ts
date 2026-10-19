/**
 * 服务启停与等待收敛。
 * 证据：OBLIGATIONS.md O-017 ~ O-025
 * 对应源码：bun-index.ts:170-210
 */
import {
  API,
  CONTROL_SERVER_SHUTDOWN_POLL_INTERVAL_MS,
  SERVICES_STOP_RETRY_INTERVAL_MS,
  STATUS_POLL_TIMEOUT_MS,
  STOP_SERVICES_API_TIMEOUT_MS,
  WAIT_CONTROL_SERVER_SHUTDOWN_TIMEOUT_MS,
  WAIT_SERVICES_STOPPED_TIMEOUT_MS,
} from "./constants.ts";
import { healthUrl, ping } from "./health.ts";
import { requestJson, requestJsonWithTimeout } from "./http.ts";
import { runClawHermesLifecycle, type LifecycleDeps } from "./lifecycle.ts";
import { sleep } from "./logger.ts";

export interface ServicesDeps extends LifecycleDeps {
  getBaseUrl: () => Promise<string>;
}

/** O-017 / O-018 启动全部服务：API 优先，失败走 CLI 兜底（stopOnFailure）。 */
export async function startAllServices(deps: ServicesDeps): Promise<unknown> {
  try {
    const baseUrl = await deps.getBaseUrl();
    return await requestJson(baseUrl, API.servicesStart, { method: "POST", body: {} });
  } catch (error) {
    deps.log(
      `Control API start failed; falling back to CLI start. ` +
        (error instanceof Error ? error.message : String(error)),
    );
    return runClawHermesLifecycle("start", { throwOnFailure: true }, deps);
  }
}

/**
 * O-019 / O-020 停止全部服务。
 * 关键点：CLI stop 在 try/catch 之外，无论 API 成败都执行；
 * 返回值取 apiResult ?? cliResult。
 */
export async function stopAllServices(
  options: { waitForStopped?: boolean } = {},
  deps: ServicesDeps,
): Promise<unknown> {
  let apiResult: unknown = null;
  try {
    const baseUrl = await deps.getBaseUrl();
    apiResult = await requestJsonWithTimeout(
      baseUrl,
      API.servicesStop,
      { method: "POST", body: {} },
      STOP_SERVICES_API_TIMEOUT_MS,
    );
    if (options.waitForStopped) await waitForServicesStopped(undefined, deps);
  } catch (error) {
    deps.log(
      `Control API stop failed; falling back to CLI stop. ` +
        (error instanceof Error ? error.message : String(error)),
    );
  }
  const cliResult = runClawHermesLifecycle("stop", { throwOnFailure: false }, deps);
  return apiResult ?? cliResult;
}

/**
 * O-021 ~ O-023 等待所有服务停止。
 * 轮询 /api/status（3s 超时），仍有 running 则重发 stop 并 sleep 250ms；超时返回 false。
 */
export async function waitForServicesStopped(
  timeoutMs: number = WAIT_SERVICES_STOPPED_TIMEOUT_MS,
  deps: Pick<ServicesDeps, "getBaseUrl" | "log">,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const baseUrl = await deps.getBaseUrl();
    const status = (await requestJsonWithTimeout(
      baseUrl,
      API.status,
      {},
      STATUS_POLL_TIMEOUT_MS,
    )) as { services?: Array<{ status?: string }> };
    const running = (status.services ?? []).filter((service) => service.status === "running");
    if (running.length === 0) return true;
    await requestJsonWithTimeout(
      baseUrl,
      API.servicesStop,
      { method: "POST", body: {} },
      STATUS_POLL_TIMEOUT_MS,
    );
    await sleep(SERVICES_STOP_RETRY_INTERVAL_MS);
  }
  return false;
}

/**
 * O-024 / O-025 等待控制服务关闭。
 * controlUrl 为空时立即返回 true（不等待）。
 */
export async function waitForControlServerShutdown(
  controlUrl: string,
  timeoutMs: number = WAIT_CONTROL_SERVER_SHUTDOWN_TIMEOUT_MS,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!controlUrl || !(await ping(healthUrl(controlUrl)))) return true;
    await sleep(CONTROL_SERVER_SHUTDOWN_POLL_INTERVAL_MS);
  }
  return false;
}
