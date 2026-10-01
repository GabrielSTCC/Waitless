#!/usr/bin/env node
/**
 * Teste de carga: ~20 VUs por ~2 minutos.
 * Pré-requisito: npm run build && npm start (porta 3000) + credenciais Firebase.
 *
 * LOADTEST_SKIP_CLEANUP=1 — mantém empresa para inspeção
 * LOADTEST_DURATION_SEC=60 — duração
 * LOADTEST_VUS=20 — VUs
 */
import { runLoadTest } from "./runner.mjs";

const durationSec = Number(process.env.LOADTEST_DURATION_SEC ?? "120");
const vus = Number(process.env.LOADTEST_VUS ?? "20");
const skipCleanup = process.env.LOADTEST_SKIP_CLEANUP === "1";

runLoadTest({
  mode: "load",
  vus,
  durationSec,
  skipCleanup,
})
  .then((report) => {
    const last = report.steps[report.steps.length - 1];
    console.log("\n=== RESUMO CARGA ===");
    console.log(
      `RPS=${last?.rps} p50=${last?.p50?.toFixed?.(0)} p95=${last?.p95?.toFixed?.(0)} p99=${last?.p99?.toFixed?.(0)} err=${((last?.errorRate ?? 0) * 100).toFixed(2)}%`,
    );
    console.log(
      `Writes p95=${last?.write?.p95?.toFixed?.(0)} duplicatas de horário=${last?.duplicateSlots?.length ?? 0}`,
    );
    console.log(`Docs: ${JSON.stringify(report.integrity?.docs)}`);
    process.exit(report.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
