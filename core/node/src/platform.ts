import { join } from "node:path";
import type { PlatformInfo, PlatformProbe } from "./types";

export function detectPlatform(probe: PlatformProbe = {}): PlatformInfo {
  const nodePlatform = probe.platform ?? process.platform;
  const nodeArch = probe.arch ?? process.arch;
  const id = nodePlatform === "win32" ? "windows" : nodePlatform === "darwin" ? "darwin" : "linux";
  const arch = nodeArch === "arm64" ? "arm64" : "x64";
  return {
    id,
    nodePlatform,
    arch,
    runtimeKey: id === "darwin" ? `darwin-${arch}` : id,
    pathSeparator: id === "windows" ? ";" : ":",
    executableSuffix: id === "windows" ? ".exe" : "",
  };
}

export function runtimePathEntries(usbRoot: string, info: PlatformInfo = detectPlatform()): string[] {
  if (info.id === "darwin") {
    return [
      join(usbRoot, "runtimes", "macos", "node", info.runtimeKey, "bin"),
      join(usbRoot, "runtimes", "macos", "python", info.runtimeKey, "bin"),
      join(usbRoot, "runtimes", "macos", "git", info.runtimeKey, "bin"),
    ];
  }
  if (info.id === "linux") {
    return [
      join(usbRoot, "runtimes", "linux", "node", "bin"),
      join(usbRoot, "runtimes", "linux", "python", "bin"),
      join(usbRoot, "runtimes", "linux", "git", "bin"),
    ];
  }
  return [
    join(usbRoot, "runtimes", "windows", "node"),
    join(usbRoot, "runtimes", "windows", "python"),
    join(usbRoot, "runtimes", "windows", "git", "cmd"),
  ];
}
