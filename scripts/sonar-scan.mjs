#!/usr/bin/env node
/**
 * Espera o SonarQube local, garante senha e token do admin,
 * roda o scanner e grava um resumo das issues em .sonar/issues.json.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sonarDir = join(root, ".sonar");
const host = process.env.SONAR_HOST_URL ?? "http://127.0.0.1:9000";
const tokenName = "waitless-local";

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

async function waitUntilUp() {
  const started = Date.now();
  while (Date.now() - started < 8 * 60_000) {
    try {
      const res = await fetch(`${host}/api/system/status`, { signal: AbortSignal.timeout(5_000) });
      const body = await res.json();
      console.log(`SonarQube status: ${body.status}`);
      if (body.status === "UP") return;
    } catch {
      console.log("SonarQube ainda não responde...");
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error("SonarQube não ficou UP em 8 minutos.");
}

async function sonarForm(path, auth, fields) {
  const body = new URLSearchParams(fields);
  const res = await fetch(`${host}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

mkdirSync(sonarDir, { recursive: true });
await waitUntilUp();

const adminPath = join(sonarDir, "admin.env");
let { password } = readEnvFile(adminPath);
if (!password) {
  password = `Wl${randomBytes(12).toString("base64url")}`;
  const changed = await sonarForm("/api/users/change_password", "admin:admin", {
    login: "admin",
    previousPassword: "admin",
    password,
  });
  if (!changed.ok) {
    throw new Error(`Não foi possível trocar a senha admin (${changed.status}): ${changed.text}`);
  }
  writeFileSync(adminPath, `password=${password}\n`, { mode: 0o600 });
  console.log(`Senha admin salva em ${adminPath}`);
}

const auth = `admin:${password}`;
let token = readEnvFile(join(sonarDir, "token.env")).token;
if (!token) {
  let generated = await sonarForm("/api/user_tokens/generate", auth, { name: tokenName });
  if (!generated.ok && generated.status === 400) {
    await sonarForm("/api/user_tokens/revoke", auth, { name: tokenName });
    generated = await sonarForm("/api/user_tokens/generate", auth, { name: tokenName });
  }
  if (!generated.ok) {
    throw new Error(`Token não gerado (${generated.status}): ${generated.text}`);
  }
  token = JSON.parse(generated.text).token;
  writeFileSync(join(sonarDir, "token.env"), `token=${token}\n`, { mode: 0o600 });
}

if (process.env.SONAR_COLLECT_ONLY !== "1") {
await new Promise((resolve, reject) => {
  const child = spawn(
    "npx",
    ["--yes", "@sonar/scan", `-Dsonar.host.url=${host}`, `-Dsonar.token=${token}`],
    { cwd: root, stdio: "inherit" },
  );
  child.on("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`scanner saiu com código ${code}`));
  });
});
}

const basic = Buffer.from(auth).toString("base64");
const ceStarted = Date.now();
while (Date.now() - ceStarted < 5 * 60_000) {
  const pending = await fetch(
    `${host}/api/ce/activity?component=waitless&status=PENDING,IN_PROGRESS&ps=1`,
    { headers: { Authorization: `Basic ${basic}` } },
  );
  if (!pending.ok) throw new Error(`Fila do Sonar falhou: ${pending.status}`);
  const activity = await pending.json();
  const running = activity.tasks?.length ?? 0;
  if (running === 0) break;
  console.log("Aguardando o SonarQube processar o relatório...");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
}

const issues = [];
let page = 1;
for (;;) {
  const url = new URL(`${host}/api/issues/search`);
  url.searchParams.set("componentKeys", "waitless");
  url.searchParams.set("resolved", "false");
  url.searchParams.set("ps", "100");
  url.searchParams.set("p", String(page));
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`Busca de issues falhou: ${res.status}`);
  const data = await res.json();
  for (const issue of data.issues ?? []) {
    issues.push({
      type: issue.type,
      severity: issue.severity,
      rule: issue.rule,
      component: issue.component,
      line: issue.line ?? null,
      message: issue.message,
    });
  }
  const total = data.total ?? issues.length;
  if (issues.length >= total || (data.issues ?? []).length === 0) break;
  page += 1;
}

const summary = { total: issues.length, bugs: 0, vulnerabilities: 0, codeSmells: 0 };
for (const issue of issues) {
  if (issue.type === "BUG") summary.bugs += 1;
  else if (issue.type === "VULNERABILITY") summary.vulnerabilities += 1;
  else summary.codeSmells += 1;
}

const report = { host, project: "waitless", at: new Date().toISOString(), summary, issues };
writeFileSync(join(sonarDir, "issues.json"), JSON.stringify(report, null, 2));
console.log(
  `Sonar: ${summary.total} issues (${summary.bugs} bugs, ${summary.vulnerabilities} vulnerabilidades, ${summary.codeSmells} code smells)`,
);
