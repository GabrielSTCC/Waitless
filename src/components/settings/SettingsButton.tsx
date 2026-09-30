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

function buttonIcon(loading: boolean, Icon: LucideIcon | undefined, iconClass: string, strokeWidth: number) {
  if (loading) return <Loader2 className={cn("h-4 w-4 animate-spin", iconClass)} />;
  if (!Icon) return null;
  return <Icon className={cn("h-4 w-4 shrink-0", iconClass)} strokeWidth={strokeWidth} />;
}

function PrimarySettingsButton({
  children,
  size,
  icon: Icon,
  loading,
  fullWidth,
  isDisabled,
  type,
  onClick,
  className,
  reducedMotion,
}: Readonly<{
  children: React.ReactNode;
  size: SettingsButtonSize;
  icon?: LucideIcon;
  loading: boolean;
  fullWidth: boolean;
  isDisabled: boolean;
  type: "button" | "submit";
  onClick?: () => void;
  className?: string;
  reducedMotion: boolean;
}>) {
  const motionProps = reducedMotion
    ? {}
    : { whileHover: { scale: 1.01 }, whileTap: { scale: 0.98 } };
  const tone = isDisabled
    ? "cursor-not-allowed bg-on-surface-variant/20 text-on-surface-variant"
    : "bg-primary text-on-primary shadow-surface-raised hover:brightness-95";

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
          tone,
        )}
      >
        {buttonIcon(loading, Icon, "", 2.25)}
        {children}
      </div>
    </motion.button>
  );
}

function SecondarySettingsButton({
  children,
  size,
  icon: Icon,
  loading,
  fullWidth,
  isDisabled,
  type,
  onClick,
  className,
  reducedMotion,
}: Readonly<{
  children: React.ReactNode;
  size: SettingsButtonSize;
  icon?: LucideIcon;
  loading: boolean;
  fullWidth: boolean;
  isDisabled: boolean;
  type: "button" | "submit";
  onClick?: () => void;
  className?: string;
  reducedMotion: boolean;
}>) {
  const motionProps = reducedMotion
    ? {}
    : { whileHover: { scale: 1.01 }, whileTap: { scale: 0.98 } };

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
      {buttonIcon(loading, Icon, "text-primary", 2)}
      {children}
    </motion.button>
  );
}

function GhostSettingsButton({
  children,
  size,
  icon: Icon,
  loading,
  fullWidth,
  isDisabled,
  type,
  onClick,
  className,
}: Readonly<{
  children: React.ReactNode;
  size: SettingsButtonSize;
  icon?: LucideIcon;
  loading: boolean;
  fullWidth: boolean;
  isDisabled: boolean;
  type: "button" | "submit";
  onClick?: () => void;
  className?: string;
}>) {
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
      {buttonIcon(loading, Icon, "", 2)}
      {children}
    </button>
  );
}

export function SettingsButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  className,
}: Readonly<SettingsButtonProps>) {
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  if (variant === "primary") {
    return (
      <PrimarySettingsButton
        size={size}
        icon={icon}
        loading={loading}
        fullWidth={fullWidth}
        isDisabled={isDisabled}
        type={type}
        onClick={onClick}
        className={className}
        reducedMotion={reducedMotion}
      >
        {children}
      </PrimarySettingsButton>
    );
  }
  if (variant === "secondary") {
    return (
      <SecondarySettingsButton
        size={size}
        icon={icon}
        loading={loading}
        fullWidth={fullWidth}
        isDisabled={isDisabled}
        type={type}
        onClick={onClick}
        className={className}
        reducedMotion={reducedMotion}
      >
        {children}
      </SecondarySettingsButton>
    );
  }
  return (
    <GhostSettingsButton
      size={size}
      icon={icon}
      loading={loading}
      fullWidth={fullWidth}
      isDisabled={isDisabled}
      type={type}
      onClick={onClick}
      className={className}
    >
      {children}
    </GhostSettingsButton>
  );
}
