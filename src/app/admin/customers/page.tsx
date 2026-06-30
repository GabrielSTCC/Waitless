"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import {
  addExistingClientToQueue,
  ClientAlreadyInQueueError,
  PlanLimitError,
} from "@/lib/queue/queue-actions";
import { useClients } from "@/lib/hooks/useClients";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { AdminShell } from "@/components/layout/AdminShell";
import { SearchBar } from "@/components/layout/SearchBar";
import { ClientList } from "@/components/clients/ClientList";
import type { Client } from "@/lib/types";
import { normalizeName, normalizeWhatsapp } from "@/lib/utils/format";

export default function CustomersPage() {
  const { member, company } = useAuth();
  const { t } = useTranslations("customers");
  const { t: tq } = useTranslations("queue");
  const companyId = member?.companyId;
  const avgServiceTimeMin = company?.avgServiceTimeMin ?? 10;
  const { clients, loading } = useClients(companyId);
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string>();
  const [actionError, setActionError] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim();
    if (term.length < 2) return clients;
    const digits = normalizeWhatsapp(term);
    const name = normalizeName(term);
    return clients.filter(
      (c) =>
        c.normalizedWhatsapp.includes(digits) ||
        c.normalizedName.includes(name),
    );
  }, [clients, search]);

  const handleAddToQueue = useCallback(
    async (client: Client) => {
      if (!companyId) return;
      setActionError("");
      setActionLoadingId(client.id);
      try {
        await addExistingClientToQueue(companyId, client, avgServiceTimeMin);
      } catch (err) {
        if (err instanceof ClientAlreadyInQueueError) {
          setActionError(err.message);
        } else if (err instanceof PlanLimitError) {
          setActionError(err.message);
        } else {
          setActionError(err instanceof Error ? err.message : tq("addToQueueError"));
        }
      } finally {
        setActionLoadingId(undefined);
      }
    },
    [companyId, avgServiceTimeMin],
  );

  return (
    <AdminShell>
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
      >
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="text-xl font-semibold text-on-surface md:text-2xl">{t("title")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>

          <div className="mt-6">
            <SearchBar value={search} onChange={setSearch} />
          </div>

          {actionError && <p className="mt-2 text-sm text-error">{actionError}</p>}

          <div className="mt-4">
            <ClientList
              clients={filtered}
              loading={loading}
              onAddToQueue={handleAddToQueue}
              actionLoadingId={actionLoadingId}
            />
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
