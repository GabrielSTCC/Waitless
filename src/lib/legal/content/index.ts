import type { Locale } from "@/lib/i18n/types";
import type { LegalConfig } from "@/lib/legal/config";
import type { LegalDocument } from "@/lib/legal/types";
import * as en from "@/lib/legal/content/en";
import * as ptBR from "@/lib/legal/content/pt-BR";

export type LegalDocumentKey = "privacy" | "terms" | "cookies" | "lgpdChannel" | "contact";

const loaders: Record<
  Locale,
  Record<LegalDocumentKey, (config: LegalConfig) => LegalDocument>
> = {
  "pt-BR": {
    privacy: ptBR.getPrivacyDocument,
    terms: ptBR.getTermsDocument,
    cookies: ptBR.getCookiesDocument,
    lgpdChannel: ptBR.getLgpdChannelDocument,
    contact: ptBR.getContactDocument,
  },
  en: {
    privacy: en.getPrivacyDocument,
    terms: en.getTermsDocument,
    cookies: en.getCookiesDocument,
    lgpdChannel: en.getLgpdChannelDocument,
    contact: en.getContactDocument,
  },
};

export function getLegalDocument(
  key: LegalDocumentKey,
  locale: Locale,
  config: LegalConfig,
): LegalDocument {
  return loaders[locale][key](config);
}
