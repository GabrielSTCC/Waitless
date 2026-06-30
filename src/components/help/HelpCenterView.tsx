"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  ListOrdered,
  Mail,
  Palette,
  Rocket,
  Shield,
  Smartphone,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { getLegalConfig } from "@/lib/legal/config";
import { getHelpDocument } from "@/lib/help/content";
import type { HelpCategory } from "@/lib/help/types";
import { SupportReportModal } from "@/components/help/SupportReportModal";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

const categoryIcons: Record<string, LucideIcon> = {
  "getting-started": Rocket,
  queue: ListOrdered,
  "client-experience": Smartphone,
  "mini-crm": Users,
  branding: Palette,
  team: UserPlus,
  billing: CreditCard,
  security: Shield,
};

function CategoryIcon({ categoryId }: { categoryId: string }) {
  const Icon = categoryIcons[categoryId] ?? Rocket;
  return <Icon className="h-4 w-4 text-primary" strokeWidth={2} />;
}

function HelpCategorySection({ category }: { category: HelpCategory }) {
  const { t } = useTranslations("help");

  return (
    <section
      id={category.id}
      aria-labelledby={`help-${category.id}-title`}
      className={cn("flex flex-col", surfaceCard, "p-5 md:p-6")}
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <CategoryIcon categoryId={category.id} />
        </div>
        <div className="min-w-0">
          <h2
            id={`help-${category.id}-title`}
            className="font-heading text-sm font-semibold text-on-surface md:text-base"
          >
            {category.title}
          </h2>
          {category.description && (
            <p className="mt-0.5 text-xs text-on-surface-variant md:text-sm">
              {category.description}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-2">
        {category.items.map((item) => (
          <details
            key={item.id}
            className="group rounded-xl border border-outline-variant/60 bg-surface-container-low open:bg-surface-container-low"
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-on-surface marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </span>
              <span className="sr-only">{t("expandAnswer")}</span>
            </summary>
            <div className="border-t border-outline-variant/40 px-4 py-3 text-sm leading-relaxed text-on-surface-variant">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function HelpCenterView() {
  const { locale } = useTranslations();
  const config = getLegalConfig();
  const document = getHelpDocument(locale, config);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      {document.categories.map((category) => (
        <HelpCategorySection key={category.id} category={category} />
      ))}

      <section
        id="contact-support"
        aria-labelledby="help-contact-title"
        className={cn("flex flex-col", surfaceCard, "p-5 md:p-6")}
      >
        <header className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <h2
            id="help-contact-title"
            className="font-heading text-sm font-semibold text-on-surface md:text-base"
          >
            {document.contact.title}
          </h2>
        </header>

        <div className="flex flex-col gap-3">
          {document.contact.paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-sm leading-relaxed text-on-surface-variant"
            >
              {paragraph}
            </p>
          ))}

          <div className="mt-1 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:brightness-110"
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              {document.contact.emailLabel}
            </button>
            <Link
              href="/canal-lgpd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            >
              {document.contact.lgpdLinkLabel}
            </Link>
          </div>
        </div>
      </section>

      <SupportReportModal
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
}
