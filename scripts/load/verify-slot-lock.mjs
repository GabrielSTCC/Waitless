/**
 * Verifica que N reservas simultâneas no mesmo horário resultam em 1 sucesso.
 *
 * Pré-requisito: next start + emuladores (ou Firestore real) + credenciais.
 *   npm run loadtest:verify-slot
 */
import { loadEnvLocal } from "../load-env-local.mjs";
import { COMPANY_ID } from "./constants.mjs";
import { getFirebaseAdmin } from "./firebase.mjs";
import { seedLoadtestCompany } from "./seed.mjs";
import { cleanupLoadtestCompany } from "./cleanup.mjs";

loadEnvLocal();

async function main() {
  const base = process.env.LOADTEST_BASE_URL?.trim() || "http://127.0.0.1:3000";
  await seedLoadtestCompany();
  const { db } = await getFirebaseAdmin();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);

  const availRes = await fetch(`${base}/api/appointments/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId: COMPANY_ID, date: dateISO }),
  });
  const avail = await availRes.json();
  const slot = avail.slots?.[Math.floor((avail.slots?.length ?? 0) / 2)];
  if (!slot) throw new Error(`Sem slots para testar. (${avail.error ?? availRes.status})`);

  const N = Number(process.env.SLOT_LOCK_N ?? "20");
  console.log(`Disparando ${N} reservas simultâneas em ${slot}...`);

  const results = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      fetch(`${base}/api/appointments/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: COMPANY_ID,
          name: `Lock Test ${i}`,
          whatsapp: `1197000${String(i).padStart(4, "0")}`,
          scheduledAt: slot,
        }),
      }).then(async (res) => ({
        status: res.status,
        body: await res.json().catch(() => ({})),
      })),
    ),
  );

  const ok = results.filter((r) => r.status === 200);
  const denied = results.filter((r) => r.status === 400);
  const other = results.filter((r) => r.status !== 200 && r.status !== 400);

  const locks = await db.collection(`companies/${COMPANY_ID}/appointmentSlots`).get();
  const allAppts = await db.collection(`companies/${COMPANY_ID}/appointments`).get();
  const sameSlot = allAppts.docs.filter((doc) => {
    const scheduled = doc.data().scheduledAt?.toDate?.();
    return scheduled && scheduled.toISOString() === slot;
  });

  console.log(`sucessos=${ok.length} negados=${denied.length} outros=${other.length}`);
  console.log(`locks=${locks.size} appointmentsNoMesmoHorario=${sameSlot.length}`);
  if (other.length) {
    console.log("outros:", other.slice(0, 3));
  }

  await cleanupLoadtestCompany({ deleteAuthUser: true });

  if (ok.length !== 1 || sameSlot.length !== 1 || locks.size !== 1) {
    console.error("FALHA: esperado 1 sucesso, 1 appointment e 1 lock.");
    process.exit(1);
  }
  console.log("OK: slot lock impede overbooking.");
}

main().catch(async (err) => {
  console.error(err);
  try {
    await cleanupLoadtestCompany({ deleteAuthUser: true });
  } catch {
    // ignore
  }
  process.exit(1);
});
