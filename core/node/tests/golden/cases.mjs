/**
 * Golden 基线用的命令清单与归一化规则。
 *
 * 选择原则：
 * - 只选**不会改变系统状态**的只读命令（status / adapters / payloads / --dry-run 等）
 * - 不收录会启停服务、写文件、改宿主机状态的命令
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 仓库根目录动态解析：本地是 F:\DTC，CI 上是 D:\a\...\，写死会导致全部路径断言失败。
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
// 归一化基准：优先用环境变量（若输出里的路径与 cwd 不一致）
export const NORMALIZE_ROOT = process.env.CLAWHERMES_ROOT_OVERRIDE || ROOT;

export const CASES = [
  { name: "status", args: ["status", "--json"] },
  { name: "adapters", args: ["adapters", "--json"] },
  { name: "adapters-hermes-web-ui", args: ["adapters", "hermes-web-ui", "--json"] },
  { name: "payloads", args: ["payloads", "--json"] },
  { name: "payload-export-dry-run", args: ["payload-export", "--dry-run", "--json"] },
  { name: "sources", args: ["sources", "--json"] },
  { name: "sources-hermes-web-ui", args: ["sources", "hermes-web-ui", "--json"] },
  { name: "runtimes", args: ["runtimes", "--json"] },
  { name: "wsl", args: ["wsl", "--distro", "Ubuntu", "--json"] },
  { name: "wsl-rootfs-guide", args: ["wsl-rootfs-guide", "--distro", "Ubuntu", "--json"] },
  { name: "wsl-import-plan", args: ["wsl-import-plan", "--distro", "Ubuntu", "--json"] },
  { name: "wsl-unregister-plan", args: ["wsl-unregister-plan", "--distro", "Ubuntu", "--json"] },
  { name: "model-config-status", args: ["model-config-status", "--json"] },
  { name: "device-binding", args: ["device-binding", "--json"] },
  { name: "setup", args: ["setup", "--json"] },
  { name: "init-env", args: ["init-env", "--json"] },
  { name: "checkout-source-dry-run", args: ["checkout-source", "hermes-web-ui", "--dry-run", "--json"] },
  { name: "setup-adapter-dry-run", args: ["setup-adapter", "hermes-web-ui", "--dry-run", "--json"] },
  { name: "start-adapter-dry-run", args: ["start-adapter", "hermes-web-ui", "--dry-run", "--json"] },
  { name: "restore-plan", args: ["restore-plan", "--archive", "data/backups/nonexistent.zip", "--json"] },
];

/**
 * 期望以非零退出码结束的命令。
 * 这些命令的"错误行为"本身也是契约的一部分，需要一并固化，
 * 否则改动后错误路径静默变化不会被发现。
 */
export const EXPECTS_FAILURE = new Set([
  "checkout-source-dry-run",
  "restore-plan",
]);

/**
 * 归一化：把每次运行都会变化的字段替换为占位符。
 *
 * 处理的易变项：
 * - 绝对路径（F:\DTC → <ROOT>），但保留其后的相对部分
 * - ISO 时间戳
 * - PID
 * - 端口号（占用情况不同会变）
 */
export function normalize(value, root = ROOT) {
  // 原始值里的路径是单反斜杠形式（"F:\\DTC" 在 JS 里就是 F:\DTC 两个字符），
  // 所以这里只需匹配单反斜杠与正斜杠两种写法。
  const rootVariants = [root, root.replace(/\\/g, "/")];

  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v);
      return out;
    }
    if (typeof node !== "string") return node;

    let s = node;
    // 绝对路径归一
    for (const rv of rootVariants) {
      s = s.split(rv).join("<ROOT>");
    }
    // ISO 时间戳归一
    s = s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "<TIMESTAMP>");
    // 文件名中使用的紧凑时间戳（如 clawhermes-payloads-2026-10-19T07-59-24-895Z.zip）
    s = s.replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/g, "<TIMESTAMP>");
    // 纯日期（部分日志名使用）
    s = s.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<DATE>");
    // 单独出现的 PID
    if (/^\d+$/.test(s) && s.length >= 3 && s.length <= 7) {
      // 不在这里归一纯数字——太危险（会把正常的编号也改掉）
      return node;
    }
    return s;
  };

  return walk(value);
}
