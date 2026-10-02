"use client";

import { SubmitEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Plus, X } from "lucide-react";
import { ClientSearchResults } from "@/components/clients/ClientSearchResults";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useClients } from "@/lib/hooks/useClients";
import { surfaceInput, surfaceModal } from "@/lib/ui/surface";
import type { Client } from "@/lib/types";
import {
  nameIncludes,
  normalizeWhatsapp,
  whatsappIncludes,
} from "@/lib/utils/format";

type ModalView = "list" | "new";

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; whatsapp: string }) => Promise<void>;
  /** When set, selecting a registered client enqueues via this callback. */
  onSelectExisting?: (client: Client) => Promise<void>;
  companyId?: string;
}

export function AddCustomerModal({
  open,
  onClose,
  onSubmit,
  onSelectExisting,
  companyId,
}: Readonly<AddCustomerModalProps>) {
  const { t } = useTranslations("modal");
  const { t: tc } = useTranslations("common");
  const [view, setView] = useState<ModalView>("list");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { clients, loading: clientsLoading } = useClients(
    open ? companyId : undefined,
  );

  useEffect(() => {
    if (!open) {
      setView("list");
      setQuery("");
      setName("");
      setWhatsapp("");
      setError("");
      setLoading(false);
      setSelectingId(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim();
    const digits = normalizeWhatsapp(term);
    let list = clients;

    if (term.length >= 2) {
      list = clients.filter(
        (client) =>
          nameIncludes(client.normalizedName || client.name, term) ||
          (digits.length >= 2 &&
            whatsappIncludes(client.normalizedWhatsapp || client.whatsapp, digits)),
      );
    }

    return [...list]
      .sort((a, b) => {
        const aTime = a.lastVisitAt?.getTime?.() ?? 0;
        const bTime = b.lastVisitAt?.getTime?.() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 12);
  }, [clients, query]);

  async function handleSubmit(e: SubmitEvent) {
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

  async function handleSelect(client: Client) {
    if (!onSelectExisting) return;
    setError("");
    setSelectingId(client.id);
    try {
      await onSelectExisting(client);
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("addError"));
      }
    } finally {
      setSelectingId(null);
    }
  }

  function handleClose() {
    if (loading || selectingId) return;
    onClose();
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
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-customer-modal-title"
            className={`fixed left-1/2 top-1/2 z-50 flex max-h-[min(90dvh,36rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col p-5 sm:p-6 ${surfaceModal}`}
          >
            <div className="mb-4 flex items-start gap-2">
              {view === "new" ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("list");
                    setError("");
                  }}
                  aria-label={t("backToList")}
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
              <h2
                id="add-customer-modal-title"
                className="min-w-0 flex-1 text-xl font-semibold text-on-surface"
              >
                {view === "new" ? t("newCustomer") : t("addToQueueTitle")}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label={tc("close")}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {view === "list" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div>
                  <label
                    htmlFor="add-customer-search"
                    className="mb-1 block text-sm text-on-surface-variant"
                  >
                    {t("searchLabel")}
                  </label>
                  <input
                    id="add-customer-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    autoComplete="off"
                    className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${surfaceInput}`}
                  />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ClientSearchResults
                    results={filtered}
                    searching={clientsLoading}
                    onSelect={(client) => {
                      void handleSelect(client);
                    }}
                    visible
                    actionLabel={
                      selectingId ? t("addingToQueue") : t("joinQueueAction")
                    }
                    emptyMessage={
                      query.trim().length >= 2
                        ? t("emptySearch")
                        : t("emptyClients")
                    }
                    className="mx-0 mb-0 mt-0 max-w-none shadow-none"
                  />
                </div>

                {error ? <p className="text-sm text-error">{error}</p> : null}

                <button
                  type="button"
                  onClick={() => {
                    setView("new");
                    setError("");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("newCustomer")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm text-on-surface-variant">
                    {t("name")}
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${surfaceInput}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-on-surface-variant">
                    {t("whatsapp")}
                  </label>
                  <input
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${surfaceInput}`}
                  />
                </div>
                {error ? <p className="text-sm text-error">{error}</p> : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setView("list");
                      setError("");
                    }}
                    className="flex-1 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
                  >
                    {t("backToList")}
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
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
