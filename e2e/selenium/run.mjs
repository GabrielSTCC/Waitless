#!/usr/bin/env node
/**
 * Suíte Selenium (Chrome via Selenium Grid local) contra o Waitless local.
 * Observa o estado semeado da Barbearia Atlas — não clica em Iniciar.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const results = [];

function readCredentials() {
  const path = join(root, "docs/gtm/media/.demo-credentials.local");
  if (!existsSync(path)) {
    throw new Error(`Credenciais demo ausentes: ${path}`);
  }
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  if (!out.email || !out.password) {
    throw new Error("Arquivo de credenciais sem email/password.");
  }
  return out;
}

function firstWaitingLink() {
  const path = join(root, "docs/gtm/media/demo-queue-links.txt");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const parts = line.split("\t");
    if (parts[0] === "waiting" && parts[2]?.startsWith("http")) {
      const url = new URL(parts[2].trim());
      return `${BASE}${url.pathname}`;
    }
  }
  return null;
}

function runNode(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} saiu com código ${code}`));
    });
  });
}

async function waitForHttp(url, maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4_000) });
      if (res.ok || res.status < 500) return;
    } catch {
      // ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Servidor não respondeu em ${url}`);
}

async function ensureDevServer() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(3_000) });
    if (res.status < 500) return;
  } catch {
    // sobe o dev server
  }
  console.log("Subindo npm run dev...");
  const child = spawn("npm", ["run", "dev"], {
    cwd: root,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  await waitForHttp(BASE);
}

async function bodyText(driver) {
  return driver.findElement(By.css("body")).getText();
}

async function scenario(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, error: message.split("\n")[0] });
    console.error(`FAIL  ${name}: ${message.split("\n")[0]}`);
  }
}

const credentials = readCredentials();
await ensureDevServer();
await runNode(join(root, "scripts/seed-demo-atlas.mjs"), {
  DEMO_ATLAS_EMAIL: credentials.email,
  DEMO_ATLAS_PASSWORD: credentials.password,
});
await runNode(join(root, "e2e/selenium/enable-appointments.mjs"));

const remote = process.env.SELENIUM_REMOTE_URL ?? "http://127.0.0.1:4444";
await waitForHttp(`${remote}/status`, 180_000);
const options = new chrome.Options();
options.addArguments("--window-size=1280,900", "--disable-dev-shm-usage", "--no-sandbox");
const driver = await new Builder()
  .forBrowser("chrome")
  .usingServer(remote)
  .setChromeOptions(options)
  .build();
await driver.manage().setTimeouts({ implicit: 0, pageLoad: 60_000 });

try {
  await scenario("landing /", async () => {
    await driver.get(`${BASE}/`);
    await driver.wait(until.titleMatches(/Waitless/i), 20_000);
    const text = await bodyText(driver);
    if (/application error|internal server error/i.test(text)) {
      throw new Error("Página de erro no lugar da landing");
    }
  });

  await scenario("página salão", async () => {
    await driver.get(`${BASE}/fila-de-espera-salao`);
    await driver.wait(until.titleMatches(/Waitless/i), 20_000);
    const text = await bodyText(driver);
    if (/application error|internal server error/i.test(text)) {
      throw new Error("Página de erro na landing de salão");
    }
  });

  await scenario("cliente /q", async () => {
    const link = firstWaitingLink();
    if (!link) throw new Error("demo-queue-links.txt sem cliente waiting");
    await driver.get(link);
    await driver.wait(async () => {
      const text = (await bodyText(driver)).toLowerCase();
      return text.includes("barbearia atlas") && text.includes("posição");
    }, 25_000);
  });

  await scenario("login admin", async () => {
    await driver.get(`${BASE}/admin/auth`);
    const email = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 20_000);
    await email.clear();
    await email.sendKeys(credentials.email);
    const password = await driver.findElement(By.css('input[type="password"]'));
    await password.clear();
    await password.sendKeys(credentials.password);
    const buttons = await driver.findElements(By.css("button"));
    let submit = null;
    for (const button of buttons) {
      const label = (await button.getText()).trim();
      if (label === "Entrar") submit = button;
    }
    if (!submit) throw new Error("Botão Entrar não encontrado");
    await submit.click();
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return url.includes("/admin") && !url.includes("/admin/auth");
    }, 30_000);
  });

  await scenario("painel da fila", async () => {
    await driver.wait(async () => {
      const text = await bodyText(driver);
      return text.includes("Fila de Hoje") && text.includes("Ana Demo") && text.includes("Bruno Teste");
    }, 25_000);
  });

  await scenario("admin agendamentos", async () => {
    const links = await driver.findElements(By.css("a"));
    let appointments = null;
    for (const link of links) {
      if ((await link.getText()).trim() === "Agendamentos") appointments = link;
    }
    if (!appointments) throw new Error("Link Agendamentos não encontrado");
    await appointments.click();
    await driver.wait(async () => (await bodyText(driver)).includes("Agendamentos"), 25_000);
    const url = await driver.getCurrentUrl();
    if (url.includes("/admin/auth")) throw new Error("Sessão não foi mantida");
  });

  await scenario("agendar público", async () => {
    await driver.get(`${BASE}/agendar/barbearia-atlas`);
    const hasSlot = async () => {
      const buttons = await driver.findElements(By.css("button"));
      for (const button of buttons) {
        if (/^\d{2}:\d{2}$/.test((await button.getText()).trim())) return true;
      }
      return false;
    };
    await driver.wait(async () => {
      const text = await bodyText(driver);
      if (/não aceita agendamento|não foi possível/i.test(text)) {
        throw new Error(text.replace(/\s+/g, " ").slice(0, 240));
      }
      return /carregando horários|nenhum horário|\d{2}:\d{2}/i.test(text);
    }, 25_000);
    if (await hasSlot()) return;
    const nextDate = await driver.executeScript(`
      const probe = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(probe);
    `);
    const dateInput = await driver.findElement(By.css('input[type="date"]'));
    await driver.executeScript(
      `const el = arguments[0];
       const proto = Object.getPrototypeOf(el);
       Object.getOwnPropertyDescriptor(proto, "value").set.call(el, arguments[1]);
       el.dispatchEvent(new Event("input", { bubbles: true }));
       el.dispatchEvent(new Event("change", { bubbles: true }));`,
      dateInput,
      nextDate,
    );
    await driver.wait(hasSlot, 20_000);
  });
} finally {
  await driver.quit();
}

const reportDir = join(root, ".sonar");
mkdirSync(reportDir, { recursive: true });
const reportPath = join(root, "e2e/selenium/last-report.json");
writeFileSync(reportPath, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));

const failed = results.filter((item) => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} cenários passaram`);
if (failed.length > 0) process.exitCode = 1;
