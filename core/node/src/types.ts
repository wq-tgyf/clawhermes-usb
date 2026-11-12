export interface PlatformProbe {
  platform?: string;
  arch?: string;
}

export interface PlatformInfo {
  id: "windows" | "darwin" | "linux";
  nodePlatform: string;
  arch: "arm64" | "x64";
  runtimeKey: string;
  pathSeparator: string;
  executableSuffix: string;
}

export interface AdapterHealthDescriptor {
  type?: string;
  url?: string;
  timeoutSeconds?: number;
}

export interface AdapterCommands {
  setup?: string;
  start?: string;
  stop?: string;
  [key: string]: unknown;
}

export interface AdapterEnvDescriptor {
  files?: string[];
  variables?: Record<string, string>;
  [key: string]: unknown;
}

export interface AdapterRuntimeDescriptor {
  kind?: string;
  distro?: string;
  sourceDistro?: string;
  requiredExecutable?: string;
  versionRequirement?: string;
  [key: string]: unknown;
}

export interface AdapterIntegrationDescriptor {
  status?: string;
  productionReady?: boolean;
  verifiedAt?: string;
  summary?: string;
  sources?: string[];
  platform?: string | null;
  strategy?: string | null;
  [key: string]: unknown;
}

export interface AdapterUpstreamDescriptor {
  repositoryUrl?: string;
  checkoutRef?: string;
  installDocs?: string;
  [key: string]: unknown;
}

export interface AdapterPortalDescriptor {
  url?: string;
  [key: string]: unknown;
}

export interface AdapterDescriptor {
  id?: string;
  displayName?: string;
  enabled?: boolean;
  type?: string;
  appDir?: string;
  dataDir?: string;
  logFile?: string;
  pidFile?: string;
  commands?: AdapterCommands;
  env?: AdapterEnvDescriptor;
  health?: AdapterHealthDescriptor;
  integration?: AdapterIntegrationDescriptor;
  runtime?: AdapterRuntimeDescriptor;
  upstream?: AdapterUpstreamDescriptor;
  portal?: AdapterPortalDescriptor;
  dependsOn?: string[];
  platformOverrides?: Record<string, Partial<AdapterDescriptor>>;
  [key: string]: unknown;
}

export interface AdapterHealth {
  type: string;
  ready: boolean;
  reason: string;
  url?: string | null;
  statusCode?: number | null;
}

export interface EnvFileDiagnostic {
  serviceId: string;
  path: string;
  exists: boolean;
  examplePath: string;
  exampleExists: boolean;
}

export interface EnvironmentFileState {
  path: string;
  exists: boolean;
  loaded?: boolean;
  variables?: string[];
  errors?: string[];
}

export interface ServiceEnvironment {
  root: string;
  serviceId: string;
  env: Record<string, string>;
  files: EnvironmentFileState[];
  messages: string[];
}

export interface RuntimePortAssignment {
  serviceId: string;
  host: string;
  defaultPort: number;
  assignedPort: number;
  changed: boolean;
}

export interface RuntimePortalAssignment {
  host: string;
  defaultPort: number;
  assignedPort: number;
  changed: boolean;
  url: string;
}

export interface RuntimePortState {
  root: string;
  generatedAt: string;
  portal: RuntimePortalAssignment;
  services: RuntimePortAssignment[];
}

export interface WslDistribution {
  name: string;
  state: string | null;
  version: number | null;
  default: boolean;
}

export interface WslDiagnostics {
  root: string;
  executablePath: string | null;
  found: boolean;
  statusSucceeded: boolean;
  statusText: string | null;
  listSucceeded: boolean;
  listText: string | null;
  distros: WslDistribution[];
  defaultDistro: string | null;
  hasWsl2Distro: boolean;
  desiredDistro: string | null;
  hasDesiredDistro: boolean;
  desiredDistroVersion: number | null;
  messages: string[];
}

export interface SetupAction {
  id: string;
  category: string;
  severity: string;
  title: string;
  detail: string;
  command?: string;
  path?: string;
  docs?: string;
  serviceId?: string;
}

export interface IntegrationReadiness {
  id: string;
  status: string;
  productionReady: boolean;
  verifiedAt: string | null;
  summary: string;
  sources: string[];
  platform: string | null;
  strategy: string | null;
}

export interface ServiceStatusEntry {
  id: string;
  displayName: string;
  status: string;
  pidFile?: string;
  logFile: string;
  portalUrl?: string | null;
  processId?: number | null;
  placeholder?: boolean | null;
  health: { type: string; ready: boolean; reason: string };
}
