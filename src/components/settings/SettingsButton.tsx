"use client";

import { motion } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

type SettingsButtonVariant = "primary" | "secondary" | "ghost";
type SettingsButtonSize = "sm" | "md";

interface SettingsButtonProps {
  children: React.ReactNode;
  variant?: SettingsButtonVariant;
  size?: SettingsButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}

const sizeClasses: Record<SettingsButtonSize, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
};

export function SettingsButton({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  className,
}: SettingsButtonProps) {
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  const motionProps = reducedMotion
    ? {}
    : { whileHover: { scale: 1.01 }, whileTap: { scale: 0.98 } };

  if (variant === "primary") {
    return (
      <motion.button
        {...motionProps}
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        className={cn("group/button relative", fullWidth && "w-full", className)}
      >
        {!reducedMotion && !isDisabled && (
          <div className="absolute inset-0 rounded-xl bg-primary/25 opacity-0 blur-lg transition-opacity duration-300 group-hover/button:opacity-70" />
        )}
        <div
          className={cn(
            "relative flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200",
            sizeClasses[size],
            fullWidth && "w-full",
            isDisabled
              ? "cursor-not-allowed bg-on-surface-variant/20 text-on-surface-variant"
              : "bg-primary text-on-primary shadow-surface-raised hover:brightness-95",
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          )}
          {children}
        </div>
      </motion.button>
    );
  }

  if (variant === "secondary") {
    return (
      <motion.button
        {...motionProps}
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container font-medium text-on-surface shadow-surface-card transition-all hover:border-primary/40 hover:bg-surface-container-high hover:shadow-surface-card-hover disabled:opacity-60",
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          Icon && <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
        )}
        {children}
      </motion.button>
    );
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-60",
        size === "sm" ? "h-9 px-3" : "h-10 px-4",
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      {children}
    </button>
  );
}
