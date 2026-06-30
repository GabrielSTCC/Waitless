import type { LucideIcon } from "lucide-react";
import { InfoTip } from "@/components/ui/InfoTip";
import { surfaceInput } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface SettingsFieldProps {
  label: string;
  hint?: string;
  info?: string;
  infoLabel?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function SettingsField({
  label,
  hint,
  info,
  infoLabel,
  icon: Icon,
  children,
  className,
}: SettingsFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-on-surface">{label}</label>
        {info && <InfoTip content={info} label={infoLabel} />}
      </div>
      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
            strokeWidth={2}
          />
        )}
        {children}
      </div>
    </div>
  );
}

export const settingsInputClass = cn(
  "h-11 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 text-sm text-on-surface",
  "placeholder:text-on-surface-variant/60",
  surfaceInput,
  "focus:border-primary focus:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20",
);

export function settingsInputWithIconClass(hasIcon: boolean) {
  return cn(settingsInputClass, hasIcon && "pl-10 pr-3.5");
}
