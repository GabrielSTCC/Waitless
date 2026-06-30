import { auth } from "@/lib/firebase/config";

export interface InvitePreview {
  valid: boolean;
  companyName: string;
}

export async function fetchInvitePreview(inviteId: string): Promise<InvitePreview> {
  const response = await fetch(`/api/invites/${encodeURIComponent(inviteId)}`);
  const data = (await response.json()) as InvitePreview & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível carregar o convite.");
  }
  return { valid: data.valid, companyName: data.companyName };
}

export async function acceptInviteViaApi(inviteId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para aceitar o convite.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(`/api/invites/${encodeURIComponent(inviteId)}/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Falha ao aceitar convite.");
  }
}
