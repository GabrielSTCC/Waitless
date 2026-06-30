"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, X } from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsField, settingsInputClass } from "@/components/settings/SettingsField";
import { auth } from "@/lib/firebase/config";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_OTHER,
  SUPPORT_CUSTOM_CATEGORY_MIN_LENGTH,
  SUPPORT_DESCRIPTION_MIN_LENGTH,
  type SupportCategory,
} from "@/lib/support/categories";
import { surfaceModal } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface SupportReportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupportReportModal({ open, onClose }: SupportReportModalProps) {
  const { t } = useTranslations("help");
  const [category, setCategory] = useState<SupportCategory | "">("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) {
      setCategory("");
      setCustomCategory("");
      setDescription("");
      setLoading(false);
      setError("");
      setSuccess("");
    }
  }, [open]);

  useEffect(() => {
    if (!success || !open) return;
    const timer = window.setTimeout(() => {
      onClose();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [success, open, onClose]);

  function validate(): string | null {
    if (!category) return t("supportValidationCategory");
    if (category === SUPPORT_CATEGORY_OTHER) {
      if (customCategory.trim().length < SUPPORT_CUSTOM_CATEGORY_MIN_LENGTH) {
        return t("supportValidationCustomCategory");
      }
    }
    if (description.trim().length < SUPPORT_DESCRIPTION_MIN_LENGTH) {
      return t("supportValidationDescription");
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError(t("supportReportError"));
      return;
    }

    setLoading(true);

    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/support/report", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          customCategory:
            category === SUPPORT_CATEGORY_OTHER ? customCategory.trim() : undefined,
          description: description.trim(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? t("supportReportError"));
        return;
      }

      setSuccess(t("supportReportSuccess"));
    } catch {
      setError(t("supportReportError"));
    } finally {
      setLoading(false);
    }
  }

  const showCustomCategory = category === SUPPORT_CATEGORY_OTHER;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={loading ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-report-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6",
              surfaceModal,
            )}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h2
                    id="support-report-title"
                    className="text-lg font-semibold text-on-surface"
                  >
                    {t("supportModalTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {t("supportModalDescription")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
                aria-label={t("supportReportCancel")}
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <SettingsFeedback error={error} success={success} />

              <SettingsField label={t("supportCategoryLabel")}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportCategory | "")}
                  disabled={loading || Boolean(success)}
                  className={settingsInputClass}
                >
                  <option value="">{t("supportCategoryPlaceholder")}</option>
                  {SUPPORT_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {t(`supportCategory.${value}`)}
                    </option>
                  ))}
                </select>
              </SettingsField>

              {showCustomCategory && (
                <SettingsField label={t("supportCustomCategoryLabel")}>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    disabled={loading || Boolean(success)}
                    placeholder={t("supportCustomCategoryPlaceholder")}
                    className={settingsInputClass}
                    autoComplete="off"
                  />
                </SettingsField>
              )}

              <SettingsField label={t("supportDescriptionLabel")}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading || Boolean(success)}
                  placeholder={t("supportDescriptionPlaceholder")}
                  rows={5}
                  className={cn(
                    settingsInputClass,
                    "min-h-[120px] resize-y py-2.5",
                  )}
                />
              </SettingsField>

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                <SettingsButton
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  {t("supportReportCancel")}
                </SettingsButton>
                <SettingsButton
                  type="submit"
                  variant="primary"
                  icon={Mail}
                  loading={loading}
                  disabled={Boolean(success)}
                >
                  {t("supportReportSubmit")}
                </SettingsButton>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
