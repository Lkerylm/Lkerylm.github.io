/**
 * Firefly 后端 - 极简 .env 读取（零依赖）
 *
 * 在项目根目录放一个 .env，就能配置 SMTP / 端口 / 数据库路径等；
 * 已经存在的环境变量优先，不会被文件覆盖（方便临时用命令行覆盖）。
 */
import fs from "node:fs";
import path from "node:path";

export const ROOT_DIR = path.resolve(import.meta.dirname, "..");
export const ENV_FILE = process.env.FIREFLY_ENV_FILE || path.join(ROOT_DIR, ".env");

export function loadEnv(file = ENV_FILE) {
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return; // 没有 .env 很正常
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;

    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, "\n");

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();
