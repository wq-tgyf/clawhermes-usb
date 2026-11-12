import { expandCommandTemplate } from "./command-template";
import { resolveRelative } from "./portable";
import type { AdapterDescriptor, ServiceEnvironment } from "./types";
import { wslDiagnostics } from "./wsl";

export function wslAdapterSetupPlan(root: string, adapter: AdapterDescriptor, serviceEnv: ServiceEnvironment) {
  return wslAdapterCommandPlan(root, adapter, serviceEnv, "setup");
}

export function wslAdapterCommandPlan(root: string, adapter: AdapterDescriptor, serviceEnv: ServiceEnvironment, phase: string) {
  const distro = adapter.runtime?.distro;
  const diagnostics = wslDiagnostics(root, distro);
  const workingDirectory = windowsPathToWslPath(resolveRelative(root, adapter.appDir!));
  const commandTemplate = adapter.commands![phase] as string | undefined;
  if (!commandTemplate) throw new Error(`Adapter ${adapter.id} does not declare a ${phase} command.`);
  const command = expandCommandTemplate(commandTemplate, serviceEnv.env);
  const script = [
    ensureWslDriveMount(workingDirectory),
    `cd ${shellQuote(workingDirectory)}`,
    ...environmentExports(root, serviceEnv.env),
    command,
  ].join(" && ");
  return {
    executablePath: diagnostics.executablePath ?? "wsl.exe",
    workingDirectory,
    args: [...distroArgs(distro), "--cd", "/", "--", "bash", "-lc", script],
    script,
    diagnostics,
  };
}

export function assertWslReadyForAdapter(root: string, serviceId: string) {
  const diagnostics = wslDiagnostics(root);
  if (!diagnostics.found || !diagnostics.hasWsl2Distro) {
    throw new Error(`WSL2 is not ready for ${serviceId}: ${diagnostics.messages.join(" ")}`);
  }
}

export function assertWslReadyForAdapterDistro(root: string, serviceId: string, distro?: string) {
  const diagnostics = wslDiagnostics(root, distro);
  const distroReady = distro ? diagnostics.hasDesiredDistro && diagnostics.desiredDistroVersion === 2 : diagnostics.hasWsl2Distro;
  if (!diagnostics.found || !distroReady) {
    throw new Error(`WSL2 is not ready for ${serviceId}: ${diagnostics.messages.join(" ")}`);
  }
}

function distroArgs(distro: string | undefined) {
  const trimmed = distro?.trim();
  return trimmed ? ["--distribution", trimmed] : [];
}

function environmentExports(root: string, env: Record<string, string>) {
  return Object.entries(env)
    .filter(([name]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    .filter(([name]) => !["PATH", "PATHEXT", "COMSPEC", "PSMODULEPATH"].includes(name.toUpperCase()))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `export ${name}=${shellQuote(convertEnvValue(root, value))}`);
}

function convertEnvValue(root: string, value: string) {
  if (isWindowsAbsolutePath(value)) return windowsPathToWslPath(value);
  const normalizedRoot = root.toLowerCase();
  if (value.toLowerCase().startsWith(normalizedRoot)) return windowsPathToWslPath(value);
  return value;
}

export function windowsPathToWslPath(path: string) {
  const match = path.match(/^([A-Za-z]):[\\/]*(.*)$/);
  if (!match) throw new Error(`Cannot convert Windows path to WSL path: ${path}`);
  const drive = match[1].toLowerCase();
  const rest = match[2].replaceAll("\\", "/").replace(/^\/+/, "");
  return `/mnt/${drive}/${rest}`;
}

function ensureWslDriveMount(wslPath: string) {
  const match = wslPath.match(/^\/mnt\/([a-z])(?:\/|$)/i);
  if (!match) return "true";
  const drive = match[1].toLowerCase();
  const mountPoint = `/mnt/${drive}`;
  const driveSpec = `${drive.toUpperCase()}:`;
  return `mountpoint -q ${shellQuote(mountPoint)} || (mkdir -p ${shellQuote(mountPoint)} && mount -t drvfs ${shellQuote(driveSpec)} ${shellQuote(mountPoint)})`;
}

function isWindowsAbsolutePath(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value);
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}
