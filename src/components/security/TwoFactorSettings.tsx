"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import { Shield, Trash2 } from "lucide-react";
import {
  disableTwoFactor,
  fetchTrustedDevices,
  revokeTrustedDevice,
  startEnableTwoFactor,
} from "@/lib/auth/two-factor-client";
import {
  getLoginProviderIds,
  userHasPasswordProvider,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsField, settingsInputClass } from "@/components/settings/SettingsField";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";

interface DeviceRow {
  id: string;
  label: string;
  lastUsedAt: string;
}

export function TwoFactorSettings() {
  const { t } = useTranslations("security");
  const { user, member, refreshSession } = useAuth();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [password, setPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [enableStep, setEnableStep] = useState<"idle" | "confirm-code">("idle");
  const [enableChallengeId, setEnableChallengeId] = useState("");

  const enabled = member?.security?.twoFactorEnabled === true;
  const hasPassword = user ? userHasPasswordProvider(user) : false;
  const hasGoogle = user ? getLoginProviderIds(user).includes("google.com") : false;

  const loadDevices = useCallback(async () => {
    if (!enabled) {
      setDevices([]);
      return;
    }
    setLoadingDevices(true);
    try {
      const rows = await fetchTrustedDevices();
      setDevices(rows);
    } catch {
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, [enabled]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  function resetEnableFlow() {
    setEnableStep("idle");
    setEnableChallengeId("");
  }

  async function reauthenticate(): Promise<void> {
    if (!user?.email) {
      throw new Error(t("twoFactorNoEmail"));
    }

    if (hasPassword) {
      if (!password) {
        throw new Error(t("currentRequired"));
      }
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return;
    }

    if (hasGoogle) {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      return;
    }

    throw new Error(t("twoFactorReauthRequired"));
  }

  async function handleToggle() {
    if (!user) return;
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      await reauthenticate();
      await user.getIdToken(true);

      if (enabled) {
        await disableTwoFactor();
        setSuccess(t("twoFactorDisabledSuccess"));
        setPassword("");
        resetEnableFlow();
        await refreshSession();
        await loadDevices();
      } else {
        const { challengeId } = await startEnableTwoFactor();
        setEnableChallengeId(challengeId);
        setEnableStep("confirm-code");
        setPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("twoFactorActionError"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnableVerified() {
    setSuccess(t("twoFactorEnabledSuccess"));
    resetEnableFlow();
    await refreshSession();
    await loadDevices();
  }

  async function handleRevoke(deviceId: string) {
    setError("");
    setActionLoading(true);
    try {
      await revokeTrustedDevice(deviceId);
      await loadDevices();
      setSuccess(t("twoFactorDeviceRevoked"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("twoFactorActionError"));
    } finally {
      setActionLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <SettingsFeedback error={error} success={success} />

      <div className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 text-sm">
        <p className="font-medium text-on-surface">
          {enabled ? t("twoFactorStatusEnabled") : t("twoFactorStatusDisabled")}
        </p>
        <p className="mt-1 text-on-surface-variant">
          {t("twoFactorEmailDestination", { email: user.email ?? t("noEmail") })}
        </p>
        <p className="mt-2 text-xs text-on-surface-variant">{t("twoFactorTriggers")}</p>
      </div>

      {enableStep === "confirm-code" ? (
        <TwoFactorChallenge
          email={user.email}
          purpose="enable"
          initialChallengeId={enableChallengeId}
          onCancel={resetEnableFlow}
          onVerified={handleEnableVerified}
        />
      ) : (
        <>
          {hasPassword && !enabled && (
            <SettingsField label={t("currentPassword")} className="w-full">
              <input
                id="two-factor-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={settingsInputClass}
              />
            </SettingsField>
          )}

          {hasPassword && enabled && (
            <SettingsField label={t("currentPassword")} className="w-full">
              <input
                id="two-factor-password-disable"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={settingsInputClass}
              />
            </SettingsField>
          )}

          <SettingsButton
            type="button"
            variant={enabled ? "secondary" : "primary"}
            size="md"
            icon={Shield}
            loading={actionLoading}
            onClick={() => void handleToggle()}
            className="self-start"
          >
            {enabled ? t("twoFactorDisable") : t("twoFactorEnable")}
          </SettingsButton>
        </>
      )}

      {enabled && enableStep === "idle" && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("twoFactorTrustedDevices")}
          </p>
          {loadingDevices ? (
            <p className="text-sm text-on-surface-variant">{t("twoFactorLoadingDevices")}</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-on-surface-variant">{t("twoFactorNoDevices")}</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-on-surface">{device.label}</p>
                    {device.lastUsedAt && (
                      <p className="text-xs text-on-surface-variant">
                        {t("twoFactorLastUsed", {
                          date: new Date(device.lastUsedAt).toLocaleString(),
                        })}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(device.id)}
                    disabled={actionLoading}
                    className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                    aria-label={t("twoFactorRevokeDevice")}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
