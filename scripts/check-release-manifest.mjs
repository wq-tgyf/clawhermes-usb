import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

const manifestPath = join(ROOT, "release-manifest.json");
if (!existsSync(manifestPath)) {
  console.error("未找到 release-manifest.json。");
  process.exit(1);
}

const manifest = readJson(manifestPath);

if (manifest.schemaVersion !== 1) {
  fail(`schemaVersion 应为 1，实际为 ${JSON.stringify(manifest.schemaVersion)}`);
}
if (!isNonEmptyString(manifest.profile)) {
  fail("profile 缺失");
}
if (Number.isNaN(Date.parse(manifest.generatedAt))) {
  fail("generatedAt 不是合法时间戳");
}

const entryPoints = manifest.entryPoints ?? {};
for (const platform of ["windows", "macos"]) {
  if (!isNonEmptyString(entryPoints[platform])) {
    fail(`entryPoints.${platform} 缺失`);
  }
}
if (manifest.entryPoint !== entryPoints.windows) {
  fail("entryPoint 应与 entryPoints.windows 一致");
}

const sharedPayloads = Array.isArray(manifest.sharedPayloads) ? manifest.sharedPayloads : [];
for (const name of ["core", "adapters", "config", "portal", "skills"]) {
  if (!sharedPayloads.includes(name)) {
    fail(`sharedPayloads 缺少 ${name}`);
  }
}

for (const platform of ["windows", "macos"]) {
  const items = manifest.platformPayloads?.[platform];
  if (!Array.isArray(items) || items.length === 0) {
    fail(`platformPayloads.${platform} 应为非空数组`);
  }
}

const copiedPaths = manifest.copiedPaths;
if (!Array.isArray(copiedPaths) || copiedPaths.length === 0) {
  fail("copiedPaths 应为非空数组");
} else {
  const seen = new Set();
  for (const entry of copiedPaths) {
    for (const key of ["path", "source", "target"]) {
      if (!isNonEmptyString(entry?.[key])) {
        fail(`copiedPaths 条目缺少 ${key}`);
      }
    }
    const path = entry?.path;
    if (isNonEmptyString(path)) {
      if (seen.has(path)) {
        fail(`copiedPaths 存在重复 path: ${path}`);
      }
      seen.add(path);
    }
  }
}

const adaptersDir = join(ROOT, "adapters");
const adapterIds = existsSync(adaptersDir)
  ? readdirSync(adaptersDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(adaptersDir, entry.name, "adapter.json"))
      .filter((file) => existsSync(file))
      .map((file) => readJson(file).id)
  : [];

for (const id of adapterIds) {
  if (!isNonEmptyString(id)) {
    fail("adapters 目录存在缺少 id 的描述符");
  }
}
if (new Set(adapterIds).size !== adapterIds.length) {
  fail("adapters 目录存在重复 id");
}

const appPayloads = Array.isArray(manifest.appPayloads) ? manifest.appPayloads : [];
if (appPayloads.length === 0) {
  fail("appPayloads 应为非空数组");
}
const payloadIds = appPayloads.map((entry) => entry?.serviceId);
if (new Set(payloadIds).size !== payloadIds.length) {
  fail("appPayloads 存在重复 serviceId");
}
for (const id of adapterIds) {
  if (!payloadIds.includes(id)) {
    fail(`appPayloads 缺少适配器: ${id}`);
  }
}
for (const id of payloadIds) {
  if (!adapterIds.includes(id)) {
    fail(`appPayloads 引用了不存在的适配器: ${id}`);
  }
}

const skillsDir = join(ROOT, "skills");
const skillCount = existsSync(skillsDir)
  ? readdirSync(skillsDir, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory() && existsSync(join(skillsDir, entry.name, "SKILL.md")),
    ).length
  : 0;
const declaredSkillCount = manifest.skillsPayload?.skillCount;
if (typeof declaredSkillCount !== "number") {
  fail("skillsPayload.skillCount 缺失");
} else if (declaredSkillCount !== skillCount) {
  fail(`skillsPayload.skillCount=${declaredSkillCount}，实际技能目录 ${skillCount} 个`);
}

const bindingFile = manifest.deviceBindingPolicy?.bindingFile;
if (!isNonEmptyString(bindingFile)) {
  fail("deviceBindingPolicy.bindingFile 缺失");
} else if (!bindingFile.replaceAll("\\", "/").startsWith("data/")) {
  fail("deviceBindingPolicy.bindingFile 必须位于 data/ 下");
}

if (errors.length > 0) {
  console.error(`发布清单检查发现 ${errors.length} 个问题：`);
  for (const message of errors) {
    console.error(`  ${message}`);
  }
  process.exit(1);
}

console.log(`发布清单检查通过（适配器 ${adapterIds.length} 个，技能 ${skillCount} 个）。`);
