import { auth } from "@/lib/firebase/config";
import { getDeviceHeaders } from "@/lib/auth/device-id";
import { PlanLimitError } from "@/lib/billing/plan-limits";
import type { InviteRole } from "@/lib/permissions";

export async function createStaffInvite(
  companyId: string,
  email: string,
  _createdBy: string,
  companyName: string,
  role: InviteRole = "base",
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Não autenticado.");

  const idToken = await user.getIdToken();
  const response = await fetch("/api/invites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      ...getDeviceHeaders(),
    },
    body: JSON.stringify({ companyId, email, companyName, role }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    inviteId?: string;
    error?: string;
  };

  if (!response.ok) {
    const message = data.error ?? "Não foi possível criar o convite.";
    if (response.status === 403 && message.toLowerCase().includes("limite")) {
      throw new PlanLimitError("staff_limit", message);
    }
    throw new Error(message);
  }

  if (!data.inviteId) throw new Error("Resposta inválida ao criar convite.");
  return data.inviteId;
}
