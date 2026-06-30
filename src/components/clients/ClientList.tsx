"use client";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { formatTime, formatWhatsappDisplay } from "@/lib/utils/format";
import type { Client } from "@/lib/types";

interface ClientListProps {
  clients: Client[];
  loading: boolean;
  onAddToQueue: (client: Client) => void;
  actionLoadingId?: string;
}

export function ClientList({
  clients,
  loading,
  onAddToQueue,
  actionLoadingId,
}: ClientListProps) {
  const { t } = useTranslations("customers");

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-on-surface-variant">{t("loading")}</p>
    );
  }

  if (clients.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-on-surface-variant">{t("empty")}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
      <ul className="divide-y divide-outline-variant/40 md:hidden">
        {clients.map((client) => (
          <li key={client.id} className="flex flex-col gap-3 px-4 py-3">
            <div>
              <p className="font-medium text-on-surface">{client.name}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                {formatWhatsappDisplay(client.normalizedWhatsapp)}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm text-on-surface-variant">
              <span>{t("visits", { count: client.visitCount })}</span>
              <span>
                {t("lastVisit")}: {formatTime(client.lastVisitAt)}
              </span>
            </div>
            <button
              type="button"
              disabled={actionLoadingId === client.id}
              onClick={() => onAddToQueue(client)}
              className="self-start rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {actionLoadingId === client.id ? t("addingToQueue") : t("addToQueue")}
            </button>
          </li>
        ))}
      </ul>

      <table className="hidden w-full table-fixed md:table">
        <colgroup>
          <col />
          <col className="w-[148px]" />
          <col className="w-[72px]" />
          <col className="w-[96px]" />
          <col className="w-[132px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-outline-variant/60 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            <th className="px-4 py-3 text-left font-medium">{t("colName")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("colWhatsapp")}</th>
            <th className="px-4 py-3 text-center font-medium">{t("colVisits")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("colLastVisit")}</th>
            <th className="px-4 py-3 text-right font-medium">
              <span className="sr-only">{t("addToQueue")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              className="border-b border-outline-variant/40 last:border-0"
            >
              <td className="truncate px-4 py-3 font-medium text-on-surface">
                {client.name}
              </td>
              <td className="truncate px-4 py-3 text-sm text-on-surface-variant">
                {formatWhatsappDisplay(client.normalizedWhatsapp)}
              </td>
              <td className="px-4 py-3 text-center text-sm tabular-nums text-on-surface-variant">
                {client.visitCount}
              </td>
              <td className="px-4 py-3 text-sm text-on-surface-variant">
                {formatTime(client.lastVisitAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  disabled={actionLoadingId === client.id}
                  onClick={() => onAddToQueue(client)}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                >
                  {actionLoadingId === client.id ? t("addingToQueue") : t("addToQueue")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
