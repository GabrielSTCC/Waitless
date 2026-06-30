"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/InfoTip";
import { cn } from "@/lib/utils/cn";

interface SettingsLabelProps {
  children: ReactNode;
  info?: string;
  infoLabel?: string;
  className?: string;
}

export function SettingsLabel({
  children,
  info,
  infoLabel,
  className,
}: SettingsLabelProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <p className="text-sm font-medium text-on-surface">{children}</p>
      {info && <InfoTip content={info} label={infoLabel} />}
    </div>
  );
}
