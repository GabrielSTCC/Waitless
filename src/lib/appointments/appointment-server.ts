import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { appointmentEtaMin, listOpenSlots, zonedDateTime } from "@/lib/appointments/hours";
import {
  arrivalWindowErrorMessage,
  appointmentQueueDayErrorMessage,
  canOperateAppointmentQueue,
  evaluateArrivalWindow,
} from "@/lib/appointments/arrival-window";
import { readAppointmentCompanyFields } from "@/lib/appointments/parse-company";
import { mapCompanyFromAdminData } from "@/lib/auth/session-server";
import { buildPublicQueueCompanyFields } from "@/lib/queue/public-queue-company-fields";
import type {
  Appointment,
  AppointmentStatus,
  Company,
  Professional,
  ServiceMode,
} from "@/lib/types";
import { normalizeName, normalizeWhatsapp } from "@/lib/utils/format";

/** Status que ocupam o horário na grade (pedido já reserva o slot). */
const OCCUPIED = new Set<AppointmentStatus>([
  "requested",
  "confirmed",
  "arrival_confirmed",
  "in_service",
]);

const ACTIVE_CLIENT_APPOINTMENT_STATUSES = [...OCCUPIED] as AppointmentStatus[];

const CLIENT_ALREADY_BOOKED_MESSAGE =
  "Você já tem um horário marcado. Use o link que recebeu ou fale com o estabelecimento.";
const STAFF_CLIENT_ALREADY_BOOKED_MESSAGE =
  "Este cliente já tem um horário ativo. Cancele ou conclua o atual antes de marcar outro.";

function appointmentLaneKey(professionalId?: string | null): string {
  const id = typeof professionalId === "string" ? professionalId.trim() : "";
  return id || "_shared";
}

function appointmentSlotDocId(
  scheduledAt: Date,
  professionalId?: string | null,
): string {
  return `${appointmentLaneKey(professionalId)}_${scheduledAt.getTime()}`;
}

function appointmentSlotRef(
  db: Firestore,
  companyId: string,
  scheduledAt: Date,
  professionalId?: string | null,
) {
  return db.doc(
    `companies/${companyId}/appointmentSlots/${appointmentSlotDocId(scheduledAt, professionalId)}`,
  );
}

function clientAppointmentLockRef(db: Firestore, companyId: string, clientId: string) {
  return db.doc(`companies/${companyId}/activeClientAppointments/${clientId}`);
}

function activeClientBookingError(confirmedByStaff?: boolean): Error {
  return new Error(
    confirmedByStaff ? STAFF_CLIENT_ALREADY_BOOKED_MESSAGE : CLIENT_ALREADY_BOOKED_MESSAGE,
  );
}

async function releaseAppointmentSlot(
  db: Firestore,
  companyId: string,
  scheduledAt: Date,
  professionalId: string | null | undefined,
  appointmentId: string,
): Promise<void> {
  const ref = appointmentSlotRef(db, companyId, scheduledAt, professionalId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    if ((snap.data()?.appointmentId as string | undefined) !== appointmentId) return;
    tx.delete(ref);
  });
}

async function releaseClientAppointmentLock(
  db: Firestore,
  companyId: string,
  clientId: string | null | undefined,
  appointmentId: string,
): Promise<void> {
  if (!clientId) return;
  const ref = clientAppointmentLockRef(db, companyId, clientId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    if ((snap.data()?.appointmentId as string | undefined) !== appointmentId) return;
    tx.delete(ref);
  });
}

async function findActiveAppointmentForClient(
  db: Firestore,
  companyId: string,
  clientId: string,
): Promise<Appointment | null> {
  const snap = await db
    .collection(`companies/${companyId}/appointments`)
    .where("clientId", "==", clientId)
    .get();
  const candidates = snap.docs
    .map((doc) => mapAppointment(doc.id, doc.data() as Record<string, unknown>))
    .filter((item) => ACTIVE_CLIENT_APPOINTMENT_STATUSES.includes(item.status))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  for (const appointment of candidates) {
    // Auto-cura: desmarcar no link às vezes deixava o appointment ativo.
    if (appointment.publicToken) {
      const pub = await db.doc(`publicQueue/${appointment.publicToken}`).get();
      if (pub.exists && (pub.data()?.status as string) === "cancelled") {
        await cancelAppointmentByClientWithdraw(db, companyId, appointment.id);
        continue;
      }
    }
    return appointment;
  }
  return null;
}

