import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const MD_EXT = /\.mdx?$/i;
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const SKIP_PREFIX = ["http://", "https://", "mailto:", "tel:", "#"];

function trackedMarkdownFiles() {
  const output = execFileSync("git", ["ls-files", "*.md", "*.mdx"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith("skills/") && !file.startsWith("node_modules/"));
}

function stripCodeFences(content) {
  return content.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

function relativeLinks(content) {
  const links = [];
  let match;
  while ((match = LINK_RE.exec(content)) !== null) {
    const raw = match[1];
    if (SKIP_PREFIX.some((prefix) => raw.startsWith(prefix))) continue;
    links.push(raw.split("#")[0].split("?")[0]);
  }
  return links.filter(Boolean);
}

const failures = [];

for (const file of trackedMarkdownFiles()) {
  const absolute = join(ROOT, file);
  if (!existsSync(absolute)) continue;
  const content = stripCodeFences(readFileSync(absolute, "utf8"));
  for (const link of relativeLinks(content)) {
    const target = link.startsWith("/") ? resolve(ROOT, "." + link) : resolve(dirname(absolute), link);
    if (!existsSync(target)) {
      failures.push({ file, link });
    } else if (statSync(target).isDirectory() && !existsSync(join(target, "README.md"))) {
      // 目录链接本身可接受，只要目录存在。
    }
  }
}

if (failures.length > 0) {
  console.error(`发现 ${failures.length} 个失效的相对链接：`);
  for (const { file, link } of failures) {
    console.error(`  ${file} -> ${link}`);
  }
  process.exit(1);
}

console.log("文档相对链接检查通过。");
