"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { OtpInput, type OtpInputHandle } from "@/components/ui/otp-input";
import {
  confirmEnableTwoFactor,
  sendTwoFactorCode,
  startEnableTwoFactor,
  verifyTwoFactorCode,
} from "@/lib/auth/two-factor-client";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsField } from "@/components/settings/SettingsField";

interface TwoFactorChallengeProps {
  email?: string | null;
  reason?: "new_device" | "failed_attempts";
  purpose?: "login" | "enable";
  initialChallengeId?: string;
  onVerified: () => void | Promise<void>;
  onCancel?: () => void;
}

export function TwoFactorChallenge({
  email,
  reason,
  purpose = "login",
  initialChallengeId,
  onVerified,
  onCancel,
}: TwoFactorChallengeProps) {
  const { t } = useTranslations("security");
  const [challengeId, setChallengeId] = useState(initialChallengeId ?? "");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(!initialChallengeId);
  const [error, setError] = useState("");
  const otpInputRef = useRef<OtpInputHandle>(null);

  useEffect(() => {
    if (initialChallengeId) return;

    let cancelled = false;

    async function sendCode() {
      setSending(true);
      setError("");
      try {
        const result = await sendTwoFactorCode(purpose);
        if (!cancelled) setChallengeId(result.challengeId);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("twoFactorSendError"));
        }
      } finally {
        if (!cancelled) setSending(false);
      }
    }

    void sendCode();
    return () => {
      cancelled = true;
    };
  }, [initialChallengeId, purpose, t]);

  async function handleResend() {
    setSending(true);
    setError("");
    try {
      const result =
        purpose === "enable"
          ? await startEnableTwoFactor()
          : await sendTwoFactorCode(purpose);
      setChallengeId(result.challengeId);
      setCode("");
      otpInputRef.current?.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("twoFactorSendError"));
    } finally {
      setSending(false);
    }
  }

  async function submitCode(codeToVerify: string) {
    if (!challengeId || loading || sending || codeToVerify.length !== 4) return;

    setLoading(true);
    setError("");
    try {
      if (purpose === "enable") {
        await confirmEnableTwoFactor({
          challengeId,
          code: codeToVerify,
          trustDevice,
        });
      } else {
        await verifyTwoFactorCode({
          challengeId,
          code: codeToVerify,
          trustDevice,
        });
      }
      await onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("twoFactorVerifyError"));
      otpInputRef.current?.clear();
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submitCode(code);
  }

  const reasonText =
    reason === "failed_attempts"
      ? t("twoFactorReasonFailedAttempts")
      : t("twoFactorReasonNewDevice");

  const title =
    purpose === "enable" ? t("twoFactorEnableTitle") : t("twoFactorTitle");

  const description =
    purpose === "enable"
      ? t("twoFactorEnableDescription", { email: email ?? t("yourEmail") })
      : t("twoFactorDescription", { email: email ?? t("yourEmail") });

  const HeadingTag = purpose === "enable" ? "h2" : "h1";

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" strokeWidth={2} />
        </div>
        <HeadingTag className="text-xl font-semibold text-on-surface">{title}</HeadingTag>
        <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
        {purpose === "login" && (
          <p className="mt-2 text-xs text-on-surface-variant">{reasonText}</p>
        )}
      </div>

      <SettingsFeedback error={error} />

      <SettingsField label={t("twoFactorCodeLabel")} className="w-full">
        <OtpInput
          ref={otpInputRef}
          id="two-factor-code"
          value={code}
          onChange={setCode}
          disabled={sending || !challengeId}
          autoFocus
          invalid={Boolean(error)}
          aria-label={t("twoFactorCodeLabel")}
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
        {t("twoFactorTrustDevice")}
      </label>

      <SettingsButton
        type="submit"
        variant="primary"
        size="md"
        icon={ShieldCheck}
        loading={loading}
        disabled={sending || code.length !== 4}
        className="w-full"
      >
        {purpose === "enable" ? t("twoFactorEnableConfirm") : t("twoFactorVerify")}
      </SettingsButton>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={sending}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {sending ? t("twoFactorSending") : t("twoFactorResend")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || sending}
            className="text-sm text-on-surface-variant hover:underline disabled:opacity-50"
          >
            {t("twoFactorEnableCancel")}
          </button>
        )}
      </div>
    </form>
  );
}
