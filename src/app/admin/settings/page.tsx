"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  Quote,
  Save,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { getAuthErrorMessage } from "@/lib/firebase/auth";
import {
  removeMember,
  updateCompany,
  updateMemberRole,
} from "@/lib/firebase/firestore";
import { getCompanyErrorMessage } from "@/lib/utils/company-slug";
import { formatLogoUploadError, uploadCompanyLogo } from "@/lib/firebase/storage";
import { sanitizeLogoUrl } from "@/lib/firebase/storage-url";
import { RoleRouteGuard } from "@/components/auth/RoleRouteGuard";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  canManageCompany,
  canManageTeam,
  canUploadLogo,
} from "@/lib/permissions";
import { BrandPreview } from "@/components/settings/BrandPreview";
import { LogoUploadZone } from "@/components/settings/LogoUploadZone";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import {
  SettingsField,
  settingsInputClass,
  settingsInputWithIconClass,
} from "@/components/settings/SettingsField";
import { SettingsLabel } from "@/components/settings/SettingsLabel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { TeamSection, teamRolesFromMembers } from "@/components/settings/TeamSection";
import { PlanUpgradeNotice } from "@/components/billing/PlanUpgradeNotice";
import { SettingsAccountBadge } from "@/components/settings/SettingsAccountBadge";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { canOperateQueue } from "@/lib/billing/trial";
import { validateAccentContrast } from "@/lib/utils/contrast";
import { useTranslations } from "@/components/providers/LocaleProvider";
import {
  surfaceCard,
  surfaceSegmentOptionActive,
  surfaceSegmentTrack,
} from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import type { InviteRole } from "@/lib/permissions";
import type { Company, CompanyMember } from "@/lib/types";

const DEFAULT_ACCENT = "#FF6600";

type SettingsSnapshot = {
  name: string;
  tagline: string;
  accentColor: string;
  logoUrl: string;
  avgServiceTimeMin: number;
  toleranceEnabled: boolean;
  toleranceMin: number;
  contactWhatsapp: string;
};

function snapshotFromCompany(company: Company): SettingsSnapshot {
  return {
    name: company.name,
    tagline: company.brand?.tagline ?? "",
    accentColor: company.brand?.accentColor ?? DEFAULT_ACCENT,
    logoUrl: sanitizeLogoUrl(company.brand?.logoUrl),
    avgServiceTimeMin: company.avgServiceTimeMin,
    toleranceEnabled: company.toleranceEnabled,
    toleranceMin: company.toleranceMin,
    contactWhatsapp: company.contactWhatsapp ?? "",
  };
}

