/**
 * 通用 JSON 请求。
 * 证据：OBLIGATIONS.md O-031 ~ O-036
 * 对应源码：bun-index.ts:101-125, 149-151
 */
import { DEFAULT_REQUEST_TIMEOUT_MS, SHORT_REQUEST_TIMEOUT_MS } from "./constants.ts";

export interface RequestOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

/**
 * O-031 ~ O-035
 * - 默认 timeoutMs 15000，用 AbortController 到时中断
 * - URL 由调用方传入的已去尾斜杠 baseUrl 拼接
 * - 仅在有 body 时设置 content-type
 * - 非 2xx：优先取响应体 error.message 作为 detail
 */
export async function requestJson(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const payload = (await response.json()) as { error?: { message?: string } };
        if (payload.error?.message) detail = payload.error.message;
      } catch {
        // 响应体不是 JSON 时保留状态行
      }
      throw new Error(`Control API failed: ${detail}`);
    }
    return response.json();
  } finally {
    // O-035 定时器必须清理
    clearTimeout(timeout);
  }
}

/** O-036 简化封装：requestJsonWithTimeout(path, options, timeoutMs = 4000)。 */
export function requestJsonWithTimeout(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
  timeoutMs: number = SHORT_REQUEST_TIMEOUT_MS,
): Promise<unknown> {
  return requestJson(baseUrl, path, { ...options, timeoutMs });
}
