"use client";

import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { getLegalConfig } from "@/lib/legal/config";
import {
  getLegalDocument,
  type LegalDocumentKey,
} from "@/lib/legal/content";

interface LegalPageShellProps {
  documentKey: LegalDocumentKey;
}

export function LegalPageShell({ documentKey }: LegalPageShellProps) {
  const { locale } = useTranslations();
  const { t } = useTranslations("legal");
  const config = getLegalConfig();
  const document = getLegalDocument(documentKey, locale, config);

  return (
    <LegalPageLayout backLabel={t("backHome")}>
      <LegalDocumentView document={document} />
    </LegalPageLayout>
  );
}