/** Cliente desmarcou: libera horário, lock do cliente e marca appointment cancelled. */
export async function cancelAppointmentByClientWithdraw(
  db: Firestore,
  companyId: string,
  appointmentId: string,
): Promise<void> {
  const ref = db.doc(`companies/${companyId}/appointments/${appointmentId}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() as Record<string, unknown>;
  const status = data.status as AppointmentStatus;
  if (!OCCUPIED.has(status) && status !== "cancelled") {
    // rejected/completed/skipped já são terminais
    return;
  }
  if (status !== "cancelled") {
    await ref.update({ status: "cancelled" });
  }
  const scheduledAt = asDate(data.scheduledAt);
  if (scheduledAt) {
    await releaseAppointmentSlot(
      db,
      companyId,
      scheduledAt,
      (data.professionalId as string | undefined) ?? null,
      appointmentId,
    );
  }
  await releaseClientAppointmentLock(
    db,
    companyId,
    (data.clientId as string | undefined) ?? null,
    appointmentId,
  );
  const token = data.publicToken as string | undefined;
  if (token) {
    await db.doc(`publicQueue/${token}`).set(
      {
        status: "cancelled",
        appointmentStatus: "cancelled",
        queueKind: "appointment",
        position: 0,
        estimatedWaitMin: 0,
        passed: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await syncAppointmentLane(db, companyId, data.professionalId as string | undefined).catch(
    () => undefined,
  );
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function laneKey(professionalId?: string | null): string {
  return professionalId || "_shared";
}

export async function loadCompanyForAppointments(
  db: Firestore,
  companyId: string,
): Promise<Company | null> {
  const snap = await db.doc(`companies/${companyId}`).get();
  if (!snap.exists) return null;
  return mapCompanyFromAdminData(companyId, snap.data()!);
}

function mapProfessional(id: string, data: Record<string, unknown>): Professional {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    active: data.active !== false,
  };
}

export async function listProfessionals(
  db: Firestore,
  companyId: string,
): Promise<Professional[]> {
  const snap = await db.collection(`companies/${companyId}/professionals`).get();
  return snap.docs
    .map((doc) => mapProfessional(doc.id, doc.data() as Record<string, unknown>))
    .filter((item) => item.name.trim().length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function addProfessional(
  db: Firestore,
  companyId: string,
  name: string,
): Promise<Professional> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error("Informe o nome do profissional.");
  }
  const ref = db.collection(`companies/${companyId}/professionals`).doc();
  await ref.set({ name: trimmed, active: true, createdAt: FieldValue.serverTimestamp() });
  return { id: ref.id, name: trimmed, active: true };
}

export async function deactivateProfessional(
  db: Firestore,
  companyId: string,
  professionalId: string,
): Promise<void> {
  await db.doc(`companies/${companyId}/professionals/${professionalId}`).set(
    { active: false },
    { merge: true },
  );
}

function mapAppointment(id: string, data: Record<string, unknown>): Appointment {
  const status = data.status as AppointmentStatus;
  return {
    id,
    clientId: (data.clientId as string) ?? "",
    clientName: (data.clientName as string) ?? "",
    clientWhatsapp: (data.clientWhatsapp as string) ?? "",
    professionalId: data.professionalId as string | undefined,
    professionalName: data.professionalName as string | undefined,
    scheduledAt: asDate(data.scheduledAt) ?? new Date(0),
    status,
    publicToken: (data.publicToken as string) ?? "",
    queueEntryId: data.queueEntryId as string | undefined,
    confirmedArrivalAt: asDate(data.confirmedArrivalAt),
    createdAt: asDate(data.createdAt) ?? new Date(),
  };
}

async function takenStarts(
  db: Firestore,
  companyId: string,
  dateISO: string,
  professionalId?: string,
): Promise<number[]> {
  const dayStart = zonedDateTime(dateISO, "00:00");
  const dayEnd = zonedDateTime(dateISO, "23:59");
  if (!dayStart || !dayEnd) return [];
  const snap = await db
    .collection(`companies/${companyId}/appointments`)
    .where("scheduledAt", ">=", Timestamp.fromDate(dayStart))
    .where("scheduledAt", "<=", Timestamp.fromDate(dayEnd))
    .get();
  return snap.docs
    .map((doc) => doc.data() as Record<string, unknown>)
    .filter((data) => OCCUPIED.has(data.status as AppointmentStatus))
    .filter((data) => {
      if (!professionalId) return true;
      return data.professionalId === professionalId;
    })
    .map((data) => asDate(data.scheduledAt)?.getTime() ?? 0)
    .filter((time) => time > 0);
}

export async function listAvailability(
  db: Firestore,
  companyId: string,
  dateISO: string,
  professionalId?: string,
) {
  const company = await loadCompanyForAppointments(db, companyId);
  if (!company?.appointmentsEnabled) {
    throw new Error("Este estabelecimento não aceita agendamento.");
  }
  const fields = readAppointmentCompanyFields({
    appointmentsEnabled: company.appointmentsEnabled,
    serviceMode: company.serviceMode,
    reminderLeadMin: company.reminderLeadMin,
    businessHours: company.businessHours,
  });
  const professionals = await listProfessionals(db, companyId);
  const active = professionals.filter((item) => item.active);
  if (fields.serviceMode === "per_professional" && !professionalId) {
    return {
      companyName: company.name,
      serviceMode: fields.serviceMode,
      professionals: active,
      slots: [] as string[],
    };
  }
  const taken = await takenStarts(db, companyId, dateISO, professionalId);
  const slots = listOpenSlots({
    dateISO,
    hours: fields.businessHours,
    durationMin: company.avgServiceTimeMin,
    takenAt: taken,
  });
  return {
    companyName: company.name,
    serviceMode: fields.serviceMode as ServiceMode,
    avgServiceTimeMin: company.avgServiceTimeMin,
    professionals: active,
    slots: slots.map((slot) => slot.toISOString()),
  };
}

async function upsertClient(
  db: Firestore,
  companyId: string,
  name: string,
  whatsapp: string,
): Promise<string> {
  const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
  if (normalizedWhatsapp.length < 10) {
    throw new Error("Informe um WhatsApp válido.");
  }
  const clients = db.collection(`companies/${companyId}/clients`);
  const existing = await clients.where("normalizedWhatsapp", "==", normalizedWhatsapp).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0]!;
    await doc.ref.set(
      { name: name.trim(), normalizedName: normalizeName(name) },
      { merge: true },
    );
    return doc.id;
  }
  const ref = clients.doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    name: name.trim(),
    whatsapp: normalizedWhatsapp,
    normalizedWhatsapp,
    normalizedName: normalizeName(name),
    visitCount: 0,
    createdAt: now,
    lastVisitAt: now,
  });
  return ref.id;
}

async function writePublicHold(
  db: Firestore,
  company: Company,
  token: string,
  input: {
    clientName: string;
    clientId: string;
    appointmentStatus: AppointmentStatus;
    scheduledAt: Date;
    professionalName?: string;
    passed?: boolean;
  },
) {
  const base = buildPublicQueueCompanyFields(company, 0);
  await db.doc(`publicQueue/${token}`).set(
    {
      ...base,
      companyId: company.id,
      entryId: "",
      clientId: input.clientId,
      clientName: input.clientName,
      status: input.passed ? "cancelled" : "waiting",
      position: 0,
      estimatedWaitMin: 0,
      queueKind: "appointment",
      appointmentStatus: input.appointmentStatus,
      scheduledAt: Timestamp.fromDate(input.scheduledAt),
      professionalName: input.professionalName ?? "",
      servingNames: [],
      passed: input.passed === true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function bookAppointment(
  db: Firestore,
  input: {
    companyId: string;
    name: string;
    whatsapp: string;
    scheduledAtIso: string;
    professionalId?: string;
    confirmedByStaff?: boolean;
  },
): Promise<{ publicToken: string; appointmentId: string }> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Informe o nome.");
  const company = await loadCompanyForAppointments(db, input.companyId);
  if (!company?.appointmentsEnabled) {
    throw new Error("Este estabelecimento não aceita agendamento.");
  }
  const scheduledAt = new Date(input.scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    throw new Error("Escolha um horário futuro.");
  }
  const mode = company.serviceMode ?? "single";
  let professionalId: string | undefined;
  let professionalName: string | undefined;
  if (mode === "per_professional") {
    if (!input.professionalId) throw new Error("Escolha o profissional.");
    const pro = await db
      .doc(`companies/${company.id}/professionals/${input.professionalId}`)
      .get();
    if (!pro.exists || pro.data()?.active === false) {
      throw new Error("Profissional indisponível.");
    }
    professionalId = input.professionalId;
    professionalName = (pro.data()?.name as string) ?? "";
  }
  const dateISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(scheduledAt);
  const open = await listAvailability(
    db,
    company.id,
    dateISO,
    mode === "per_professional" ? professionalId : undefined,
  );
  if (!open.slots.includes(scheduledAt.toISOString())) {
    throw new Error("Esse horário não está livre.");
  }
  const clientId = await upsertClient(db, company.id, name, input.whatsapp);
  const existingActive = await findActiveAppointmentForClient(db, company.id, clientId);
  if (existingActive) {
    throw activeClientBookingError(input.confirmedByStaff);
  }
  const publicToken = randomUUID();
  const appointmentRef = db.collection(`companies/${company.id}/appointments`).doc();
  const lockRef = appointmentSlotRef(db, company.id, scheduledAt, professionalId);
  const clientLockRef = clientAppointmentLockRef(db, company.id, clientId);
  const tokenRef = db.doc(`appointmentTokens/${publicToken}`);
  const publicRef = db.doc(`publicQueue/${publicToken}`);
  const status: AppointmentStatus = input.confirmedByStaff ? "confirmed" : "requested";
  const base = buildPublicQueueCompanyFields(company, 0);

  try {
    await db.runTransaction(async (tx) => {
      const lockSnap = await tx.get(lockRef);
      const clientLockSnap = await tx.get(clientLockRef);
      if (lockSnap.exists) {
        throw new Error("Esse horário não está livre.");
      }
      if (clientLockSnap.exists) {
        throw activeClientBookingError(input.confirmedByStaff);
      }
      tx.set(appointmentRef, {
        clientId,
        clientName: name,
        clientWhatsapp: normalizeWhatsapp(input.whatsapp),
        professionalId: professionalId ?? null,
        professionalName: professionalName ?? null,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status,
        publicToken,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(lockRef, {
        appointmentId: appointmentRef.id,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        professionalId: professionalId ?? null,
        status,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(clientLockRef, {
        appointmentId: appointmentRef.id,
        publicToken,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(tokenRef, {
        companyId: company.id,
        appointmentId: appointmentRef.id,
      });
      tx.set(publicRef, {
        ...base,
        companyId: company.id,
        entryId: "",
        clientId,
        clientName: name,
        status: "waiting",
        position: 0,
        estimatedWaitMin: 0,
        queueKind: "appointment",
        appointmentStatus: status,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        professionalName: professionalName ?? "",
        servingNames: [],
        passed: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Esse horário não está livre." ||
        error.message === CLIENT_ALREADY_BOOKED_MESSAGE ||
        error.message === STAFF_CLIENT_ALREADY_BOOKED_MESSAGE
      ) {
        throw error;
      }
    }
    // Conflito de transação / lock perdido na corrida
    const code = (error as { code?: number | string })?.code;
    if (code === 6 || code === "already-exists" || code === 10 || code === "aborted") {
      throw new Error("Esse horário não está livre.");
    }
    throw error;
  }

  return { publicToken, appointmentId: appointmentRef.id };
}

async function findByToken(db: Firestore, token: string) {
  const pointer = await db.doc(`appointmentTokens/${token}`).get();
  if (!pointer.exists) return null;
  const companyId = pointer.data()?.companyId as string | undefined;
  const appointmentId = pointer.data()?.appointmentId as string | undefined;
  if (!companyId || !appointmentId) return null;
  const ref = db.doc(`companies/${companyId}/appointments/${appointmentId}`);
  const doc = await ref.get();
  if (!doc.exists) return null;
  return { companyId, appointment: mapAppointment(doc.id, doc.data() as Record<string, unknown>), ref };
}

export async function syncAppointmentLane(
  db: Firestore,
  companyId: string,
  professionalId?: string | null,
): Promise<void> {
  const company = await loadCompanyForAppointments(db, companyId);
  if (!company) return;
  const queueSnap = await db
    .collection(`companies/${companyId}/queue`)
    .where("source", "==", "appointment")
    .get();
  const rows = queueSnap.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as Record<string, unknown>,
  }));
  const lane = laneKey(professionalId);
  const inLane = rows.filter((row) => laneKey(row.data.professionalId as string | undefined) === lane);
  const waiting = inLane
    .filter((row) => row.data.status === "waiting")
    .sort((a, b) => (asDate(a.data.scheduledAt)?.getTime() ?? 0) - (asDate(b.data.scheduledAt)?.getTime() ?? 0));
  const serving = professionalId
    ? inLane.filter((row) => row.data.status === "in_service")
    : rows.filter((row) => row.data.status === "in_service");

  if (
    company.toleranceEnabled &&
    waiting[0]?.data.toleranceExpiresAt &&
    (asDate(waiting[0].data.toleranceExpiresAt)?.getTime() ?? Infinity) <= Date.now()
  ) {
    await passQueueEntry(db, company, waiting[0].id, waiting[0].data);
    await syncAppointmentLane(db, companyId, professionalId);
    return;
  }

  if (company.toleranceEnabled && waiting[0] && !waiting[0].data.turnStartedAt) {
    const turnStartedAt = Timestamp.now();
    const toleranceExpiresAt = Timestamp.fromMillis(
      turnStartedAt.toMillis() + company.toleranceMin * 60_000,
    );
    await db.doc(`companies/${companyId}/queue/${waiting[0].id}`).update({
      turnStartedAt,
      toleranceExpiresAt,
    });
    waiting[0].data.turnStartedAt = turnStartedAt;
    waiting[0].data.toleranceExpiresAt = toleranceExpiresAt;
  }

  const servingNames = serving.map((row) => (row.data.clientName as string) ?? "").filter(Boolean);
  const base = buildPublicQueueCompanyFields(company);

  await Promise.all(
    waiting.map(async (row, index) => {
      const token = row.data.publicToken as string | undefined;
      if (!token) return;
      const scheduledAt = asDate(row.data.scheduledAt) ?? new Date();
      const eta = appointmentEtaMin({
        scheduledAt,
        peopleAhead: index,
        inServiceCount: serving.length,
        avgMin: company.avgServiceTimeMin,
      });
      const toleranceExpiresAt = asDate(row.data.toleranceExpiresAt);
      await db.doc(`publicQueue/${token}`).set(
        {
          ...base,
          companyId,
          entryId: row.id,
          clientId: row.data.clientId ?? "",
          clientName: row.data.clientName ?? "",
          status: "waiting",
          position: index + 1,
          estimatedWaitMin: eta,
          queueKind: "appointment",
          appointmentStatus: "arrival_confirmed",
          scheduledAt: Timestamp.fromDate(scheduledAt),
          professionalName: (row.data.professionalName as string) ?? "",
          servingNames,
          passed: false,
          toleranceExpiresAt: toleranceExpiresAt
            ? Timestamp.fromDate(toleranceExpiresAt)
            : FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }),
  );
}

async function passQueueEntry(
  db: Firestore,
  company: Company,
  entryId: string,
  data: Record<string, unknown>,
) {
  const token = data.publicToken as string | undefined;
  const appointmentId = data.appointmentId as string | undefined;
  await db.doc(`companies/${company.id}/queue/${entryId}`).update({ status: "passed" });
  if (appointmentId) {
    const appointmentRef = db.doc(`companies/${company.id}/appointments/${appointmentId}`);
    const appointmentSnap = await appointmentRef.get();
    await appointmentRef.update({
      status: "skipped",
    });
    if (appointmentSnap.exists) {
      const appt = appointmentSnap.data() as Record<string, unknown>;
      const scheduledAt = asDate(appt.scheduledAt);
      if (scheduledAt) {
        await releaseAppointmentSlot(
          db,
          company.id,
          scheduledAt,
          (appt.professionalId as string | undefined) ?? null,
          appointmentId,
        );
      }
      await releaseClientAppointmentLock(
        db,
        company.id,
        (appt.clientId as string | undefined) ?? null,
        appointmentId,
      );
    }
  }
  if (token) {
    await db.doc(`publicQueue/${token}`).set(
      {
        status: "cancelled",
        passed: true,
        queueKind: "appointment",
        appointmentStatus: "skipped",
        position: 0,
        estimatedWaitMin: 0,
        servingNames: [],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export async function confirmAppointmentByShop(
  db: Firestore,
  companyId: string,
  appointmentId: string,
  accept: boolean,
): Promise<void> {
  const ref = db.doc(`companies/${companyId}/appointments/${appointmentId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Agendamento não encontrado.");
  const data = snap.data() as Record<string, unknown>;
  if (data.status !== "requested") throw new Error("Esse pedido já foi decidido.");
  const company = await loadCompanyForAppointments(db, companyId);
  if (!company) throw new Error("Estabelecimento não encontrado.");
  const scheduledAt = asDate(data.scheduledAt) ?? new Date();
  const professionalId = (data.professionalId as string | undefined) || undefined;
  const lockRef = appointmentSlotRef(db, companyId, scheduledAt, professionalId);
  const publicToken = data.publicToken as string;

  if (accept) {
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const lockSnap = await tx.get(lockRef);
      if (!fresh.exists) throw new Error("Agendamento não encontrado.");
      if ((fresh.data()?.status as string) !== "requested") {
        throw new Error("Esse pedido já foi decidido.");
      }
      if (lockSnap.exists) {
        const owner = lockSnap.data()?.appointmentId as string | undefined;
        if (owner && owner !== appointmentId) {
          throw new Error("Esse horário já foi confirmado para outra pessoa.");
        }
        tx.update(lockRef, { status: "confirmed" });
      } else {
        tx.set(lockRef, {
          appointmentId,
          scheduledAt: Timestamp.fromDate(scheduledAt),
          professionalId: professionalId ?? null,
          status: "confirmed",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      tx.update(ref, { status: "confirmed" });
    });
    await writePublicHold(db, company, publicToken, {
      clientName: (data.clientName as string) ?? "",
      clientId: (data.clientId as string) ?? "",
      appointmentStatus: "confirmed",
      scheduledAt,
      professionalName: (data.professionalName as string) || undefined,
    });
    return;
  }

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    const lockSnap = await tx.get(lockRef);
    if (!fresh.exists) throw new Error("Agendamento não encontrado.");
    if ((fresh.data()?.status as string) !== "requested") {
      throw new Error("Esse pedido já foi decidido.");
    }
    const clientId = fresh.data()?.clientId as string | undefined;
    const clientLockRef = clientId
      ? clientAppointmentLockRef(db, companyId, clientId)
      : null;
    const clientLockSnap = clientLockRef ? await tx.get(clientLockRef) : null;

    tx.update(ref, { status: "rejected" });
    if (lockSnap.exists && (lockSnap.data()?.appointmentId as string) === appointmentId) {
      tx.delete(lockRef);
    }
    if (
      clientLockRef &&
      clientLockSnap?.exists &&
      (clientLockSnap.data()?.appointmentId as string | undefined) === appointmentId
    ) {
      tx.delete(clientLockRef);
    }
  });
  await writePublicHold(db, company, publicToken, {
    clientName: (data.clientName as string) ?? "",
    clientId: (data.clientId as string) ?? "",
    appointmentStatus: "rejected",
    scheduledAt,
    professionalName: (data.professionalName as string) || undefined,
  });
}

export async function confirmArrival(
  db: Firestore,
  token: string,
): Promise<void> {
  const found = await findByToken(db, token);
  if (!found) throw new Error("Link inválido.");
  const { companyId, appointment, ref } = found;
  if (appointment.status === "arrival_confirmed" || appointment.status === "in_service") return;
  if (appointment.status !== "confirmed") {
    throw new Error("O estabelecimento ainda não confirmou este horário.");
  }
  const phase = evaluateArrivalWindow(appointment.scheduledAt);
  if (phase !== "open") {
    throw new Error(arrivalWindowErrorMessage(phase));
  }
  const company = await loadCompanyForAppointments(db, companyId);
  if (!company) throw new Error("Estabelecimento não encontrado.");
  const entryRef = db.collection(`companies/${companyId}/queue`).doc();
  const counterRef = db.doc(`companies/${companyId}/meta/queue`);
  const counterSnap = await counterRef.get();
  const ticketNumber = ((counterSnap.data()?.nextTicket as number | undefined) ?? 1);
  await counterRef.set({ nextTicket: ticketNumber + 1 }, { merge: true });
  await entryRef.set({
    clientId: appointment.clientId,
    clientName: appointment.clientName,
    clientWhatsapp: appointment.clientWhatsapp,
    status: "waiting",
    position: ticketNumber,
    ticketNumber,
    publicToken: appointment.publicToken,
    source: "appointment",
    appointmentId: appointment.id,
    professionalId: appointment.professionalId ?? null,
    professionalName: appointment.professionalName ?? null,
    scheduledAt: Timestamp.fromDate(appointment.scheduledAt),
    createdAt: FieldValue.serverTimestamp(),
  });
  await ref.update({
    status: "arrival_confirmed",
    confirmedArrivalAt: FieldValue.serverTimestamp(),
    queueEntryId: entryRef.id,
  });
  await syncAppointmentLane(db, companyId, appointment.professionalId);
}

export async function passNextAppointment(
  db: Firestore,
  companyId: string,
  appointmentId: string,
): Promise<void> {
  const snap = await db.doc(`companies/${companyId}/appointments/${appointmentId}`).get();
  if (!snap.exists) throw new Error("Agendamento não encontrado.");
  const data = snap.data() as Record<string, unknown>;
  const scheduledAt = asDate(data.scheduledAt);
  if (!scheduledAt || !canOperateAppointmentQueue(scheduledAt)) {
    throw new Error(appointmentQueueDayErrorMessage());
  }
  const company = await loadCompanyForAppointments(db, companyId);
  if (!company) throw new Error("Estabelecimento não encontrado.");
  const entryId = data.queueEntryId as string | undefined;
  if (!entryId || data.status !== "arrival_confirmed") {
    throw new Error("Só dá para passar quem já confirmou presença e é o próximo.");
  }
  const entry = await db.doc(`companies/${companyId}/queue/${entryId}`).get();
  if (!entry.exists || entry.data()?.status !== "waiting") {
    throw new Error("Esse cliente não está mais na fila.");
  }
  const lane = (data.professionalId as string | undefined) || "";
  const waitingSnap = await db
    .collection(`companies/${companyId}/queue`)
    .where("source", "==", "appointment")
    .get();
  const first = waitingSnap.docs
    .filter((doc) => doc.data().status === "waiting")
    .filter((doc) => ((doc.data().professionalId as string | undefined) || "") === lane)
    .sort(
      (a, b) =>
        (asDate(a.data().scheduledAt)?.getTime() ?? 0) -
        (asDate(b.data().scheduledAt)?.getTime() ?? 0),
    )[0];
  if (first?.id !== entryId) {
    throw new Error("Só o próximo da fila exclusiva pode ser passado.");
  }
  await passQueueEntry(db, company, entryId, entry.data()!);
  await syncAppointmentLane(db, companyId, data.professionalId as string | undefined);
}

export async function callAppointment(
  db: Firestore,
  companyId: string,
  appointmentId: string,
  professionalId?: string,
): Promise<void> {
  const ref = db.doc(`companies/${companyId}/appointments/${appointmentId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Agendamento não encontrado.");
  const data = snap.data() as Record<string, unknown>;
  if (data.status !== "arrival_confirmed") {
    throw new Error("O cliente ainda não confirmou que vai.");
  }
  const scheduledAt = asDate(data.scheduledAt);
  if (!scheduledAt || !canOperateAppointmentQueue(scheduledAt)) {
    throw new Error(appointmentQueueDayErrorMessage());
  }
  const company = await loadCompanyForAppointments(db, companyId);
  if (!company) throw new Error("Estabelecimento não encontrado.");
  const entryId = data.queueEntryId as string | undefined;
  if (!entryId) throw new Error("Cliente ainda não entrou na fila.");
  const entryRef = db.doc(`companies/${companyId}/queue/${entryId}`);
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists || entrySnap.data()?.status !== "waiting") {
    throw new Error("Esse cliente não está mais na fila.");
  }
  let assignedId = (data.professionalId as string | undefined) || professionalId;
  let assignedName = (data.professionalName as string | undefined) || undefined;
  if ((company.serviceMode ?? "single") === "pool" && professionalId) {
    const pro = await db.doc(`companies/${companyId}/professionals/${professionalId}`).get();
    if (!pro.exists || pro.data()?.active === false) {
      throw new Error("Profissional indisponível.");
    }
    assignedId = professionalId;
    assignedName = (pro.data()?.name as string) ?? assignedName;
  }
  await entryRef.update({
    status: "in_service",
    startedAt: FieldValue.serverTimestamp(),
    professionalId: assignedId ?? null,
    professionalName: assignedName ?? null,
  });
  await ref.update({
    status: "in_service",
    professionalId: assignedId ?? null,
    professionalName: assignedName ?? null,
  });
  const token = data.publicToken as string | undefined;
  if (token) {
    await db.doc(`publicQueue/${token}`).set(
      {
        status: "in_service",
        position: 0,
        estimatedWaitMin: 0,
        appointmentStatus: "in_service",
        queueKind: "appointment",
        professionalName: assignedName ?? "",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await syncAppointmentLane(db, companyId, (data.professionalId as string | undefined) || assignedId);
}

export async function completeAppointmentFromQueue(
  db: Firestore,
  companyId: string,
  entryData: Record<string, unknown>,
): Promise<void> {
  const appointmentId = entryData.appointmentId as string | undefined;
  if (entryData.source !== "appointment" || !appointmentId) return;
  await db.doc(`companies/${companyId}/appointments/${appointmentId}`).update({
    status: "completed",
  });
  await releaseClientAppointmentLock(
    db,
    companyId,
    (entryData.clientId as string | undefined) ?? null,
    appointmentId,
  );
  const scheduledAt = asDate(entryData.scheduledAt);
  if (scheduledAt) {
    await releaseAppointmentSlot(
      db,
      companyId,
      scheduledAt,
      (entryData.professionalId as string | undefined) ?? null,
      appointmentId,
    );
  }
  const token = entryData.publicToken as string | undefined;
  if (token) {
    await db.doc(`publicQueue/${token}`).set(
      {
        status: "completed",
        appointmentStatus: "completed",
        queueKind: "appointment",
        position: 0,
        estimatedWaitMin: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await syncAppointmentLane(db, companyId, entryData.professionalId as string | undefined);
}

export async function listAppointmentsForDay(
  db: Firestore,
  companyId: string,
  dateISO: string,
): Promise<Appointment[]> {
  const dayStart = zonedDateTime(dateISO, "00:00");
  const dayEnd = zonedDateTime(dateISO, "23:59");
  if (!dayStart || !dayEnd) return [];
  await syncAppointmentLane(db, companyId, null).catch(() => undefined);
  const professionals = await listProfessionals(db, companyId);
  await Promise.all(
    professionals.map((pro) => syncAppointmentLane(db, companyId, pro.id).catch(() => undefined)),
  );
  const snap = await db
    .collection(`companies/${companyId}/appointments`)
    .where("scheduledAt", ">=", Timestamp.fromDate(dayStart))
    .where("scheduledAt", "<=", Timestamp.fromDate(dayEnd))
    .get();
  const mapped = snap.docs.map((doc) =>
    mapAppointment(doc.id, doc.data() as Record<string, unknown>),
  );
  const healed: Appointment[] = [];
  for (const appointment of mapped) {
    if (
      ACTIVE_CLIENT_APPOINTMENT_STATUSES.includes(appointment.status) &&
      appointment.publicToken
    ) {
      const pub = await db.doc(`publicQueue/${appointment.publicToken}`).get();
      if (pub.exists && (pub.data()?.status as string) === "cancelled") {
        await cancelAppointmentByClientWithdraw(db, companyId, appointment.id);
        healed.push({ ...appointment, status: "cancelled" });
        continue;
      }
    }
    healed.push(appointment);
  }
  return healed.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Contagem de reservas ativas por dia no mês (YYYY-MM), fuso America/Sao_Paulo. */
export async function listAppointmentDayMarkers(
  db: Firestore,
  companyId: string,
  monthISO: string,
): Promise<Record<string, number>> {
  if (!/^\d{4}-\d{2}$/.test(monthISO)) return {};
  const [yearRaw, monthRaw] = monthISO.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startISO = `${monthISO}-01`;
  const endISO = `${monthISO}-${String(lastDay).padStart(2, "0")}`;
  const dayStart = zonedDateTime(startISO, "00:00");
  const dayEnd = zonedDateTime(endISO, "23:59");
  if (!dayStart || !dayEnd) return {};

  const snap = await db
    .collection(`companies/${companyId}/appointments`)
    .where("scheduledAt", ">=", Timestamp.fromDate(dayStart))
    .where("scheduledAt", "<=", Timestamp.fromDate(dayEnd))
    .get();

  const markers: Record<string, number> = {};
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (!OCCUPIED.has(data.status as AppointmentStatus)) continue;
    const scheduledAt = asDate(data.scheduledAt);
    if (!scheduledAt) continue;
    const key = DAY_KEY_FORMATTER.format(scheduledAt);
    markers[key] = (markers[key] ?? 0) + 1;
  }
  return markers;
}
