/**
 * USB 根目录解析与 Node 运行时选择。
 * 证据：OBLIGATIONS.md O-002 / O-003 / O-004 / O-005 / O-006 / O-007 / O-008
 * 对应源码：bun-index.ts:253-301
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ENV_USB_ROOT, ROOT_HINT_FILES, USB_ROOT_MARKER } from "./constants.ts";

/** O-006 祖先路径枚举：不含 start 自身，遇根停止。 */
export function ancestorPaths(start: string): string[] {
  const paths: string[] = [];
  let current = resolve(start);
  while (dirname(current) !== current) {
    current = dirname(current);
    paths.push(current);
  }
  return paths;
}

/** O-005 从 start 及祖先目录读取根目录提示文件，过滤空值。 */
export function rootHintCandidates(start: string): string[] {
  const candidates: string[] = [];
  for (const candidate of [start, ...ancestorPaths(start)]) {
    for (const segments of ROOT_HINT_FILES) {
      const hintPath = join(candidate, ...segments);
      if (!existsSync(hintPath)) continue;
      try {
        candidates.push(readFileSync(hintPath, "utf8").trim());
      } catch {
        // 读取失败按源码语义静默忽略
      }
    }
  }
  return candidates.filter(Boolean);
}

/** 判定候选目录是否为 USB 根。 */
function looksLikeUsbRoot(candidate: string): boolean {
  return existsSync(join(candidate, ...USB_ROOT_MARKER));
}

/**
 * O-002 / O-003 / O-004 USB 根目录解析。
 * 优先级：env > 提示文件(start) > 提示文件(cwd) > cwd > start > 祖先(start) > 祖先(cwd)。
 * 全部未命中时返回 resolve(start, "../../../..")，不抛错。
 */
export function findUsbRoot(options: {
  moduleUrl?: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
} = {}): string {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const moduleUrl = options.moduleUrl ?? import.meta.url;
  const start = dirname(fileURLToPath(moduleUrl));

  // O-002 环境变量优先
  const envRoot = env[ENV_USB_ROOT];
  if (envRoot) return resolve(envRoot);

  const candidates = [
    ...rootHintCandidates(start),
    ...rootHintCandidates(cwd),
    cwd,
    start,
    ...ancestorPaths(start),
    ...ancestorPaths(cwd),
  ];
  for (const candidate of candidates) {
    if (looksLikeUsbRoot(candidate)) return candidate;
  }
  // O-004 兜底
  return resolve(start, "../../../..");
}

/**
 * O-007 / O-008 Node 运行时选择。
 * Windows: <root>/runtimes/windows/node/node.exe；macOS: <root>/runtimes/macos/node/<platform>/bin/node。
 * 不存在时回退裸命令 "node"。
 */
export function nodeCommand(
  usbRoot: string,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string[] {
  if (platform === "darwin") {
    const platformDir = arch === "arm64" ? "darwin-arm64" : "darwin-x64";
    const portableNode = join(usbRoot, "runtimes", "macos", "node", platformDir, "bin", "node");
    return existsSync(portableNode) ? [portableNode] : ["node"];
  }
  const portableNode = join(usbRoot, "runtimes", "windows", "node", "node.exe");
  return existsSync(portableNode) ? [portableNode] : ["node"];
}

export { pathToFileURL };
