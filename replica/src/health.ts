/**
 * 健康检查。
 * 证据：OBLIGATIONS.md O-044 / O-045 / O-052
 * 对应源码：bun-index.ts:338-353
 */
import { spawnSync } from "node:child_process";
import { API, PING_SYNC_TIMEOUT_MS } from "./constants.ts";
import { nodeCommand } from "./root.ts";

/** O-052 拼接健康检查 URL，保证不出现 "//api/health"。 */
export function healthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}${API.health}`;
}

/** O-044 异步健康检查：fetch + response.ok；任何异常返回 false。 */
export async function ping(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * O-045 同步健康检查：另起 node 子进程执行内联 fetch，用退出码表达结果。
 * 注意：不是用 fetch 直接判断，必须复刻这套子进程语义。
 */
export function pingSync(url: string, root: string): boolean {
  const command = nodeCommand(root);
  const completed = spawnSync(
    command[0],
    [
      ...command.slice(1),
      "-e",
      `fetch(${JSON.stringify(url)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`,
    ],
    { encoding: "utf8", timeout: PING_SYNC_TIMEOUT_MS, windowsHide: true },
  );
  return completed.status === 0;
}
