import { auth } from "@/lib/firebase/config";
import type { CompanyUpdateInput } from "@/lib/company/update-company-server";
import type { TeamRoleUpdate } from "@/lib/company/update-team-server";
import {
  CompanyNameTakenError,
  InvalidCompanyNameError,
} from "@/lib/utils/company-slug";

interface SettingsApiBody {
  company?: CompanyUpdateInput;
  team?: {
    roleUpdates?: TeamRoleUpdate[];
    removals?: string[];
  };
}

async function postCompanySettings(body: SettingsApiBody): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Não autenticado.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/company/settings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    slug?: string;
  };

  if (!response.ok) {
    if (data.code === "company/name-already-in-use") {
      throw new CompanyNameTakenError(data.slug ?? "");
    }
    if (data.code === "company/invalid-name") {
      throw new InvalidCompanyNameError(data.error ?? "Nome inválido.");
    }
    if (response.status === 403) {
      const err = new Error(
        data.error ??
          "Sem permissão para salvar. Apenas o dono do estabelecimento pode alterar as configurações.",
      );
      (err as Error & { code?: string }).code = "permission-denied";
      throw err;
    }

    throw new Error(data.error ?? "Não foi possível salvar as configurações.");
  }
}

export async function updateCompanyViaApi(
  _companyId: string,
  data: CompanyUpdateInput,
): Promise<void> {
  await postCompanySettings({ company: data });
}

export async function updateMemberRoleViaApi(
  userId: string,
  role: TeamRoleUpdate["role"],
): Promise<void> {
  await postCompanySettings({
    team: { roleUpdates: [{ userId, role }] },
  });
}

export async function removeMemberViaApi(
  userId: string,
  _companyOwnerId: string,
): Promise<void> {
  await postCompanySettings({
    team: { removals: [userId] },
  });
}
