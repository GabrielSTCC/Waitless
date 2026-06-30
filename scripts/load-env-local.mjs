import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Carrega .env.local no process.env (sem sobrescrever variáveis já definidas). */
export function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return false;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return true;
}

export function upsertEnvLocal(key, value) {
  const envPath = join(root, ".env.local");
  const line = `${key}=${value}`;
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    const trimmed = content.trimEnd();
    content = trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
  }
  writeFileSync(envPath, content);
}
