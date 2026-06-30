import type { Firestore } from "firebase-admin/firestore";
import {
  assertCompanyOwner,
  CompanyAccessError,
} from "@/lib/company/company-access-server";
import type { MemberRole } from "@/lib/types";

export interface TeamRoleUpdate {
  userId: string;
  role: Extract<MemberRole, "admin" | "base">;
}

export async function applyTeamChangesServer(
  db: Firestore,
  uid: string,
  companyId: string,
  roleUpdates: TeamRoleUpdate[],
  removals: string[],
): Promise<void> {
  if (roleUpdates.length === 0 && removals.length === 0) return;

  await assertCompanyOwner(db, uid, companyId);

  for (const { userId, role } of roleUpdates) {
    const memberRef = db.doc(`members/${userId}`);
    const snap = await memberRef.get();
    if (!snap.exists) {
      throw new CompanyAccessError("not_found", "Membro da equipe não encontrado.");
    }

    const data = snap.data()!;
    if (data.companyId !== companyId) {
      throw new CompanyAccessError("forbidden", "Membro não pertence a este estabelecimento.");
    }
    if (data.role === "owner" || userId === uid) {
      throw new CompanyAccessError("forbidden", "Não é possível alterar o papel do dono.");
    }
    if (role !== "admin" && role !== "base") {
      throw new CompanyAccessError("forbidden", "Papel inválido.");
    }

    await memberRef.update({ role });
  }

  for (const userId of removals) {
    if (userId === uid) {
      throw new CompanyAccessError("forbidden", "Não é possível remover o dono do estabelecimento.");
    }

    const memberRef = db.doc(`members/${userId}`);
    const snap = await memberRef.get();
    if (!snap.exists) continue;

    const data = snap.data()!;
    if (data.companyId !== companyId) {
      throw new CompanyAccessError("forbidden", "Membro não pertence a este estabelecimento.");
    }
    if (data.role === "owner") {
      throw new CompanyAccessError("forbidden", "Não é possível remover o dono do estabelecimento.");
    }

    await memberRef.delete();
  }
}
