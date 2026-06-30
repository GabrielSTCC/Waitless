"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, QrCode, X } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import type { PixCheckoutData } from "@/lib/billing/client";
import { simulateSandboxPixPayment } from "@/lib/billing/client";
import { cn } from "@/lib/utils/cn";

interface PixCheckoutModalProps {
  open: boolean;
  pix: PixCheckoutData | null;
  onClose: () => void;
  onPaid?: () => void;
}

export function PixCheckoutModal({ open, pix, onClose, onPaid }: PixCheckoutModalProps) {
  const { t: tb } = useTranslations("billing");
  const { refreshSession } = useAuth();
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  const pollStatus = useCallback(async () => {
    if (!pix?.paymentId || paid) return;
    setPolling(true);
    try {
      const user = (await import("@/lib/firebase/config")).auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const response = await fetch(
        `/api/billing/pix/status?paymentId=${encodeURIComponent(pix.paymentId)}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      const data = (await response.json().catch(() => ({}))) as {
        active?: boolean;
        error?: string;
      };
      if (response.ok && data.active) {
        setPaid(true);
        await refreshSession();
        onPaid?.();
      }
    } finally {
      setPolling(false);
    }
  }, [pix?.paymentId, paid, onPaid, refreshSession]);

  useEffect(() => {
    if (!open || !pix?.paymentId || paid) return;
    const timer = window.setInterval(() => {
      void pollStatus();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [open, pix?.paymentId, paid, pollStatus]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setPaid(false);
      setError("");
    }
  }, [open]);

  if (!open || !pix) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pix!.payload.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleSimulate() {
    if (!pix?.paymentId) return;
    setError("");
    setSimulating(true);
    try {
      await simulateSandboxPixPayment(pix.paymentId);
      const user = (await import("@/lib/firebase/config")).auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const response = await fetch(
        `/api/billing/pix/status?paymentId=${encodeURIComponent(pix.paymentId)}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      const data = (await response.json().catch(() => ({}))) as { active?: boolean };
      if (response.ok && data.active) {
        setPaid(true);
        await refreshSession();
        onPaid?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tb("pix.simulateError"));
    } finally {
      setSimulating(false);
    }
  }

  const imageSrc = pix.encodedImage.startsWith("data:")
    ? pix.encodedImage
    : `data:image/png;base64,${pix.encodedImage}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pix-checkout-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface p-5 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
          aria-label={tb("pix.close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h2 id="pix-checkout-title" className="text-lg font-semibold text-on-surface">
            {paid ? tb("pix.paidTitle") : tb("pix.title")}
          </h2>
        </div>

        {paid ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm text-on-surface-variant">{tb("pix.paidBody")}</p>
            <SettingsButton type="button" variant="primary" size="sm" onClick={onClose}>
              {tb("pix.close")}
            </SettingsButton>
          </div>
        ) : (
          <>
            {pix.sandboxMode ? (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-on-surface">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {tb("pix.sandboxTitle")}
                </p>
                <p className="mt-1 text-on-surface-variant">{tb("pix.sandboxBody")}</p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-on-surface-variant">{tb("pix.instructions")}</p>
            )}

            {!pix.sandboxMode && (
              <div className="mx-auto mb-4 flex justify-center rounded-xl border border-outline-variant bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={tb("pix.qrAlt")}
                  className="h-48 w-48 object-contain"
                />
              </div>
            )}

            {!pix.sandboxMode && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-on-surface">{tb("pix.copyLabel")}</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={pix.payload}
                    className={cn(
                      "min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-low",
                      "px-3 py-2 text-xs text-on-surface",
                    )}
                  />
                  <SettingsButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={copied ? Check : Copy}
                    onClick={() => void handleCopy()}
                  >
                    {copied ? tb("pix.copied") : tb("pix.copy")}
                  </SettingsButton>
                </div>
              </div>
            )}

            {pix.expirationDate && !pix.sandboxMode && (
              <p className="mt-3 text-xs text-on-surface-variant">
                {tb("pix.expires", { date: pix.expirationDate })}
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {pix.sandboxMode && (
                <SettingsButton
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={simulating}
                  onClick={() => void handleSimulate()}
                >
                  {tb("pix.simulatePayment")}
                </SettingsButton>
              )}
              <SettingsButton
                type="button"
                variant={pix.sandboxMode ? "secondary" : "primary"}
                size="sm"
                loading={polling}
                onClick={() => void pollStatus()}
              >
                {tb("pix.checkPayment")}
              </SettingsButton>
              <SettingsButton type="button" variant="secondary" size="sm" onClick={onClose}>
                {tb("pix.close")}
              </SettingsButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
