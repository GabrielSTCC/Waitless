/**
 * Cenários HTTP para carga/estresse.
 * client-access (RF-032) não está neste branch — cenários cobrem APIs públicas + admin.
 */
import {
  COMPANY_ID,
  QUEUE_WHATSAPP_PREFIX,
  SEED_CLIENT,
} from "./constants.mjs";

function saoPauloDateISO(offsetDays = 1) {
  const now = new Date();
  const local = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  local.setDate(local.getDate() + offsetDays);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function uniqueWhatsapp(vuId, seq) {
  // 1190000 + 5 dígitos = 11 dígitos
  const n = (vuId * 10_000 + (seq % 10_000)) % 100_000;
  return `${QUEUE_WHATSAPP_PREFIX}${String(n).padStart(5, "0")}`;
}

export function createScenarioHelpers(ctx) {
  let bookSeq = 0;
  let queueSeq = 0;
  const shared = {
    slotsCache: /** @type {string[] | null} */ (null),
    collisionSlot: /** @type {string | null} */ (null),
    collisionAttempted: false,
  };

  async function timed(http, name, fn) {
    const started = performance.now();
    try {
      const result = await fn();
      const ms = performance.now() - started;
      http.record({
        name,
        ok: result.ok !== false,
        status: result.status ?? 0,
        ms,
        expectedFailure: result.expectedFailure === true,
        meta: result.meta,
      });
      return result;
    } catch (error) {
      const ms = performance.now() - started;
      http.record({
        name,
        ok: false,
        status: 0,
        ms,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, status: 0, error };
    }
  }

  async function getAvailability(http) {
    const date = saoPauloDateISO(1);
    return timed(http, "POST /api/appointments/availability", async () => {
      const res = await http.fetch("/api/appointments/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: COMPANY_ID, date }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.slots)) {
        shared.slotsCache = data.slots;
        if (!shared.collisionSlot && data.slots.length > 0) {
          // Usa um slot no meio da lista para colisão
          shared.collisionSlot = data.slots[Math.floor(data.slots.length / 2)];
        }
      }
      return { ok: res.ok, status: res.status, data };
    });
  }

  async function ensureSlots(http) {
    if (shared.slotsCache?.length) return shared.slotsCache;
    await getAvailability(http);
    return shared.slotsCache ?? [];
  }

  return {
    shared,

    async pages(http) {
      const paths = [
        { path: "/", label: "GET /" },
        { path: `/agendar/${COMPANY_ID}`, label: "GET /agendar/:id" },
        { path: `/q/${ctx.publicToken}`, label: "GET /q/:token" },
      ];
      for (const { path, label } of paths) {
        await timed(http, label, async () => {
          const res = await http.fetch(path);
          return { ok: res.ok, status: res.status };
        });
      }
    },

    async availability(http) {
      await getAvailability(http);
    },

    async bookDistinct(http) {
      const slots = await ensureSlots(http);
      if (!slots.length) {
        http.record({
          name: "POST /api/appointments/book",
          ok: false,
          status: 0,
          ms: 0,
          error: "sem slots",
        });
        return null;
      }
      const seq = ++bookSeq;
      // Espalha horários por VU/seq; evita o slot do meio reservado à colisão
      const mid = Math.floor(slots.length / 2);
      let slotIdx = (seq * 7 + (http.vuId ?? 1) * 13) % slots.length;
      if (slotIdx === mid && slots.length > 1) slotIdx = (slotIdx + 1) % slots.length;
      const slot = slots[slotIdx] ?? slots[0];
      return timed(http, "POST /api/appointments/book", async () => {
        const res = await http.fetch("/api/appointments/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: COMPANY_ID,
            name: `Load Book ${seq}`,
            whatsapp: uniqueWhatsapp(900, seq),
            scheduledAt: slot,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const expectedFailure = !res.ok && res.status === 400;
        return {
          ok: res.ok || expectedFailure,
          status: res.status,
          expectedFailure,
          data,
          meta: { scheduledAt: slot, publicToken: data.publicToken, appointmentId: data.appointmentId },
        };
      });
    },

    async bookCollision(http) {
      const slots = await ensureSlots(http);
      const slot = shared.collisionSlot ?? slots[0];
      if (!slot) {
        http.record({
          name: "POST /api/appointments/book (collision)",
          ok: false,
          status: 0,
          ms: 0,
          error: "sem slot colisão",
        });
        return;
      }
      shared.collisionAttempted = true;
      const seq = bookSeq++;
      await timed(http, "POST /api/appointments/book (collision)", async () => {
        const res = await http.fetch("/api/appointments/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: COMPANY_ID,
            name: `Collision ${seq}`,
            whatsapp: uniqueWhatsapp(800, seq),
            scheduledAt: slot,
          }),
        });
        const data = await res.json().catch(() => ({}));
        // 400 "horário não está livre" é esperado após o primeiro sucesso
        const expectedFailure =
          !res.ok &&
          res.status === 400 &&
          typeof data.error === "string" &&
          /livre|horário|horario/i.test(data.error);
        return {
          ok: res.ok || expectedFailure,
          status: res.status,
          expectedFailure,
          data,
          meta: {
            scheduledAt: slot,
            collision: true,
            booked: res.ok === true,
            publicToken: data.publicToken,
          },
        };
      });
    },

    async arriveFlow(http) {
      // book (staff confirmed path): public book -> staff confirm -> arrive
      const book = await this.bookDistinct(http);
      const appointmentId = book?.data?.appointmentId ?? book?.meta?.appointmentId;
      const publicToken = book?.data?.publicToken ?? book?.meta?.publicToken;
      if (!appointmentId || !publicToken || !http.idToken) return;

      await timed(http, "POST /api/appointments (confirm)", async () => {
        const res = await http.fetch("/api/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${http.idToken}`,
          },
          body: JSON.stringify({ action: "confirm", appointmentId }),
        });
        return { ok: res.ok, status: res.status };
      });

      await timed(http, "POST /api/appointments/arrive", async () => {
        const res = await http.fetch("/api/appointments/arrive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: publicToken }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data, meta: { publicToken } };
      });
    },

    async withdraw(http) {
      // Cria entrada via admin e desmarca
      if (!http.idToken) return;
      const seq = queueSeq++;
      const whatsapp = uniqueWhatsapp(http.vuId ?? 1, seq);
      const add = await timed(http, "POST /api/admin/queue", async () => {
        const res = await http.fetch("/api/admin/queue", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${http.idToken}`,
          },
          body: JSON.stringify({
            companyId: COMPANY_ID,
            name: `Fila VU${http.vuId} ${seq}`,
            whatsapp,
            avgServiceTimeMin: 10,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const expectedFailure = res.status === 409;
        return {
          ok: res.ok || expectedFailure,
          status: res.status,
          expectedFailure,
          data,
        };
      });

      // Busca token da fila via GET admin
      const list = await timed(http, "GET /api/admin/queue", async () => {
        const res = await http.fetch(
          `/api/admin/queue?companyId=${encodeURIComponent(COMPANY_ID)}`,
          { headers: { Authorization: `Bearer ${http.idToken}` } },
        );
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
      });

      const waiting = Array.isArray(list?.data?.waiting) ? list.data.waiting : [];
      const inService = Array.isArray(list?.data?.inService) ? list.data.inService : [];
      const entries = [...waiting, ...inService];
      const mine =
        entries.find((e) => e.clientWhatsapp === whatsapp || e.whatsapp === whatsapp) ??
        entries.find((e) => e.id === add?.data?.entryId);
      const token = mine?.publicToken;
      if (!token) return;

      await timed(http, "POST /api/queue/withdraw", async () => {
        const res = await http.fetch("/api/queue/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        return { ok: res.ok, status: res.status };
      });
    },

    async adminQueueRead(http) {
      if (!http.idToken) return;
      await timed(http, "GET /api/admin/queue", async () => {
        const res = await http.fetch(
          `/api/admin/queue?companyId=${encodeURIComponent(COMPANY_ID)}`,
          { headers: { Authorization: `Bearer ${http.idToken}` } },
        );
        return { ok: res.ok, status: res.status };
      });
    },

    async adminQueueMutate(http) {
      if (!http.idToken) return;
      const seq = queueSeq++;
      const whatsapp = uniqueWhatsapp(http.vuId ?? 2, seq + 5000);
      const add = await timed(http, "POST /api/admin/queue", async () => {
        const res = await http.fetch("/api/admin/queue", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${http.idToken}`,
          },
          body: JSON.stringify({
            companyId: COMPANY_ID,
            name: `Admin ${http.vuId}-${seq}`,
            whatsapp,
            avgServiceTimeMin: 10,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const expectedFailure = res.status === 409;
        return {
          ok: res.ok || expectedFailure,
          status: res.status,
          expectedFailure,
          data,
        };
      });
      const entryId = add?.data?.entryId;
      if (!entryId) return;
      await timed(http, "PATCH /api/admin/queue", async () => {
        const res = await http.fetch("/api/admin/queue", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${http.idToken}`,
          },
          body: JSON.stringify({
            companyId: COMPANY_ID,
            entryId,
            status: "in_service",
          }),
        });
        return { ok: res.ok, status: res.status };
      });
    },

    async clientHistoryProfile(http) {
      await timed(http, "POST /api/queue/client-history", async () => {
        const res = await http.fetch("/api/queue/client-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: ctx.publicToken }),
        });
        return { ok: res.ok, status: res.status };
      });
      await timed(http, "POST /api/queue/client-profile", async () => {
        const res = await http.fetch("/api/queue/client-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: ctx.publicToken }),
        });
        return { ok: res.ok, status: res.status };
      });
    },

    /** Mix ponderado para um VU */
    async runMixed(http) {
      const roll = Math.random();
      if (roll < 0.2) await this.pages(http);
      else if (roll < 0.35) await this.availability(http);
      else if (roll < 0.5) await this.bookDistinct(http);
      else if (roll < 0.6) await this.bookCollision(http);
      else if (roll < 0.7) await this.arriveFlow(http);
      else if (roll < 0.8) await this.adminQueueMutate(http);
      else if (roll < 0.9) await this.adminQueueRead(http);
      else if (roll < 0.95) await this.withdraw(http);
      else await this.clientHistoryProfile(http);

      // touch seed client name to avoid unused lint in tools that scan
      void SEED_CLIENT;
    },
  };
}
