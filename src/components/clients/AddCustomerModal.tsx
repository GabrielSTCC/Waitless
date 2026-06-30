"use client";

import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceInput, surfaceModal } from "@/lib/ui/surface";

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; whatsapp: string }) => Promise<void>;
}

export function AddCustomerModal({ open, onClose, onSubmit }: AddCustomerModalProps) {
  const { t } = useTranslations("modal");
  const { t: tc } = useTranslations("common");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({ name, whatsapp });
      setName("");
      setWhatsapp("");
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("addError"));
      }
    } finally {
      setLoading(false);
    }
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
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6 ${surfaceModal}`}
          >
            <h2 className="mb-4 text-xl font-semibold text-on-surface">{t("addCustomer")}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm text-on-surface-variant">{t("name")}</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${surfaceInput}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-on-surface-variant">{t("whatsapp")}</label>
                <input
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${surfaceInput}`}
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? tc("loading") : t("submit")}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
