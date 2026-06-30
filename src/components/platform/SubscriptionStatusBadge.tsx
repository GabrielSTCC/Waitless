"use client";

import type { PlatformControlStatus, SubscriptionStatus } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface SubscriptionStatusBadgeProps {
  status?: SubscriptionStatus;
  className?: string;
}

interface PlatformStatusBadgeProps {
  status?: PlatformControlStatus;
  className?: string;
}

const subscriptionStyles: Record<SubscriptionStatus, string> = {
  none: "bg-surface-container-high text-on-surface-variant",
  trialing: "bg-sky-500/15 text-sky-700",
  active: "bg-emerald-500/15 text-emerald-700",
  past_due: "bg-amber-500/15 text-amber-700",
  canceled: "bg-red-500/15 text-red-700",
};

const platformStyles: Record<PlatformControlStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  suspended: "bg-red-500/15 text-red-700",
  paused: "bg-orange-500/15 text-orange-700",
};

export function SubscriptionStatusBadge({
  status = "none",
  className,
}: SubscriptionStatusBadgeProps) {
  const { t } = useTranslations("platform");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        subscriptionStyles[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export function PlatformStatusBadge({
  status = "active",
  className,
}: PlatformStatusBadgeProps) {
  const { t } = useTranslations("platform");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        platformStyles[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
