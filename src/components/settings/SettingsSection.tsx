"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { InfoTip } from "@/components/ui/InfoTip";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

interface SettingsSectionProps {
  title: string;
  description?: string;
  info?: string;
  infoLabel?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  compact?: boolean;
}

export function SettingsSection({
  title,
  description,
  info,
  infoLabel,
  icon: Icon,
  children,
  className,
  bodyClassName,
  compact = false,
}: SettingsSectionProps) {
  const reducedMotion = useReducedMotion();

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.25 },
      };

  return (
    <motion.section
      {...motionProps}
      className={cn(
        "flex flex-col",
        surfaceCard,
        compact ? "p-4 md:p-5" : "p-5 md:p-6",
        className,
      )}
    >
      <header className={cn("flex items-start gap-3", compact ? "mb-3" : "mb-4")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-heading text-sm font-semibold text-on-surface md:text-base">
              {title}
            </h3>
            {info && <InfoTip content={info} label={infoLabel} />}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-on-surface-variant md:text-sm">{description}</p>
          )}
        </div>
      </header>
      <div className={cn("flex flex-col gap-3", bodyClassName)}>{children}</div>
    </motion.section>
  );
}
