"use client";

import { motion } from "framer-motion";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatWhatsappDisplay } from "@/lib/utils/format";

interface ClientSearchResultsProps {
  results: Client[];
  searching: boolean;
  onSelect: (client: Client) => void;
  visible: boolean;
  actionLabel?: string;
  className?: string;
  emptyMessage?: string;
}

export function ClientSearchResults({
  results,
  searching,
  onSelect,
  visible,
  actionLabel = "Entrar na fila",
  className,
  emptyMessage = 'Nenhum cliente encontrado. Use "Add Customer" para cadastrar.',
}: Readonly<ClientSearchResultsProps>) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mx-auto -mt-4 mb-6 w-full max-w-2xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-surface-dropdown",
        className,
      )}
    >
      {searching && (
        <p className="px-4 py-3 text-sm text-on-surface-variant">Buscando...</p>
      )}
      {!searching && results.length === 0 && (
        <p className="px-4 py-3 text-sm text-on-surface-variant">{emptyMessage}</p>
      )}
      {results.map((client) => (
        <button
          key={client.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(client)}
          className="flex w-full items-center justify-between border-b border-outline-variant/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-container-high"
        >
          <div>
            <p className="font-medium text-on-surface">{client.name}</p>
            <p className="text-sm text-on-surface-variant">
              {formatWhatsappDisplay(client.normalizedWhatsapp)}
            </p>
          </div>
          <span className="text-xs text-primary">{actionLabel}</span>
        </button>
      ))}
    </motion.div>
  );
}
