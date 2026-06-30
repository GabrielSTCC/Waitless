"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";

export const LOGO_SRC = "/logo-photoroom.png";
export const LOGO_LIGHT_SRC = "/logo-clara-photoroom.png";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

interface LogoProps {
  variant?: "full" | "compact" | "hero";
  /** Versão clara (branco + laranja) para fundos escuros, ex.: menu lateral */
  tone?: "default" | "light";
  className?: string;
}

export function Logo({ variant = "full", tone = "default", className = "" }: LogoProps) {
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";
  const isCompact = variant === "compact";
  const isHero = variant === "hero";
  const isLight = tone === "light" || (tone === "default" && isDark);

  const classes = cn(
    "mx-auto h-auto w-full shrink-0 object-contain",
    isCompact ? "max-w-[130px]" : isHero ? "max-w-[640px]" : "max-w-[200px]",
    className,
  );

  if (isLight) {
    return (
      <div className="bg-transparent">
        {/* img nativo: evita problemas de cache/otimização do next/image com PNG transparente */}
        <img
          src={LOGO_LIGHT_SRC}
          alt="Waitless — Fila Inteligente"
          width={990}
          height={580}
          className={classes}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt="Waitless — Fila Inteligente"
      width={isCompact ? 140 : isHero ? 640 : 220}
      height={isCompact ? 56 : isHero ? 376 : 88}
      className={classes}
      priority
    />
  );
}
