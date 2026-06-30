"use client";

import { useTranslations, useLocale } from "@/components/providers/LocaleProvider";
import { SegmentControl } from "@/components/ui/SegmentControl";
import type { MotionPreference } from "@/lib/i18n/types";

const OPTIONS: { id: MotionPreference; labelKey: string }[] = [
  { id: "system", labelKey: "motionSystem" },
  { id: "reduce", labelKey: "motionReduce" },
  { id: "full", labelKey: "motionFull" },
];

export function MotionPreferenceCards() {
  const { t } = useTranslations("accessibility");
  const { motionPreference, setMotionPreferencePref } = useLocale();

  return (
    <SegmentControl
      aria-label={t("motion")}
      size="sm"
      value={motionPreference}
      onChange={setMotionPreferencePref}
      options={OPTIONS.map(({ id, labelKey }) => ({
        value: id,
        label: t(labelKey),
      }))}
    />
  );
}
