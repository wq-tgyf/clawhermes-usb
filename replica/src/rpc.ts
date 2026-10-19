/**
 * RPC 契约层：把 19 个 handler 实现为纯函数 + 依赖注入形式，
 * 便于在无 Electrobun 运行时的情况下逐条验收。
 * 证据：OBLIGATIONS.md O-037 ~ O-072；附录 A-1 端点表
 * 对应源码：bun-index.ts:9-70
 */
import {
  API,
  MODEL_CONFIG_APPLY,
  MODEL_CONFIG_PROVIDER_TYPE,
} from "./constants.ts";
import { requestJson } from "./http.ts";

export interface RpcDeps {
  root: string;
  getBaseUrl: () => Promise<string>;
  getControlUrlOrEmpty: () => Promise<string>;
  getStatusPayload: () => Promise<unknown>;
  log: (message: string) => void;
  /** 平台能力，窗口操作测试时注入桩。 */
  window?: {
    minimize?: () => void;
    maximize?: () => void;
    unmaximize?: () => void;
    isMaximized?: () => boolean;
  };
  openExternal?: (url: string) => void;
  cleanupBeforeExit: () => Promise<void>;
  startAllServices: () => Promise<unknown>;
  stopAllServices: () => Promise<unknown>;
  beginImmediateClose: () => void;
}

export interface ModelConfigInput {
  apiUrl?: string;
  model?: string;
  apiKey?: string;
  [key: string]: unknown;
}

/** O-038 保存模型配置时 body 归一（硬编码 providerType 与 apply）。 */
export function normalizeModelConfigBody(config: ModelConfigInput) {
  return {
    providerType: MODEL_CONFIG_PROVIDER_TYPE,
    apiUrl: config.apiUrl,
    model: config.model,
    apiKey: config.apiKey,
    apply: MODEL_CONFIG_APPLY,
  };
}

/** 构造全部 19 个 RPC handler。 */
export function createRpcHandlers(deps: RpcDeps) {
  const req = async (path: string, method = "GET", body?: unknown) =>
    requestJson(await deps.getBaseUrl(), path, { method, body });

  return {
    // O-061
    getBootstrap: async () => ({
      root: deps.root,
      controlUrl: await deps.getControlUrlOrEmpty(),
    }),
    // O-043
    getStatus: () => deps.getStatusPayload(),
    // O-049
    getLogs: () => req(`${API.logs}?service=launcher&lines=140`),
    // O-041
    getSkills: () => req(API.skills),
    // O-039
    getDeviceBinding: () => req(API.deviceBinding),
    // O-040
    bindDevice: () => req(API.deviceBindingBind, "POST", {}),
    // O-053
    getWeixinChannelStatus: () => req(API.weixin),
    // O-054
    getWeixinChannelLogs: () => req(`${API.weixinLogs}?lines=160`),
    // O-055
    startWeixinChannelLogin: () => req(API.weixinLogin, "POST", {}),
    // O-056
    stopWeixinChannelLogin: () => req(API.weixinStop, "POST", {}),
    // O-037
    getModelConfig: () => req(API.modelConfig),
    // O-017
    startAll: () => deps.startAllServices(),
    // O-019
    stopAll: () => deps.stopAllServices(),
    // O-038
    saveModelConfig: (config: ModelConfigInput) =>
      req(API.modelConfig, "POST", normalizeModelConfigBody(config)),
    // O-068
    openUrl: (payload: { url?: string }) => {
      const target = payload ?? {};
      if (target.url) deps.openExternal?.(target.url);
      return { opened: true };
    },
    // O-065
    shutdown: async () => {
      await deps.cleanupBeforeExit();
      return { status: "stopping" };
    },
    // O-066
    minimizeWindow: () => {
      deps.window?.minimize?.();
      return { minimized: true };
    },
    // O-067
    maximizeWindow: () => {
      if (deps.window?.isMaximized?.()) {
        deps.window.unmaximize?.();
        return { maximized: false };
      }
      deps.window?.maximize?.();
      return { maximized: true };
    },
    // O-064
    closeWindow: async () => {
      deps.beginImmediateClose();
      return { closed: true, cleanup: "foreground" };
    },
  };
}

export type RpcHandlers = ReturnType<typeof createRpcHandlers>;
