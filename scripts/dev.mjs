import { spawn } from "node:child_process";

const PORT = process.env.PORT ?? "3000";
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTES = ["/", "/admin/auth", "/admin"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return true;
    } catch {
      // servidor ainda subindo
    }
    await sleep(1_000);
  }
  return false;
}

async function warmRoutes() {
  console.log("[dev] Pré-compilando rotas (evita página incompleta na 1ª visita)...");
  for (const route of ROUTES) {
    const started = Date.now();
    try {
      const res = await fetch(`${BASE}${route}`, {
        signal: AbortSignal.timeout(120_000),
      });
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[dev] ${route} -> ${res.status} (${elapsed}s)`);
    } catch (error) {
      console.warn(`[dev] ${route} falhou:`, error instanceof Error ? error.message : error);
    }
  }
  console.log("[dev] Pronto. Abra http://localhost:" + PORT);
}

const nextBin =
  process.platform === "win32"
    ? "node_modules\\next\\dist\\bin\\next"
    : "node_modules/next/dist/bin/next";

const child = spawn(process.execPath, [nextBin, "dev", "--webpack", "-p", PORT], {
  stdio: "inherit",
  env: process.env,
});

let warmed = false;

async function maybeWarm() {
  if (warmed) return;
  warmed = true;
  if (await waitForServer()) {
    await warmRoutes();
  }
}

void maybeWarm();

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
