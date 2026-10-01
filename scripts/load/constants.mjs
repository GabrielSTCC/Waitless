import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(__dirname, "..", "..");
export const LOCAL_DIR = join(__dirname, ".local");
export const CONTEXT_PATH = join(LOCAL_DIR, "context.json");
export const REPORT_PATH = join(LOCAL_DIR, "report.json");

export const COMPANY_ID = "waitless-loadtest";
export const COMPANY_NAME = "Waitless Load Test";
export const ADMIN_EMAIL = "loadtest-admin@waitless.local";
export const ADMIN_PASSWORD = "LoadTest!Admin2026";
export const SEED_CLIENT = {
  id: "loadtest-client",
  name: "Cliente Loadtest",
  whatsapp: "11988887766",
};

/** Prefixo de WhatsApp para entradas de fila (únicos por VU). */
export const QUEUE_WHATSAPP_PREFIX = "1190000";

export const DEFAULT_BASE_URL = process.env.LOADTEST_BASE_URL?.trim() || "http://127.0.0.1:3000";

export const WIDE_HOURS = {
  sun: { closed: false, start: "06:00", end: "23:00" },
  mon: { closed: false, start: "06:00", end: "23:00" },
  tue: { closed: false, start: "06:00", end: "23:00" },
  wed: { closed: false, start: "06:00", end: "23:00" },
  thu: { closed: false, start: "06:00", end: "23:00" },
  fri: { closed: false, start: "06:00", end: "23:00" },
  sat: { closed: false, start: "06:00", end: "23:00" },
};
