"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getAuthErrorMessage, login } from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/lib/context/AuthContext";
import {
  logoutPlatformSession,
  notifyPlatformAuthFailure,
  startPlatformAuth,
  verifyPlatformSession,
} from "@/lib/platform/client";
import { storePlatform2faPending } from "@/lib/platform/platform-2fa-client";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { LegalFooterStrip } from "@/components/legal/LegalFooterStrip";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface PlatformAuthFormProps {
  adminEmail: string;
}

export function PlatformAuthForm({ adminEmail }: PlatformAuthFormProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslations("platform");
  const { t: tc } = useTranslations("common");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    void (async () => {
      const hasSession = await verifyPlatformSession();
      if (hasSession && user) {
        router.replace("/platform");
        return;
      }
      if (hasSession && !user) {
        await logoutPlatformSession();
      }
    })();
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const credential = await login(adminEmail, password);
      const idToken = await credential.user.getIdToken(true);
      const result = await startPlatformAuth(idToken);

      if (!result.requiresOtp) {
        router.replace("/platform");
        return;
      }

      if (!result.challengeId) {
        throw new Error(t("loadError"));
      }

      storePlatform2faPending({ challengeId: result.challengeId, idToken });
      router.replace("/platform/auth/verify-2fa");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const isFirebaseAuthError = Boolean(code?.startsWith("auth/"));
      const message = isFirebaseAuthError
        ? getAuthErrorMessage(err)
        : err instanceof Error && err.message
          ? err.message
          : getAuthErrorMessage(err);

      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        await notifyPlatformAuthFailure("login_failed_password", adminEmail);
      } else if (code === "auth/user-not-found") {
        await notifyPlatformAuthFailure("login_failed_unauthorized", adminEmail);
      }
      if (message.includes("Acesso negado") || message.includes("403")) {
        await signOut(auth);
        await notifyPlatformAuthFailure("login_failed_unauthorized", adminEmail);
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-on-surface-variant">
        {tc("loading")}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-10">
        <div className={cn(surfaceCard, "w-full max-w-md p-6 md:p-8")}>
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-semibold text-on-surface">
              {t("loginTitle")}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">{t("loginSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <SettingsFeedback error={error} />

            <label className="block text-sm">
              <span className="text-on-surface-variant">{t("fixedEmailLabel")}</span>
              <input
                type="email"
                value={adminEmail}
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant"
              />
            </label>

            <label className="block text-sm">
              <span className="text-on-surface-variant">{t("passwordLabel")}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-outline-variant/60 bg-surface-container px-3 py-2.5 text-sm"
              />
            </label>

            <SettingsButton
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={!password}
              className="w-full"
            >
              {t("loginSubmit")}
            </SettingsButton>
          </form>
        </div>
      </div>
      <LegalFooterStrip variant="default" className="shrink-0" />
    </div>
  );
}
