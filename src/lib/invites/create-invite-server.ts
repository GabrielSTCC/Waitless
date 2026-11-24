import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { assertStaffInviteAllowed } from "@/lib/billing/plan-limits";
import { assertCanOperateQueue } from "@/lib/billing/trial";
import { mapCompanyFromAdminData } from "@/lib/auth/session-server";
import { normalizeRole, type InviteRole } from "@/lib/permissions";

export async function createStaffInviteServer(
  db: Firestore,
  input: {
    companyId: string;
    email: string;
    createdBy: string;
    companyName: string;
    role: InviteRole;
  },
): Promise<string> {
  const companySnap = await db.doc(`companies/${input.companyId}`).get();
  if (!companySnap.exists) throw new Error("Empresa não encontrada.");
  const company = mapCompanyFromAdminData(companySnap.id, companySnap.data()!);
  assertCanOperateQueue(company);

  const [membersSnap, invitesSnap] = await Promise.all([
    db.collection("members").where("companyId", "==", input.companyId).limit(50).get(),
    db
      .collection("invites")
      .where("companyId", "==", input.companyId)
      .where("used", "==", false)
      .limit(20)
      .get(),
  ]);

  assertStaffInviteAllowed(
    company,
    membersSnap.size + invitesSnap.size,
  );

  const role = normalizeRole(input.role);
  if (role === "owner") throw new Error("Papel de convite inválido.");

  const inviteId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.doc(`invites/${inviteId}`).set({
    companyId: input.companyId,
    companyName: input.companyName.trim(),
    email: input.email.trim().toLowerCase(),
    role: role === "admin" ? "admin" : "base",
    createdBy: input.createdBy,
    expiresAt: Timestamp.fromDate(expiresAt),
    used: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return inviteId;
}
