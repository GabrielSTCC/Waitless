#!/usr/bin/env node
/**
 * Runner de carga/estresse — pool de fetch sem dependências novas.
 */
import { writeFileSync } from "node:fs";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  COMPANY_ID,
  DEFAULT_BASE_URL,
  REPORT_PATH,
} from "./constants.mjs";
import { cleanupLoadtestCompany } from "./cleanup.mjs";
import {
  ensureLocalDir,
  getFirebaseAdmin,
  readContext,
  requireFirebaseWebConfig,
  writeContext,
} from "./firebase.mjs";
import { createMetrics } from "./metrics.mjs";
import { createScenarioHelpers } from "./scenarios.mjs";
import { seedLoadtestCompany } from "./seed.mjs";

async function waitForServer(baseUrl, maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(5_000) });
      if (res.status > 0) return true;
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function signInIdToken(email, password) {
  const { apiKey } = requireFirebaseWebConfig();
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  const url = authEmulator
    ? `http://${authEmulator}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`
    : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.idToken) {
    throw new Error(
      `Login Firebase falhou: ${data.error?.message ?? res.status}`,
    );
  }
  return data.idToken;
}

function createHttp(baseUrl, metrics, { idToken, vuId }) {
  return {
    idToken,
    vuId,
    async fetch(path, init = {}) {
      const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
      return fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(30_000),
      });
    },
    record(sample) {
      metrics.record(sample);
    },
  };
}

async function runVirtualUser({
  baseUrl,
  metrics,
  scenarios,
  idToken,
  vuId,
  durationMs,
  stopFlag,
}) {
  const http = createHttp(baseUrl, metrics, { idToken, vuId });
  const endAt = Date.now() + durationMs;
  while (Date.now() < endAt && !stopFlag.stopped) {
    await scenarios.runMixed(http);
  }
}

async function countDocs(db) {
  const [appointments, queue, clients, publicQueue] = await Promise.all([
    db.collection(`companies/${COMPANY_ID}/appointments`).count().get(),
    db.collection(`companies/${COMPANY_ID}/queue`).count().get(),
    db.collection(`companies/${COMPANY_ID}/clients`).count().get(),
    db
      .collection("publicQueue")
      .where("companyId", "==", COMPANY_ID)
      .count()
      .get(),
  ]);
  return {
    appointments: appointments.data().count,
    queue: queue.data().count,
    clients: clients.data().count,
    publicQueue: publicQueue.data().count,
  };
}

/**
 * @param {{ mode: 'load'|'stress', vus?: number, durationSec?: number, steps?: number[], stepDurationSec?: number, baseUrl?: string, skipSeed?: boolean, skipCleanup?: boolean }} opts
 */
export async function runLoadTest(opts) {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const skipSeed = opts.skipSeed === true;
  const skipCleanup = opts.skipCleanup === true;

  console.log(`[${opts.mode}] Aguardando servidor em ${baseUrl}...`);
  const up = await waitForServer(baseUrl);
  if (!up) {
    throw new Error(
      `Servidor não respondeu em ${baseUrl}. Rode: npm run build && npm start`,
    );
  }

  let ctx;
  if (!skipSeed) {
    ctx = await seedLoadtestCompany();
  } else {
    ctx = readContext();
  }

  console.log(`[${opts.mode}] Autenticando admin...`);
  let idToken = await signInIdToken(
    ctx.adminEmail ?? ADMIN_EMAIL,
    ctx.adminPassword ?? ADMIN_PASSWORD,
  );

  const scenarios = createScenarioHelpers(ctx);
  const { db } = await getFirebaseAdmin();

  const steps =
    opts.mode === "stress"
      ? (opts.steps ?? [20, 50, 100, 200])
      : [opts.vus ?? 20];
  const stepDurationSec =
    opts.mode === "stress"
      ? (opts.stepDurationSec ?? 45)
      : (opts.durationSec ?? 120);

  const report = {
    mode: opts.mode,
    baseUrl,
    startedAt: new Date().toISOString(),
    steps: [],
    integrity: null,
  };

  try {
    for (const vus of steps) {
      console.log(`[${opts.mode}] Degrau: ${vus} VUs por ${stepDurationSec}s`);
      const metrics = createMetrics();
      const stopFlag = { stopped: false };
      const started = Date.now();

      try {
        idToken = await signInIdToken(
          ctx.adminEmail ?? ADMIN_EMAIL,
          ctx.adminPassword ?? ADMIN_PASSWORD,
        );
      } catch (error) {
        console.warn(`[${opts.mode}] refresh token: ${error.message}`);
      }

      const workers = Array.from({ length: vus }, (_, i) =>
        runVirtualUser({
          baseUrl,
          metrics,
          scenarios,
          idToken,
          vuId: i + 1,
          durationMs: stepDurationSec * 1000,
          stopFlag,
        }),
      );

      await Promise.all(workers);
      const elapsedMs = Date.now() - started;
      const summary = metrics.summarize();
      const rps = summary.totalRequests / (elapsedMs / 1000);

      const stepReport = {
        vus,
        durationSec: stepDurationSec,
        elapsedMs,
        rps: Number(rps.toFixed(2)),
        ...summary,
      };
      report.steps.push(stepReport);

      console.log(
        `[${opts.mode}] VUs=${vus} RPS=${stepReport.rps} p95=${summary.p95.toFixed(0)}ms writeP95=${summary.write.p95.toFixed(0)}ms err=${(summary.errorRate * 100).toFixed(2)}% dupSlots=${summary.duplicateSlots.length}`,
      );

      if (opts.mode === "stress") {
        const tooManyErrors = summary.errorRate > 0.05;
        const writeTooSlow = summary.write.p95 > 5000;
        if (tooManyErrors || writeTooSlow) {
          console.log(
            `[${opts.mode}] Parando: ${tooManyErrors ? "taxa de erro > 5%" : "write p95 > 5s"}`,
          );
          stepReport.stoppedReason = tooManyErrors ? "error_rate" : "write_p95";
          break;
        }
      }
    }

    report.integrity = {
      docs: await countDocs(db),
      duplicateSlots: report.steps.flatMap((s) => s.duplicateSlots ?? []),
    };
    report.finishedAt = new Date().toISOString();
    report.ok = report.steps.every((s) => (s.errorRate ?? 1) <= 0.05);

    ensureLocalDir();
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    writeContext({ ...ctx, lastReportAt: report.finishedAt, mode: opts.mode });

    console.log(`[${opts.mode}] Relatório: ${REPORT_PATH}`);
    return report;
  } finally {
    if (!skipCleanup) {
      try {
        await cleanupLoadtestCompany({ deleteAuthUser: true });
      } catch (error) {
        console.warn(`[cleanup] ${error.message ?? error}`);
      }
    }
  }
}
