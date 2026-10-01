#!/usr/bin/env node
/**
 * Teste de estresse: degraus 20 → 50 → 100 → 200.
 * Para se erro > 5% ou write p95 > 5s.
 *
 * LOADTEST_SKIP_CLEANUP=1 — mantém empresa
 * LOADTEST_STEP_SEC=45 — duração por degrau
 */
import { runLoadTest } from "./runner.mjs";

const stepDurationSec = Number(process.env.LOADTEST_STEP_SEC ?? "45");
const skipCleanup = process.env.LOADTEST_SKIP_CLEANUP === "1";
const steps = (process.env.LOADTEST_STEPS ?? "20,50,100,200")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

runLoadTest({
  mode: "stress",
  steps,
  stepDurationSec,
  skipCleanup,
})
  .then((report) => {
    console.log("\n=== RESUMO ESTRESSE ===");
    for (const step of report.steps) {
      console.log(
        `VUs=${step.vus} RPS=${step.rps} p95=${step.p95.toFixed(0)} writeP95=${step.write.p95.toFixed(0)} err=${(step.errorRate * 100).toFixed(2)}%${step.stoppedReason ? ` STOP=${step.stoppedReason}` : ""}`,
      );
    }
    console.log(`Docs: ${JSON.stringify(report.integrity?.docs)}`);
    console.log(
      `Duplicatas de horário (todos degraus): ${report.integrity?.duplicateSlots?.length ?? 0}`,
    );
    process.exit(report.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
