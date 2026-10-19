/**
 * 复刻自 ClawHermes-Control-Electrobun-Setup.tar.zst 的业务常量。
 * 证据：docs/reconstruction/OBLIGATIONS.md O-010 / O-011 / O-019 / O-027 / O-038 / O-059
 * 警告：以下数值是原产物的硬编码值，复刻时不得"优化"。
 */

/** O-010 控制服务命令行参数 */
export const CONTROL_SERVER_ARGS = ["control-server", "--usb-root", "", "--port", "0", "--json"] as const;

/** O-011 控制服务拉起超时（毫秒） */
export const CONTROL_SERVER_SPAWN_TIMEOUT_MS = 10_000;

/** O-019 停止服务 API 超时（毫秒） */
export const STOP_SERVICES_API_TIMEOUT_MS = 5_000;

/** O-021 等待服务停止默认超时（毫秒） */
export const WAIT_SERVICES_STOPPED_TIMEOUT_MS = 9_000;

/** O-021 / O-022 状态轮询与重发 stop 的超时（毫秒） */
export const STATUS_POLL_TIMEOUT_MS = 3_000;

/** O-022 轮询节拍（毫秒） */
export const SERVICES_STOP_RETRY_INTERVAL_MS = 250;

/** O-024 等待控制服务关闭默认超时（毫秒） */
export const WAIT_CONTROL_SERVER_SHUTDOWN_TIMEOUT_MS = 8_000;

/** O-025 关闭轮询节拍（毫秒） */
export const CONTROL_SERVER_SHUTDOWN_POLL_INTERVAL_MS = 120;

/** O-027 CLI 兜底超时：start 20s，其它 10s */
export const CLI_START_TIMEOUT_MS = 20_000;
export const CLI_OTHER_TIMEOUT_MS = 10_000;

/** O-031 通用请求默认超时（毫秒） */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

/** O-036 简化封装默认超时（毫秒） */
export const SHORT_REQUEST_TIMEOUT_MS = 4_000;

/** O-045 pingSync 子进程超时（毫秒） */
export const PING_SYNC_TIMEOUT_MS = 3_000;

/** O-038 模型配置中硬编码的两个字段（不从入参读取） */
export const MODEL_CONFIG_PROVIDER_TYPE = "openai-compatible";
export const MODEL_CONFIG_APPLY = "both";

/** O-059 主窗口参数 */
export const WINDOW_OPTIONS = {
  title: "DTclaw Control",
  url: "views://mainview/index.html",
  frame: { width: 1120, height: 760, x: 80, y: 60 },
  styleMask: { Resizable: true },
  titleBarStyle: "hidden",
} as const;

/** O-046 / O-047 日志相对路径 */
export const LOG_RELATIVE_PATH = ["data", "logs", "electrobun-control.log"] as const;

/** O-009 / O-014 控制服务 metadata 相对路径 */
export const CONTROL_SERVER_METADATA_RELATIVE_PATH = ["data", "tmp", "control-server.json"] as const;

/** O-042 状态快照相对路径 */
export const STATUS_SNAPSHOT_RELATIVE_PATH = ["data", "tmp", "status.json"] as const;

/** O-005 根目录提示文件名 */
export const ROOT_HINT_FILES = [
  ["Resources", "clawhermes-usb-root.txt"],
  ["clawhermes-usb-root.txt"],
] as const;

/** O-003 根目录判定标识文件 */
export const USB_ROOT_MARKER = ["core", "node", "dist", "clawhermes.js"] as const;

/** O-002 环境变量名 */
export const ENV_USB_ROOT = "CLAWHERMES_USB_ROOT";

/** 控制服务 API 端点（附录 A-1） */
export const API = {
  health: "/api/health",
  status: "/api/status",
  skills: "/api/skills",
  deviceBinding: "/api/device-binding",
  deviceBindingBind: "/api/device-binding/bind",
  modelConfig: "/api/model-config",
  logs: "/api/logs",
  weixin: "/api/channels/weixin",
  weixinLogs: "/api/channels/weixin/logs",
  weixinLogin: "/api/channels/weixin/login",
  weixinStop: "/api/channels/weixin/stop",
  servicesStart: "/api/services/start",
  servicesStop: "/api/services/stop",
  shutdown: "/api/shutdown",
} as const;