function SettingsForm({
  company,
  onSaved,
}: {
  company: Company;
  onSaved: () => Promise<void>;
}) {
  const { user, member, company: authCompany } = useAuth();
  const planLimits = usePlanLimits(authCompany ?? company);
  const operationsDisabled = !(authCompany ?? company)
    ? false
    : !canOperateQueue(authCompany ?? company);
  const { t } = useTranslations("settings");
  const { t: tc } = useTranslations("common");
  const canEdit = canManageCompany(member?.role);
  const canUpload =
    !!user && canUploadLogo(member?.role, user.uid, company.ownerId);
  const showTeam =
    !!user && canManageTeam(user.uid, company.ownerId);
  const [name, setName] = useState(company.name);
  const [tagline, setTagline] = useState(company.brand?.tagline ?? "");
  const [accentColor, setAccentColor] = useState(company.brand?.accentColor ?? DEFAULT_ACCENT);
  const [logoUrl, setLogoUrl] = useState(() =>
    sanitizeLogoUrl(company.brand?.logoUrl),
  );
  const [avgServiceTimeMin, setAvgServiceTimeMin] = useState(company.avgServiceTimeMin);
  const [toleranceEnabled, setToleranceEnabled] = useState(company.toleranceEnabled);
  const [toleranceMin, setToleranceMin] = useState(company.toleranceMin);
  const [contactWhatsapp, setContactWhatsapp] = useState(company.contactWhatsapp ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [baseline, setBaseline] = useState(() => snapshotFromCompany(company));
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [teamRoleBaseline, setTeamRoleBaseline] = useState<Record<string, InviteRole>>({});
  const [teamRoleDraft, setTeamRoleDraft] = useState<Record<string, InviteRole>>({});
  const [teamRemovals, setTeamRemovals] = useState<Set<string>>(() => new Set());
  const [teamRefreshKey, setTeamRefreshKey] = useState(0);
  const saveFooterRef = useRef<HTMLDivElement>(null);
  const teamSyncKeyRef = useRef(-1);

  const hasFormChanges = useMemo(() => {
    const current = {
      name: name.trim(),
      tagline: tagline.trim(),
      accentColor,
      logoUrl: logoUrl.trim(),
      avgServiceTimeMin,
      toleranceEnabled,
      toleranceMin,
      contactWhatsapp: contactWhatsapp.replace(/\D/g, ""),
    };
    return (
      current.name !== baseline.name.trim() ||
      current.tagline !== baseline.tagline.trim() ||
      current.accentColor !== baseline.accentColor ||
      current.logoUrl !== baseline.logoUrl.trim() ||
      current.avgServiceTimeMin !== baseline.avgServiceTimeMin ||
      current.toleranceEnabled !== baseline.toleranceEnabled ||
      current.toleranceMin !== baseline.toleranceMin ||
      current.contactWhatsapp !== baseline.contactWhatsapp.replace(/\D/g, "")
    );
  }, [name, tagline, accentColor, logoUrl, avgServiceTimeMin, toleranceEnabled, toleranceMin, contactWhatsapp, baseline]);

  const hasTeamChanges = useMemo(() => {
    if (teamRemovals.size > 0) return true;
    return Object.keys(teamRoleDraft).some(
      (userId) => teamRoleDraft[userId] !== teamRoleBaseline[userId],
    );
  }, [teamRoleDraft, teamRoleBaseline, teamRemovals]);

  const hasChanges = hasFormChanges || (showTeam && hasTeamChanges);

  const handleMembersLoaded = useCallback(
    (loaded: CompanyMember[]) => {
      if (teamSyncKeyRef.current === teamRefreshKey) return;
      teamSyncKeyRef.current = teamRefreshKey;
      const roles = teamRolesFromMembers(loaded, company.ownerId);
      setTeamRoleBaseline(roles);
      setTeamRoleDraft(roles);
      setTeamRemovals(new Set());
    },
    [company.ownerId, teamRefreshKey],
  );

  const handleRoleDraftChange = useCallback((userId: string, role: InviteRole) => {
    setTeamRoleDraft((prev) => ({ ...prev, [userId]: role }));
  }, []);

  const handleRemovalDraftToggle = useCallback((userId: string) => {
    setTeamRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (hasChanges && settingsSaved) {
      setSettingsSaved(false);
    }
  }, [hasChanges, settingsSaved]);

  useEffect(() => {
    if (!settingsSaved || !saveFooterRef.current) return;
    saveFooterRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [settingsSaved]);

  async function handleLogoUpload(file: File) {
    if (!canUpload) {
      setError("Sem permissão para enviar a logo.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadCompanyLogo(company.id, file);
      setLogoUrl(url);
      setNotice("Logo enviada. Salve as configurações para aplicar.");
    } catch (err) {
      setError(formatLogoUploadError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSuggestColor() {
    if (!logoUrl) {
      setError("Informe ou envie uma logo primeiro.");
      return;
    }
    setExtracting(true);
    setError("");
    try {
      const res = await fetch("/api/extract-brand-color", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: logoUrl }),
      });
      const data = await res.json();
      if (data.color) {
        setAccentColor(data.color);
        setNotice("Cor sugerida aplicada. Revise o contraste antes de salvar.");
      }
    } catch {
      setError("Não foi possível extrair a cor da logo.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hasChanges) return;

    setError("");
    setNotice("");

    if (hasFormChanges) {
      const contrast = validateAccentContrast(accentColor);
      if (!contrast.valid) {
        setError(contrast.message ?? "Cor de destaque inválida.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (hasFormChanges) {
        await updateCompany(company.id, {
          name: name.trim(),
          avgServiceTimeMin,
          toleranceEnabled: planLimits.canUseTolerance ? toleranceEnabled : false,
          toleranceMin: planLimits.canUseTolerance ? toleranceMin : company.toleranceMin,
          contactWhatsapp: contactWhatsapp.replace(/\D/g, ""),
          brand: {
            accentColor: planLimits.canUseLogoBranding ? accentColor : company.brand?.accentColor,
            logoUrl: planLimits.canUseLogoBranding
              ? logoUrl.trim() || undefined
              : company.brand?.logoUrl,
            tagline: planLimits.canUseFullBranding
              ? tagline.trim() || undefined
              : company.brand?.tagline,
          },
        });
        setBaseline({
          name: name.trim(),
          tagline: tagline.trim(),
          accentColor,
          logoUrl: logoUrl.trim(),
          avgServiceTimeMin,
          toleranceEnabled,
          toleranceMin,
          contactWhatsapp: contactWhatsapp.replace(/\D/g, ""),
        });
      }

      if (showTeam && hasTeamChanges) {
        for (const [userId, role] of Object.entries(teamRoleDraft)) {
          if (teamRemovals.has(userId)) continue;
          if (teamRoleBaseline[userId] !== role) {
            await updateMemberRole(userId, role);
          }
        }
        for (const userId of teamRemovals) {
          await removeMember(userId, company.ownerId);
        }
        setTeamRefreshKey((key) => key + 1);
      }

      await onSaved();
      setSettingsSaved(true);
    } catch (err) {
      const companyMessage = getCompanyErrorMessage(err);
      if (companyMessage) {
        setError(companyMessage);
      } else {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code: string }).code)
            : "";
        if (code === "permission-denied") {
          setError(
            "Sem permissão para salvar. Apenas o dono do estabelecimento pode alterar as configurações.",
          );
        } else {
          setError(getAuthErrorMessage(err) || "Não foi possível salvar as configurações.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_min(400px,38%)] lg:items-start">
        {/* Coluna formulário */}
        <div className="flex flex-col gap-4">
          {settingsSaved && (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary shadow-surface-card"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <div>
                <p className="font-medium">Configurações salvas com sucesso</p>
                <p className="mt-0.5 text-xs text-primary/80">
                  Suas alterações já estão ativas para a equipe e para os clientes na fila.
                </p>
              </div>
            </div>
          )}

          <SettingsSection
            title={t("brand")}
            description={t("brandDescription")}
            info={t("info.brandSection")}
            infoLabel={tc("infoMore")}
            icon={Store}
            compact
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SettingsField
                label={t("brandName")}
                info={t("info.brandName")}
                infoLabel={tc("infoMore")}
                icon={Store}
              >
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={settingsInputWithIconClass(true)}
                />
              </SettingsField>

              <SettingsField
                label={t("tagline")}
                info={t("info.tagline")}
                infoLabel={tc("infoMore")}
                icon={Quote}
              >
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Seus momentos, sem filas."
                  disabled={!planLimits.canUseFullBranding}
                  className={settingsInputWithIconClass(true)}
                />
              </SettingsField>
            </div>

            {!planLimits.canUseFullBranding && (
              <PlanUpgradeNotice feature="branding" />
            )}

            <div className="flex flex-col gap-3">
              <div>
                <SettingsLabel info={t("info.accentColor")} infoLabel={tc("infoMore")}>
                  {t("accentColor")}
                </SettingsLabel>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className={cn("relative", planLimits.canUseLogoBranding ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
                    <span
                      className="block h-10 w-10 rounded-xl border border-outline-variant shadow-surface-input"
                      style={{ backgroundColor: accentColor }}
                    />
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                      disabled={!planLimits.canUseLogoBranding}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                  <input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    disabled={!planLimits.canUseLogoBranding}
                    className="h-10 w-24 rounded-xl border border-outline-variant bg-surface-container-low px-2 font-mono text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setAccentColor(DEFAULT_ACCENT)}
                    className="h-7 w-7 rounded-lg border border-outline-variant"
                    style={{ backgroundColor: DEFAULT_ACCENT }}
                    title="Laranja Waitless"
                  />
                  <SettingsButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={Sparkles}
                    loading={extracting}
                    disabled={!planLimits.canUseLogoBranding}
                    onClick={handleSuggestColor}
                  >
                    Sugerir
                  </SettingsButton>
                </div>
              </div>

              <div>
                <SettingsLabel info={t("info.logo")} infoLabel={tc("infoMore")}>
                  {t("logo")}
                </SettingsLabel>
                <div className="mt-2">
                  <LogoUploadZone
                    logoUrl={logoUrl}
                    uploading={uploading}
                    canUpload={canUpload && planLimits.canUseLogoBranding}
                    onUpload={handleLogoUpload}
                    onUrlChange={setLogoUrl}
                    onClear={() => setLogoUrl("")}
                  />
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title={t("operation")}
            description={t("operationDescription")}
            info={t("info.operationSection")}
            infoLabel={tc("infoMore")}
            icon={Clock}
            compact
          >
            <div className="flex flex-col gap-4">
              <div>
                <SettingsLabel info={t("info.avgServiceTime")} infoLabel={tc("infoMore")}>
                  {t("avgServiceTime")}
                </SettingsLabel>
                <div className="mt-2 flex w-fit items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAvgServiceTimeMin((v) => Math.max(1, v - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high"
                    aria-label="Diminuir"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={avgServiceTimeMin}
                    onChange={(e) => setAvgServiceTimeMin(Number(e.target.value))}
                    className={cn(
                      settingsInputClass,
                      "h-10 w-16 text-center tabular-nums [-moz-appearance:textfield] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setAvgServiceTimeMin((v) => Math.min(120, v + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <SettingsLabel info={t("info.tolerance")} infoLabel={tc("infoMore")}>
                  {t("tolerance")}
                </SettingsLabel>
                {!planLimits.canUseTolerance && (
                  <div className="mb-3">
                    <PlanUpgradeNotice feature="tolerance" />
                  </div>
                )}
                <div className={cn("mt-2 flex h-10", surfaceSegmentTrack, !planLimits.canUseTolerance && "opacity-60")}>
                  <button
                    type="button"
                    onClick={() => setToleranceEnabled(false)}
                    disabled={!planLimits.canUseTolerance}
                    className={cn(
                      "flex-1 rounded-lg text-xs font-medium transition-all",
                      !toleranceEnabled
                        ? surfaceSegmentOptionActive
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {t("toleranceOff")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setToleranceEnabled(true)}
                    disabled={!planLimits.canUseTolerance}
                    className={cn(
                      "flex-1 rounded-lg text-xs font-medium transition-all",
                      toleranceEnabled
                        ? surfaceSegmentOptionActive
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {t("toleranceOn")}
                  </button>
                </div>
                {toleranceEnabled && (
                  <div className="mt-3">
                    <SettingsLabel
                      info={t("info.toleranceMin")}
                      infoLabel={tc("infoMore")}
                      className="mb-2"
                    >
                      {t("tolerance")} ({tc("minutesFull")})
                    </SettingsLabel>
                    <div className="flex w-fit items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setToleranceMin((v) => Math.max(1, v - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high"
                      aria-label="Diminuir tolerância"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={toleranceMin}
                      onChange={(e) => setToleranceMin(Number(e.target.value))}
                      className={cn(
                        settingsInputClass,
                        "h-10 w-16 text-center tabular-nums [-moz-appearance:textfield] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setToleranceMin((v) => Math.min(30, v + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high"
                      aria-label="Aumentar tolerância"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-on-surface-variant">{tc("minutesFull")}</span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <SettingsField
                  label={t("contactWhatsapp")}
                  hint={t("contactWhatsappHint")}
                  info={t("info.contactWhatsapp")}
                  infoLabel={tc("infoMore")}
                >
                  <input
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                    autoComplete="tel"
                    className={settingsInputClass}
                  />
                </SettingsField>
              </div>
            </div>
          </SettingsSection>

          {showTeam && (
            <SettingsSection
              title={t("team")}
              description={t("teamDescription")}
              info={t("info.team")}
              infoLabel={tc("infoMore")}
              icon={Users}
              compact
            >
              {user && (
                <TeamSection
                  companyId={company.id}
                  companyName={company.name}
                  ownerId={company.ownerId}
                  currentUserId={user.uid}
                  roleDrafts={teamRoleDraft}
                  roleBaseline={teamRoleBaseline}
                  onRoleDraftChange={handleRoleDraftChange}
                  removalDrafts={teamRemovals}
                  onRemovalDraftToggle={handleRemovalDraftToggle}
                  onMembersLoaded={handleMembersLoaded}
                  refreshKey={teamRefreshKey}
                  operationsDisabled={operationsDisabled}
                />
              )}
            </SettingsSection>
          )}

          <div
            ref={saveFooterRef}
            className={cn(
              surfaceCard,
              "px-4 py-4 transition-colors",
              settingsSaved
                ? "border-primary/30 bg-primary/5"
                : "border-outline-variant",
            )}
          >
            {(error || notice || settingsSaved) && (
              <div className="mb-4">
                <SettingsFeedback
                  error={error}
                  success={
                    settingsSaved
                      ? "Tudo certo — suas alterações foram salvas."
                      : notice || undefined
                  }
                />
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-on-surface-variant">
                {error
                  ? "Corrija o problema abaixo e tente salvar novamente."
                  : settingsSaved
                    ? "Suas alterações foram salvas e já estão em vigor."
                    : hasChanges
                      ? notice
                        ? notice
                        : hasTeamChanges && !hasFormChanges
                          ? "Alterações na equipe não salvas até você confirmar."
                          : "Alterações não salvas até você confirmar."
                      : "Nenhuma alteração pendente."}
              </p>
              <SettingsButton
                type="submit"
                variant="primary"
                size="md"
                icon={Save}
                loading={submitting}
                disabled={!hasChanges}
                className="w-full shrink-0 sm:w-auto"
              >
                Salvar configurações
              </SettingsButton>
            </div>
          </div>
        </div>

        {/* Preview sticky */}
        <BrandPreview
          name={name}
          tagline={tagline}
          accentColor={accentColor}
          logoUrl={logoUrl}
          avgServiceTimeMin={avgServiceTimeMin}
          className="lg:sticky lg:top-6"
        />
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { user, member, company, refreshSession } = useAuth();
  const { t } = useTranslations("settings");

  return (
    <RoleRouteGuard>
    <AdminShell>
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 pt-14 md:px-6 md:py-6 md:pb-10 md:pt-6 lg:px-8"
      >
        <div className="w-full">
          <h2 className="font-heading text-xl font-semibold text-on-surface md:text-2xl">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>

          {user && company && (
            <SettingsAccountBadge user={user} member={member} company={company} />
          )}

          {company && (
            <SettingsForm
              key={company.id}
              company={company}
              onSaved={refreshSession}
            />
          )}
        </div>
      </main>
    </AdminShell>
    </RoleRouteGuard>
  );
}
