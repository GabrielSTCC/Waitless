import type { Firestore } from "firebase-admin/firestore";
import { normalizeRole } from "@/lib/permissions";
import type { MemberRole } from "@/lib/types";

export class CompanyAccessError extends Error {
  constructor(
    readonly code: "not_member" | "forbidden" | "not_found",
    message: string,
  ) {
    super(message);
    this.name = "CompanyAccessError";
  }
}

export interface MemberAccess {
  companyId: string;
  email: string;
  role: MemberRole;
}

export async function loadMemberAccess(
  db: Firestore,
  uid: string,
): Promise<MemberAccess> {
  const snap = await db.doc(`members/${uid}`).get();
  if (!snap.exists) {
    throw new CompanyAccessError("not_member", "Membro não encontrado.");
  }

  const data = snap.data()!;
  return {
    companyId: data.companyId as string,
    email: data.email as string,
    role: normalizeRole(data.role as string | undefined),
  };
}

export async function assertCanEditCompany(
  db: Firestore,
  uid: string,
  companyId: string,
): Promise<MemberAccess> {
  const member = await loadMemberAccess(db, uid);
  if (member.companyId !== companyId) {
    throw new CompanyAccessError("forbidden", "Sem permissão para este estabelecimento.");
  }
  if (member.role !== "owner" && member.role !== "admin") {
    throw new CompanyAccessError(
      "forbidden",
      "Somente dono ou admin podem alterar configurações.",
    );
  }
  return member;
}

export async function assertCompanyOwner(
  db: Firestore,
  uid: string,
  companyId: string,
): Promise<void> {
  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    throw new CompanyAccessError("not_found", "Estabelecimento não encontrado.");
  }
  if (companySnap.data()?.ownerId !== uid) {
    throw new CompanyAccessError(
      "forbidden",
      "Somente o dono pode executar esta ação.",
    );
  }

  const member = await loadMemberAccess(db, uid);
  if (member.companyId !== companyId) {
    throw new CompanyAccessError("forbidden", "Sem permissão para este estabelecimento.");
  }
}
