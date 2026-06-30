import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeRole } from "@/lib/permissions";

export class AcceptInviteError extends Error {
  code: "invalid" | "expired" | "email_mismatch" | "already_member";

  constructor(code: AcceptInviteError["code"], message: string) {
    super(message);
    this.name = "AcceptInviteError";
    this.code = code;
  }
}

export async function acceptInviteServer(
  db: Firestore,
  inviteId: string,
  userId: string,
  email: string,
): Promise<{ companyId: string; role: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const memberRef = db.doc(`members/${userId}`);
  const existingMember = await memberRef.get();
  if (existingMember.exists) {
    throw new AcceptInviteError(
      "already_member",
      "Esta conta já pertence a um estabelecimento.",
    );
  }

  const inviteRef = db.doc(`invites/${inviteId}`);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    throw new AcceptInviteError("invalid", "Convite inválido ou expirado.");
  }

  const data = inviteSnap.data()!;
  const expiresAt = data.expiresAt?.toDate?.() as Date | undefined;
  if (data.used || (expiresAt && expiresAt < new Date())) {
    throw new AcceptInviteError("expired", "Convite inválido ou expirado.");
  }

  const invitedEmail = (data.email as string | undefined)?.trim().toLowerCase();
  if (invitedEmail && normalizedEmail !== invitedEmail) {
    throw new AcceptInviteError(
      "email_mismatch",
      "Use o e-mail para o qual o convite foi enviado.",
    );
  }

  const inviteRole = normalizeRole(data.role as string | undefined);
  if (inviteRole === "owner") {
    throw new AcceptInviteError("invalid", "Convite inválido.");
  }

  const companyId = data.companyId as string;

  await db.runTransaction(async (transaction) => {
    const freshInvite = await transaction.get(inviteRef);
    if (!freshInvite.exists) {
      throw new AcceptInviteError("invalid", "Convite inválido ou expirado.");
    }
    const freshData = freshInvite.data()!;
    const freshExpires = freshData.expiresAt?.toDate?.() as Date | undefined;
    if (freshData.used || (freshExpires && freshExpires < new Date())) {
      throw new AcceptInviteError("expired", "Convite inválido ou expirado.");
    }

    transaction.set(memberRef, {
      companyId,
      email: normalizedEmail,
      role: inviteRole,
    });
    transaction.update(inviteRef, { used: true, acceptedAt: FieldValue.serverTimestamp() });
  });

  return { companyId, role: inviteRole };
}

export async function getInvitePreviewServer(
  db: Firestore,
  inviteId: string,
): Promise<{ valid: boolean; companyName: string }> {
  const snap = await db.doc(`invites/${inviteId}`).get();
  if (!snap.exists) {
    return { valid: false, companyName: "" };
  }

  const data = snap.data()!;
  const expiresAt = data.expiresAt?.toDate?.() as Date | undefined;
  const valid = !data.used && !(expiresAt && expiresAt < new Date());

  return {
    valid,
    companyName: (data.companyName as string | undefined) ?? "",
  };
}
