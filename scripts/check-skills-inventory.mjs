import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SKILLS_ROOT = join(ROOT, "skills");
const SUPPORT_DIRS = new Set(["references", "scripts"]);
const errors = [];
const fail = (message) => errors.push(message);
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function nestedSkillFiles(skillDir) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.name === "SKILL.md") {
        found.push(absolute);
      }
    }
  };
  for (const entry of readdirSync(skillDir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(join(skillDir, entry.name));
  }
  return found;
}

if (!existsSync(SKILLS_ROOT)) {
  console.error("未找到 skills/ 目录。");
  process.exit(1);
}

const entries = readdirSync(SKILLS_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory());
const skills = [];
for (const entry of entries) {
  const dir = join(SKILLS_ROOT, entry.name);
  const skillFile = join(dir, "SKILL.md");
  if (!existsSync(skillFile) || !statSync(skillFile).isFile()) {
    if (!SUPPORT_DIRS.has(entry.name)) {
      fail(`skills/${entry.name} 缺少 SKILL.md`);
    }
    continue;
  }
  if (readFileSync(skillFile, "utf8").trim() === "") {
    fail(`skills/${entry.name}/SKILL.md 为空`);
  }
  for (const nested of nestedSkillFiles(dir)) {
    fail(`skills/${entry.name} 内存在嵌套技能文件: ${nested.slice(ROOT.length + 1)}`);
  }
  skills.push(entry.name);
}

let withOrigin = 0;
let withLicense = 0;
for (const name of skills) {
  const dir = join(SKILLS_ROOT, name);
  const originPath = join(dir, ".clawhub", "origin.json");
  if (existsSync(originPath)) {
    withOrigin += 1;
    try {
      const origin = readJson(originPath);
      if (origin.version !== 1) fail(`skills/${name}/.clawhub/origin.json 的 version 应为 1`);
      for (const field of ["registry", "slug", "installedVersion"]) {
        if (!isNonEmptyString(origin[field])) {
          fail(`skills/${name}/.clawhub/origin.json 缺少 ${field}`);
        }
      }
    } catch (error) {
      fail(`skills/${name}/.clawhub/origin.json 无法解析: ${error.message}`);
    }
  }
  const metaPath = join(dir, "_meta.json");
  if (existsSync(metaPath)) {
    try {
      if (!isNonEmptyString(readJson(metaPath).slug)) {
        fail(`skills/${name}/_meta.json 缺少 slug`);
      }
    } catch (error) {
      fail(`skills/${name}/_meta.json 无法解析: ${error.message}`);
    }
  }
  if (readdirSync(dir).some((file) => /^licen[cs]e(\.|$)/i.test(file))) {
    withLicense += 1;
  }
}

if (errors.length > 0) {
  console.error(`技能清单检查发现 ${errors.length} 个问题：`);
  for (const message of errors) {
    console.error(`  ${message}`);
  }
  process.exit(1);
}

console.log(
  `技能清单检查通过（技能 ${skills.length} 个，来源元数据 ${withOrigin} 个，随包许可证 ${withLicense} 个）。`,
);
if (withLicense < skills.length) {
  console.log("许可证现状见 THIRD_PARTY_NOTICES.md；未随包许可证的技能需在交付前确认上游授权。");
}
