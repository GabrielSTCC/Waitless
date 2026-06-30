"use client";

import { useState } from "react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { cn } from "@/lib/utils/cn";

export type PlatformActionType = "suspend" | "pause" | "reactivate" | "delete" | "syncStripe";

interface PlatformActionDialogProps {
  open: boolean;
  action: PlatformActionType | null;
  companyName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (input: { reason?: string; confirmName?: string }) => void;
}

export function PlatformActionDialog({
  open,
  action,
  companyName,
  loading,
  onClose,
  onConfirm,
}: PlatformActionDialogProps) {
  const { t } = useTranslations("platform");
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");

  if (!open || !action) return null;

  const titleMap: Record<PlatformActionType, string> = {
    suspend: t("actions.suspend"),
    pause: t("actions.pause"),
    reactivate: t("actions.reactivate"),
    delete: t("actions.delete"),
    syncStripe: t("actions.syncStripe"),
  };

  function handleConfirm() {
    onConfirm({
      reason: reason.trim() || undefined,
      confirmName: action === "delete" ? confirmName.trim() : undefined,
    });
  }

  function handleClose() {
    setReason("");
    setConfirmName("");
    onClose();
  }

  const deleteMismatch = action === "delete" && confirmName.trim() !== companyName;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-label={t("actions.cancel")}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-outline-variant/40",
          "bg-surface-container p-6 shadow-surface-modal",
        )}
      >
        <h3 className="font-heading text-lg font-semibold text-on-surface">
          {titleMap[action]}
        </h3>
        <p className="mt-1 text-sm text-on-surface-variant">{companyName}</p>

        {action === "delete" && (
          <p className="mt-3 text-sm text-error">{t("actions.deleteWarning")}</p>
        )}

        {action !== "syncStripe" && action !== "delete" && (
          <label className="mt-4 block text-sm">
            <span className="text-on-surface-variant">{t("actions.reasonLabel")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-sm"
            />
          </label>
        )}

        {action === "delete" && (
          <label className="mt-4 block text-sm">
            <span className="text-on-surface-variant">{t("actions.deleteConfirmLabel")}</span>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-sm"
            />
          </label>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <SettingsButton variant="secondary" onClick={handleClose} disabled={loading}>
            {t("actions.cancel")}
          </SettingsButton>
          <SettingsButton
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || deleteMismatch}
            className={action === "delete" ? "[&_div]:bg-error [&_div]:text-white" : undefined}
          >
            {t("actions.confirm")}
          </SettingsButton>
        </div>
      </div>
    </div>
  );
}
