"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { validatePassword } from "@/lib/auth/password-policy";
import {
  changeUserPassword,
  getAuthErrorMessage,
  linkPasswordToUser,
  userHasPasswordProvider,
} from "@/lib/firebase/auth";
import { PasswordStrengthChecklist } from "@/components/security/PasswordStrengthChecklist";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsField, settingsInputClass } from "@/components/settings/SettingsField";
import { cn } from "@/lib/utils/cn";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <SettingsField label={label} className="w-full">
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(settingsInputClass, "pr-10")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </SettingsField>
  );
}

export function PasswordForm() {
  const { t } = useTranslations("security");
  const { t: ta } = useTranslations("auth");
  const { user, refreshSession } = useAuth();

  const hasPassword = user ? userHasPasswordProvider(user) : false;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      setError(t("passwordRequirementsNotMet"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(ta("passwordMismatch"));
      return;
    }

    if (hasPassword && !currentPassword) {
      setError(t("currentRequired"));
      return;
    }

    setLoading(true);
    try {
      if (hasPassword) {
        await changeUserPassword(user!, currentPassword, newPassword);
        setSuccess(t("changeSuccess"));
      } else {
        await linkPasswordToUser(user!, newPassword);
        setSuccess(t("addSuccess"));
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await user!.reload();
      await refreshSession();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SettingsFeedback error={error} success={success} />

      {hasPassword && (
        <PasswordInput
          id="current-password"
          label={t("currentPassword")}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
      )}

      <PasswordInput
        id="new-password"
        label={hasPassword ? t("newPassword") : t("newPasswordAdd")}
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
      />

      <PasswordInput
        id="confirm-password"
        label={ta("confirmPassword")}
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
      />

      <PasswordStrengthChecklist password={newPassword} />

      <SettingsButton
        type="submit"
        variant="primary"
        size="md"
        icon={KeyRound}
        loading={loading}
        className="self-start"
      >
        {hasPassword ? t("changePassword") : t("addPassword")}
      </SettingsButton>
    </form>
  );
}
