"use client";

import { FormEvent, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { OtpInput, type OtpInputHandle } from "@/components/ui/otp-input";
import { verifyPlatformAuthOtp } from "@/lib/platform/client";
import { auth } from "@/lib/firebase/config";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsField } from "@/components/settings/SettingsField";

interface PlatformTwoFactorChallengeProps {
  challengeId: string;
  adminEmail: string;
  onVerified: () => void | Promise<void>;
  onCancel?: () => void;
}

export function PlatformTwoFactorChallenge({
  challengeId,
  adminEmail,
  onVerified,
  onCancel,
}: PlatformTwoFactorChallengeProps) {
  const { t } = useTranslations("platform");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpInputRef = useRef<OtpInputHandle>(null);
  const submittingRef = useRef(false);

  async function submitCode(codeToVerify: string) {
    if (submittingRef.current || loading || codeToVerify.length !== 4) return;

    submittingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error(t("otpVerifyError"));
      }

      const freshIdToken = await user.getIdToken(true);
      await verifyPlatformAuthOtp({
        idToken: freshIdToken,
        challengeId,
        code: codeToVerify,
        trustDevice,
      });
      await onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("otpVerifyError"));
      otpInputRef.current?.clear();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submitCode(code);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-semibold text-on-surface">{t("verifyTitle")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {t("verifyDescription", { email: adminEmail })}
        </p>
      </div>

      <SettingsFeedback error={error} />

      <SettingsField label={t("verifyCodeLabel")} className="w-full">
        <OtpInput
          ref={otpInputRef}
          id="platform-two-factor-code"
          value={code}
          onChange={setCode}
          disabled={loading}
          autoFocus
          invalid={Boolean(error)}
          aria-label={t("verifyCodeLabel")}
          onComplete={(completedCode) => void submitCode(completedCode)}
        />
      </SettingsField>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={trustDevice}
          onChange={(e) => setTrustDevice(e.target.checked)}
          className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
        />
        {t("trustDevice")}
      </label>

      <SettingsButton
        type="submit"
        variant="primary"
        size="md"
        icon={ShieldCheck}
        loading={loading}
        disabled={code.length !== 4}
        className="w-full"
      >
        {t("verifySubmit")}
      </SettingsButton>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="text-sm text-on-surface-variant hover:underline disabled:opacity-50"
        >
          {t("actions.cancel")}
        </button>
      )}
    </form>
  );
}
