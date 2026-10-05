import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import {
  SUPPORT_MESSAGE_MAX_LENGTH,
  SUPPORT_MESSAGE_MIN_LENGTH,
  SUPPORT_MESSAGES_PAGE_SIZE,
  SUPPORT_PREVIEW_MAX_LENGTH,
  type SupportMessage,
  type SupportSenderType,
  type SupportThread,
} from "@/lib/support/chat-types";

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toISOString()
      : null;
  }
  if (typeof value === "string") return value;
  return null;
}

function previewOf(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= SUPPORT_PREVIEW_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, SUPPORT_PREVIEW_MAX_LENGTH - 1)}…`;
}

export function validateSupportMessageBody(raw: unknown):
  | { ok: true; body: string }
  | { ok: false; error: "INVALID_BODY" | "EMPTY" | "TOO_LONG" } {
  if (typeof raw !== "string") return { ok: false, error: "INVALID_BODY" };
  const body = raw.trim();
  if (body.length < SUPPORT_MESSAGE_MIN_LENGTH) return { ok: false, error: "EMPTY" };
  if (body.length > SUPPORT_MESSAGE_MAX_LENGTH) return { ok: false, error: "TOO_LONG" };
  return { ok: true, body };
}

export function mapSupportThread(
  companyId: string,
  data: DocumentData | undefined,
): SupportThread {
  return {
    companyId,
    companyName: typeof data?.companyName === "string" ? data.companyName : "",
    ownerId: typeof data?.ownerId === "string" ? data.ownerId : "",
    lastMessageAt: toIso(data?.lastMessageAt),
    lastMessagePreview:
      typeof data?.lastMessagePreview === "string" ? data.lastMessagePreview : "",
    unreadForPlatform:
      typeof data?.unreadForPlatform === "number" ? data.unreadForPlatform : 0,
    unreadForTenant:
      typeof data?.unreadForTenant === "number" ? data.unreadForTenant : 0,
    updatedAt: toIso(data?.updatedAt),
  };
}

export function mapSupportMessage(
  id: string,
  data: DocumentData | undefined,
): SupportMessage {
  const senderType: SupportSenderType =
    data?.senderType === "platform" ? "platform" : "tenant";
  return {
    id,
    senderType,
    senderUid: typeof data?.senderUid === "string" ? data.senderUid : "",
    senderName: typeof data?.senderName === "string" ? data.senderName : "",
    body: typeof data?.body === "string" ? data.body : "",
    createdAt: toIso(data?.createdAt),
  };
}

export async function getSupportThread(
  db: Firestore,
  companyId: string,
): Promise<SupportThread | null> {
  const snap = await db.doc(`supportThreads/${companyId}`).get();
  if (!snap.exists) return null;
  return mapSupportThread(companyId, snap.data());
}

export async function listSupportMessages(
  db: Firestore,
  companyId: string,
  limit = SUPPORT_MESSAGES_PAGE_SIZE,
): Promise<SupportMessage[]> {
  const snap = await db
    .collection(`supportThreads/${companyId}/messages`)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs
    .map((doc) => mapSupportMessage(doc.id, doc.data()))
    .reverse();
}

export async function listSupportThreads(
  db: Firestore,
  limit = 100,
): Promise<SupportThread[]> {
  const snap = await db
    .collection("supportThreads")
    .orderBy("lastMessageAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => mapSupportThread(doc.id, doc.data()));
}

export async function ensureSupportThread(
  db: Firestore,
  input: {
    companyId: string;
    companyName: string;
    ownerId: string;
  },
): Promise<DocumentReference> {
  const ref = db.doc(`supportThreads/${input.companyId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      companyId: input.companyId,
      companyName: input.companyName,
      ownerId: input.ownerId,
      lastMessageAt: null,
      lastMessagePreview: "",
      unreadForPlatform: 0,
      unreadForTenant: 0,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    const data = snap.data() ?? {};
    const patch: Record<string, unknown> = {};
    if (data.companyName !== input.companyName) patch.companyName = input.companyName;
    if (data.ownerId !== input.ownerId) patch.ownerId = input.ownerId;
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = FieldValue.serverTimestamp();
      await ref.set(patch, { merge: true });
    }
  }
  return ref;
}

export async function appendSupportMessage(
  db: Firestore,
  input: {
    companyId: string;
    companyName: string;
    ownerId: string;
    senderType: SupportSenderType;
    senderUid: string;
    senderName: string;
    body: string;
  },
): Promise<{ thread: SupportThread; message: SupportMessage }> {
  const threadRef = await ensureSupportThread(db, {
    companyId: input.companyId,
    companyName: input.companyName,
    ownerId: input.ownerId,
  });

  const messageRef = threadRef.collection("messages").doc();
  const preview = previewOf(input.body);

  const unreadPatch =
    input.senderType === "tenant"
      ? {
          unreadForPlatform: FieldValue.increment(1),
          unreadForTenant: 0,
        }
      : {
          unreadForTenant: FieldValue.increment(1),
          unreadForPlatform: 0,
        };

  const batch = db.batch();
  batch.set(messageRef, {
    senderType: input.senderType,
    senderUid: input.senderUid,
    senderName: input.senderName,
    body: input.body,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    threadRef,
    {
      companyId: input.companyId,
      companyName: input.companyName,
      ownerId: input.ownerId,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessagePreview: preview,
      updatedAt: FieldValue.serverTimestamp(),
      ...unreadPatch,
    },
    { merge: true },
  );
  await batch.commit();

  const [threadSnap, messageSnap] = await Promise.all([
    threadRef.get(),
    messageRef.get(),
  ]);

  return {
    thread: mapSupportThread(input.companyId, threadSnap.data()),
    message: mapSupportMessage(messageRef.id, messageSnap.data()),
  };
}

export async function markSupportThreadRead(
  db: Firestore,
  companyId: string,
  side: "platform" | "tenant",
): Promise<SupportThread | null> {
  const ref = db.doc(`supportThreads/${companyId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const field = side === "platform" ? "unreadForPlatform" : "unreadForTenant";
  const current = snap.data()?.[field];
  if (typeof current === "number" && current > 0) {
    await ref.set(
      {
        [field]: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const refreshed = await ref.get();
  return mapSupportThread(companyId, refreshed.data());
}
