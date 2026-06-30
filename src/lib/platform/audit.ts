import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { PlatformAuditAction, PlatformAuditEntry } from "@/lib/types";

export async function writePlatformAudit(
  db: Firestore,
  input: {
    action: PlatformAuditAction;
    targetCompanyId?: string;
    targetCompanyName?: string;
    actorUid: string;
    actorEmail?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  const ref = db.collection("platformAudit").doc();
  await ref.set({
    action: input.action,
    targetCompanyId: input.targetCompanyId ?? "system",
    targetCompanyName: input.targetCompanyName ?? null,
    actorUid: input.actorUid,
    actorEmail: input.actorEmail ?? null,
    metadata: input.metadata ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function writePlatformAuthAudit(
  db: Firestore,
  input: {
    action: Extract<
      PlatformAuditAction,
      | "platform.login_success"
      | "platform.login_failed"
      | "platform.otp_failed"
      | "platform.access_denied"
    >;
    actorUid?: string;
    actorEmail?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await writePlatformAudit(db, {
    action: input.action,
    actorUid: input.actorUid ?? "anonymous",
    actorEmail: input.actorEmail,
    metadata: input.metadata,
  });
}

export function mapAuditDoc(
  id: string,
  data: FirebaseFirestore.DocumentData,
): PlatformAuditEntry {
  const createdAt = data.createdAt;
  return {
    id,
    action: data.action as PlatformAuditEntry["action"],
    targetCompanyId: data.targetCompanyId,
    targetCompanyName: data.targetCompanyName ?? undefined,
    actorUid: data.actorUid,
    actorEmail: data.actorEmail ?? undefined,
    metadata: data.metadata ?? undefined,
    createdAt:
      createdAt && typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : new Date(),
  };
}
