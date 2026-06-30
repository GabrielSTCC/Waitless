"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { ACCOUNT_DELETE_IMPACT_KEYS } from "@/components/account/impact-items";
import { auth } from "@/lib/firebase/config";
import { logout } from "@/lib/firebase/auth";
import { getSubscriptionPlanLabel, hasPaidSubscription } from "@/lib/subscription";
import type { Company } from "@/lib/types";

interface DeleteAccountModalProps {
  open: boolean;
  company: Company;
  onClose: () => void;
}

type DeleteStep = "form" | "activePlanWarning";

export function DeleteAccountModal({ open, company, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const { t, locale } = useTranslations("account");
  const { t: tc } = useTranslations("common");
  const [step, setStep] = useState<DeleteStep>("form");
  const [confirmName, setConfirmName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgeNoRefund, setAcknowledgeNoRefund] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const paidPlanActive = hasPaidSubscription(company);
  const planLabel = getSubscriptionPlanLabel(company, locale);

  useEffect(() => {
    if (!open) {
      setStep("form");
      setConfirmName("");
      setAcknowledged(false);
      setAcknowledgeNoRefund(false);
      setError("");
      setLoading(false);
    }
  }, [open]);

  const nameMatches = confirmName.trim() === company.name.trim();
  const canSubmitForm = nameMatches && acknowledged && !loading;
  const canConfirmDelete = acknowledgeNoRefund && !loading;

  async function executeDelete(acknowledgeActivePlanNoRefund: boolean) {
    const user = auth.currentUser;
    if (!user) {
      setError(t("deleteError"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const idToken = await user.getIdToken(true);
      const body: { confirmName: string; acknowledgeActivePlanNoRefund?: boolean } = {
        confirmName: confirmName.trim(),
      };
      if (acknowledgeActivePlanNoRefund) {
        body.acknowledgeActivePlanNoRefund = true;
      }

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? t("deleteError"));
        return;
      }

      await logout();
      router.replace("/admin/auth");
    } catch {
      setError(t("deleteError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmitForm) return;

    if (paidPlanActive) {
      setStep("activePlanWarning");
      return;
    }

    await executeDelete(false);
  }

  async function handleActivePlanConfirm() {
    if (!canConfirmDelete) return;
    await executeDelete(true);
  }

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
            aria-labelledby="delete-account-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-error/30 bg-surface-container p-6 shadow-surface-modal"
          >
            {step === "form" ? (
              <>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                    <AlertTriangle className="h-5 w-5 text-error" strokeWidth={2} />
                  </div>
                  <div>
                    <h2
                      id="delete-account-title"
                      className="text-lg font-semibold text-on-surface"
                    >
                      {t("modalTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">{t("modalDescription")}</p>
                  </div>
                </div>

                <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-on-surface-variant">
                  {ACCOUNT_DELETE_IMPACT_KEYS.map((key) => (
                    <li key={key}>{t(key)}</li>
                  ))}
                </ul>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="confirm-company-name"
                      className="mb-1 block text-sm text-on-surface-variant"
                    >
                      {t("confirmLabel", { name: company.name })}
                    </label>
                    <input
                      id="confirm-company-name"
                      required
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      disabled={loading}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm text-on-surface focus:border-error focus:outline-none focus:ring-2 focus:ring-error/15"
                      autoComplete="off"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-2 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      disabled={loading}
                      className="mt-0.5 h-4 w-4 rounded border-outline-variant text-error focus:ring-error/30"
                    />
                    <span>{t("checkboxLabel")}</span>
                  </label>

                  {error && <p className="text-sm text-error">{error}</p>}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
                    >
                      {tc("cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmitForm}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("deleting")}
                        </>
                      ) : (
                        t("deleteConfirm")
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                    <AlertTriangle className="h-5 w-5 text-error" strokeWidth={2} />
                  </div>
                  <div>
                    <h2
                      id="delete-account-title"
                      className="text-lg font-semibold text-on-surface"
                    >
                      {t("activePlanWarningTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {t("activePlanWarningBody", { plan: planLabel })}
                    </p>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-on-surface-variant">
                  {t("activePlanNoRefundDetail")}
                </div>

                <div className="flex flex-col gap-4">
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={acknowledgeNoRefund}
                      onChange={(e) => setAcknowledgeNoRefund(e.target.checked)}
                      disabled={loading}
                      className="mt-0.5 h-4 w-4 rounded border-outline-variant text-error focus:ring-error/30"
                    />
                    <span>{t("activePlanAckCheckbox")}</span>
                  </label>

                  {error && <p className="text-sm text-error">{error}</p>}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("form");
                        setAcknowledgeNoRefund(false);
                        setError("");
                      }}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
                    >
                      {t("activePlanBack")}
                    </button>
                    <button
                      type="button"
                      onClick={handleActivePlanConfirm}
                      disabled={!canConfirmDelete}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("deleting")}
                        </>
                      ) : (
                        t("activePlanConfirmDelete")
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
