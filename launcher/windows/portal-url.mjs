import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
let url = "http://127.0.0.1:17000/";
try {
  const state = JSON.parse(readFileSync(join(root, "data", "tmp", "ports.json"), "utf8"));
  if (typeof state?.portal?.url === "string" && state.portal.url) {
    url = state.portal.url;
  }
} catch {
  // ports.json 尚未生成时回退到默认地址。
}
process.stdout.write(url);
