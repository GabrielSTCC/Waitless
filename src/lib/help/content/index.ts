import type { Locale } from "@/lib/i18n/types";
import type { LegalConfig } from "@/lib/legal/config";
import type { HelpDocument } from "@/lib/help/types";
import * as en from "@/lib/help/content/en";
import * as ptBR from "@/lib/help/content/pt-BR";

const loaders: Record<Locale, (config: LegalConfig) => HelpDocument> = {
  "pt-BR": ptBR.getHelpDocument,
  en: en.getHelpDocument,
};

export function getHelpDocument(locale: Locale, config: LegalConfig): HelpDocument {
  return loaders[locale](config);
}
