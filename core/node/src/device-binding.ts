import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { getRoot } from "./portable";

const FINGERPRINT_ENV = "CLAWHERMES_DEVICE_BINDING_FINGERPRINT";

interface DeviceFingerprint {
  hash: string;
  source: string;
  summary?: string;
}

interface DeviceBindingRecord {
  schemaVersion: number;
  createdAt?: string;
  rootAtBinding?: string;
  fingerprint: DeviceFingerprint;
  fingerprints?: DeviceFingerprint[];
}

export function deviceBindingPath(usbRoot: string) {
  return join(getRoot(usbRoot), "data", "settings", "device-binding.json");
}

export function getDeviceBindingStatus(usbRoot: string) {
  const root = getRoot(usbRoot);
  const bindingPath = deviceBindingPath(root);
  const current = currentDeviceFingerprint(root);
  const binding = readDeviceBinding(bindingPath);
  if (!binding) {
    return {
      root,
      bindingPath,
      state: "unbound",
      allowed: true,
      current,
      binding: null,
      messages: ["This package has not been bound to a USB device yet."],
    };
  }
  const matches = bindingFingerprints(binding).some((fingerprint) => fingerprint.hash === current.hash);
  return {
    root,
    bindingPath,
    state: matches ? "bound" : "mismatch",
    allowed: matches,
    current,
    binding,
    messages: matches
      ? ["Device binding matches the current USB device."]
      : ["This package is bound to another USB device."],
  };
}

export function ensureDeviceBinding(usbRoot: string) {
  const root = getRoot(usbRoot);
  const status = getDeviceBindingStatus(root);
  if (status.state === "mismatch") {
    if (status.binding && canAppendCrossPlatformFingerprint(status.binding, status.current)) {
      writeDeviceBinding(status.bindingPath, appendFingerprint(status.binding, status.current, root));
      return getDeviceBindingStatus(root);
    }
    throw new Error("This ClawHermes package is bound to another USB device. Use the original bound USB device or rebuild a fresh delivery package.");
  }
  if (status.state === "bound") return status;
  const binding = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    rootAtBinding: root,
    fingerprint: status.current,
    fingerprints: [status.current],
  };
  writeDeviceBinding(status.bindingPath, binding);
  return getDeviceBindingStatus(root);
}

function writeDeviceBinding(path: string, binding: DeviceBindingRecord) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(binding, null, 2)}\n`, "utf8");
}

function readDeviceBinding(path: string) {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed?.schemaVersion !== 1 || !parsed.fingerprint?.hash) return null;
    return parsed;
  }
  catch {
    return null;
  }
}

function bindingFingerprints(binding: DeviceBindingRecord) {
  return dedupeFingerprints([binding.fingerprint, ...(binding.fingerprints ?? [])].filter(Boolean));
}

function canAppendCrossPlatformFingerprint(binding: DeviceBindingRecord, current: DeviceFingerprint) {
  if (current.source === "env") return false;
  return bindingFingerprints(binding).some((fingerprint) => fingerprint.source !== "env" && fingerprint.source !== current.source);
}

function appendFingerprint(binding: DeviceBindingRecord, current: DeviceFingerprint, root: string) {
  return {
    ...binding,
    rootAtBinding: binding.rootAtBinding || root,
    fingerprints: dedupeFingerprints([...bindingFingerprints(binding), current]),
  };
}

function dedupeFingerprints(fingerprints: DeviceFingerprint[]) {
  const seen = new Set();
  const result: DeviceFingerprint[] = [];
  for (const fingerprint of fingerprints) {
    if (!fingerprint?.hash || seen.has(fingerprint.hash)) continue;
    seen.add(fingerprint.hash);
    result.push(fingerprint);
  }
  return result;
}

function currentDeviceFingerprint(root: string) {
  const envValue = process.env[FINGERPRINT_ENV];
  if (envValue?.trim()) {
    return {
      hash: sha256(`env:${envValue.trim()}`),
      source: "env",
      summary: "Test-provided device fingerprint.",
    };
  }
  if (process.platform === "win32") {
    const windowsFingerprint = windowsDeviceFingerprint(root);
    if (windowsFingerprint) return windowsFingerprint;
  }
  const driveRoot = parse(root).root || root;
  return {
    hash: sha256(`fallback:${driveRoot.toLowerCase()}`),
    source: "fallback",
    summary: `Fallback root fingerprint for ${driveRoot}`,
  };
}

function windowsDeviceFingerprint(root: string) {
  const driveLetter = /^([A-Za-z]):/.exec(parse(root).root)?.[1];
  if (!driveLetter) return null;
  const logicalDisk: Record<string, unknown> | null = readWindowsLogicalDisk(driveLetter);
  const volumeSerialNumber = normalizeVolumeSerial(logicalDisk?.VolumeSerialNumber) ?? readVolSerial(driveLetter);
  if (!volumeSerialNumber) return null;
  const components = {
    volumeSerialNumber,
    fileSystem: normalizeString(logicalDisk?.FileSystem),
  };
  return {
    hash: sha256(`windows-volume:${stableStringify(components)}`),
    source: "windows",
    summary: `Windows volume serial fingerprint for drive ${driveLetter.toUpperCase()}:`,
  };
}

function readWindowsLogicalDisk(driveLetter: string) {
  const escapedDrive = `${driveLetter.toUpperCase()}:`.replace(/'/g, "''");
  return runPowerShellJson(`$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${escapedDrive}'" -ErrorAction Stop | Select-Object VolumeSerialNumber,FileSystem; $d | ConvertTo-Json -Depth 3`);
}

function runPowerShellJson(script: string) {
  try {
    const powershell = `${process.env.SystemRoot || "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
    const stdout = execFileSync(powershell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 2500,
    }).trim();
    return stdout ? JSON.parse(stdout) : null;
  }
  catch {
    return null;
  }
}

function readVolSerial(driveLetter: string) {
  try {
    const stdout = execFileSync("cmd.exe", ["/c", "vol", `${driveLetter}:`], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 1500,
    }).trim();
    return normalizeVolumeSerial(stdout.match(/[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}/)?.[0]);
  }
  catch {
    return null;
  }
}

function normalizeVolumeSerial(value: unknown) {
  const normalized = normalizeString(value)?.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  return normalized ? normalized : null;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function stableStringify(value: unknown) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
