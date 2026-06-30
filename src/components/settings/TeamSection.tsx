"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Mail, Trash2, UserPlus } from "lucide-react";
import {
  createStaffInvite,
  listCompanyMembers,
  listInvites,
  PlanLimitError,
} from "@/lib/firebase/firestore";
import { getRoleLabel, type InviteRole } from "@/lib/permissions";
import type { CompanyMember } from "@/lib/types";
import { RoleSelect } from "./RoleSelect";
import { SettingsButton } from "./SettingsButton";
import { settingsInputClass } from "./SettingsField";
import { cn } from "@/lib/utils/cn";

export function teamRolesFromMembers(
  members: CompanyMember[],
  ownerId: string,
): Record<string, InviteRole> {
  const roles: Record<string, InviteRole> = {};
  for (const member of members) {
    if (member.userId === ownerId || member.role === "owner") continue;
    roles[member.userId] = member.role === "admin" ? "admin" : "base";
  }
  return roles;
}

interface TeamSectionProps {
  companyId: string;
  companyName: string;
  ownerId: string;
  currentUserId: string;
  roleDrafts: Record<string, InviteRole>;
  roleBaseline: Record<string, InviteRole>;
  onRoleDraftChange: (userId: string, role: InviteRole) => void;
  removalDrafts: ReadonlySet<string>;
  onRemovalDraftToggle: (userId: string) => void;
  onMembersLoaded?: (members: CompanyMember[]) => void;
  refreshKey?: number;
  operationsDisabled?: boolean;
}

export function TeamSection({
  companyId,
  companyName,
  ownerId,
  currentUserId,
  roleDrafts,
  roleBaseline,
  onRoleDraftChange,
  removalDrafts,
  onRemovalDraftToggle,
  onMembersLoaded,
  refreshKey = 0,
  operationsDisabled = false,
}: TeamSectionProps) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("base");
  const [invites, setInvites] = useState<
    { id: string; email: string; role: InviteRole }[]
  >([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshTeam = useCallback(async () => {
    const [teamMembers, pendingInvites] = await Promise.all([
      listCompanyMembers(companyId),
      listInvites(companyId),
    ]);
    setMembers(teamMembers);
    setInvites(pendingInvites);
    onMembersLoaded?.(teamMembers);
  }, [companyId, onMembersLoaded]);

  useEffect(() => {
    void refreshTeam();
  }, [refreshTeam, refreshKey]);

  async function handleInvite() {
    if (operationsDisabled || !email.trim()) return;
    setError("");
    setLoading(true);
    try {
      const inviteId = await createStaffInvite(
        companyId,
        email,
        currentUserId,
        companyName,
        inviteRole,
      );
      const link = `${window.location.origin}/admin/invite/${inviteId}`;
      setLastInviteLink(link);
      setEmail("");
      await refreshTeam();
    } catch (err) {
      if (err instanceof PlanLimitError) {
        setError(err.message);
      } else {
        setError("Não foi possível criar o convite.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!lastInviteLink) return;
    await navigator.clipboard.writeText(lastInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRoleChange(userId: string, role: InviteRole) {
    setError("");
    onRoleDraftChange(userId, role);
  }

  function handleRemove(userId: string) {
    setError("");
    onRemovalDraftToggle(userId);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-lg flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleInvite();
                }
              }}
              placeholder="e-mail do convidado"
              disabled={operationsDisabled}
              className={cn(settingsInputClass, "pl-10 disabled:cursor-not-allowed disabled:opacity-50")}
            />
          </div>
          <RoleSelect
            value={inviteRole}
            onChange={setInviteRole}
            className="sm:w-36"
            aria-label="Papel do convite"
          />
          <SettingsButton
            type="button"
            variant="primary"
            size="md"
            icon={UserPlus}
            loading={loading}
            disabled={operationsDisabled}
            className="sm:shrink-0"
            onClick={() => void handleInvite()}
          >
            Convidar
          </SettingsButton>
        </div>
        <p className="text-xs text-on-surface-variant">
          Base: fila e clientes. Admin: também configurações e analytics. Só você gerencia a equipe.
        </p>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {lastInviteLink && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Link de convite · válido 7 dias · {getRoleLabel(inviteRole)}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-on-surface">{lastInviteLink}</p>
          <SettingsButton
            type="button"
            variant="secondary"
            size="sm"
            icon={copied ? Check : Copy}
            className="mt-3"
            onClick={handleCopyLink}
          >
            {copied ? "Copiado!" : "Copiar link"}
          </SettingsButton>
        </div>
      )}

      {members.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Equipe ativa
          </p>
          {members.map((member) => {
            const isCreator = member.userId === ownerId;
            const isSelf = member.userId === currentUserId;
            const busy = actionUserId === member.userId;
            const draftRole =
              roleDrafts[member.userId] ??
              (member.role === "admin" ? "admin" : "base");
            const roleChanged = roleBaseline[member.userId] !== draftRole;
            const markedForRemoval = removalDrafts.has(member.userId);

            return (
              <div
                key={member.userId}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                  markedForRemoval
                    ? "border-error/30 bg-error-container/20 opacity-70"
                    : roleChanged
                      ? "border-primary/30 bg-primary/5"
                      : "border-outline-variant/60 bg-surface-container-low shadow-surface-card",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-on-surface">{member.email}</p>
                  <p className="text-xs text-on-surface-variant">
                    {markedForRemoval
                      ? "Será removido ao salvar"
                      : roleChanged
                        ? `Papel alterado para ${getRoleLabel(draftRole)} · salve para aplicar`
                        : getRoleLabel(member.role)}
                    {isCreator ? " · dono" : ""}
                    {isSelf ? " · você" : ""}
                  </p>
                </div>
                {!isCreator && member.role !== "owner" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <RoleSelect
                      value={draftRole}
                      disabled={busy || markedForRemoval}
                      size="sm"
                      onChange={(role) => handleRoleChange(member.userId, role)}
                      aria-label={`Papel de ${member.email}`}
                    />
                    <button
                      type="button"
                      disabled={busy || isSelf}
                      onClick={() => handleRemove(member.userId)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-40",
                        markedForRemoval
                          ? "border-error/40 bg-error-container/40 text-error"
                          : "border-outline-variant text-on-surface-variant hover:border-error/40 hover:bg-error-container/30 hover:text-error",
                      )}
                      title={
                        isSelf
                          ? "Não é possível remover a si mesmo"
                          : markedForRemoval
                            ? "Desfazer remoção"
                            : "Marcar para remover ao salvar"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Convites pendentes
          </p>
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2.5"
            >
              <div>
                <span className="text-sm text-on-surface">{inv.email}</span>
                <p className="text-xs text-on-surface-variant">{getRoleLabel(inv.role)}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Pendente
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
