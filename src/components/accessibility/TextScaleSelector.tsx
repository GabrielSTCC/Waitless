"use client";

import { useTranslations, useLocale } from "@/components/providers/LocaleProvider";
import { SegmentControl } from "@/components/ui/SegmentControl";
import type { TextScale } from "@/lib/i18n/types";

const OPTIONS: { id: TextScale; labelKey: string }[] = [
  { id: "100", labelKey: "textNormal" },
  { id: "110", labelKey: "textLarge" },
  { id: "125", labelKey: "textXLarge" },
];

export function TextScaleSelector() {
  const { t } = useTranslations("accessibility");
  const { textScale, setTextScalePref } = useLocale();

  return (
    <SegmentControl
      aria-label={t("textScale")}
      size="sm"
      value={textScale}
      onChange={setTextScalePref}
      options={OPTIONS.map(({ id, labelKey }) => ({
        value: id,
        label: t(labelKey),
      }))}
    />
  );
}
