"use client";

import { useState } from "react";
import { Check, Copy, Crown, Shield, User } from "lucide-react";
import type { Company, Member } from "@/lib/types";
import type { User as FirebaseUser } from "firebase/auth";
import { canManageCompany, canManageTeam, getRoleLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils/cn";

interface SettingsAccountBadgeProps {
  user: FirebaseUser;
  member: Member | null;
  company: Company;
}

function getLoginProviderLabel(user: FirebaseUser): string {
  const provider = user.providerData[0]?.providerId;
  if (provider === "google.com") return "Google";
  if (provider === "password") return "E-mail e senha";
  return "Conta vinculada";
}

function formatAccountRef(uid: string): string {
  if (uid.length <= 12) return uid;
  return `${uid.slice(0, 4)}…${uid.slice(-4)}`;
}

function roleIcon(role: Member["role"] | undefined) {
  switch (role) {
    case "owner":
      return Crown;
    case "admin":
      return Shield;
    default:
      return User;
  }
}

export function SettingsAccountBadge({ user, member, company }: SettingsAccountBadgeProps) {
  const [copied, setCopied] = useState(false);

  const isCreator = user.uid === company.ownerId;
  const role = member?.role;
  const RoleIcon = roleIcon(role);
  const roleLabel = getRoleLabel(role);
  const canEdit = canManageCompany(role);
  const managesTeam = canManageTeam(user.uid, company.ownerId);
  const accountLabel = user.email ?? user.displayName ?? "Conta sem e-mail";
  const providerLabel = getLoginProviderLabel(user);

  async function copySupportRef() {
    await navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "mt-4 rounded-xl border px-4 py-3 shadow-surface-card",
        canEdit
          ? "border-primary/25 bg-primary/5"
          : "border-outline-variant/60 bg-surface-container-low",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <RoleIcon
              className={cn(
                "h-4 w-4 shrink-0",
                canEdit ? "text-primary" : "text-on-surface-variant",
              )}
              strokeWidth={2}
            />
            <span
              className={cn(
                "text-sm font-semibold",
                canEdit ? "text-primary" : "text-on-surface",
              )}
            >
              {roleLabel}
              {isCreator ? " · criador da conta" : ""}
            </span>
            {role && (
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                {role}
              </span>
            )}
          </div>

          <p className="truncate text-sm font-medium text-on-surface [text-decoration:none]">
            {accountLabel}
          </p>
          <p className="text-xs text-on-surface-variant">
            Entrou com {providerLabel}
            {managesTeam
              ? " · pode gerenciar equipe"
              : canEdit
                ? " · pode editar configurações"
                : " · acesso à fila e clientes"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void copySupportRef()}
          title="Copia a referência da conta para suporte"
          className="flex shrink-0 flex-col items-end gap-0.5 rounded-lg border border-outline-variant/60 bg-surface-container px-2.5 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <span className="flex items-center gap-1">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copiado" : "Copiar ref."}
          </span>
          <span className="font-mono text-[10px] opacity-70">{formatAccountRef(user.uid)}</span>
        </button>
      </div>
    </div>
  );
}
