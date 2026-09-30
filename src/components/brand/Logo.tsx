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

function logoFrame(isCompact: boolean, isHero: boolean) {
  if (isCompact) return { frame: "max-w-[130px]", width: 140, height: 56 };
  if (isHero) return { frame: "max-w-[640px]", width: 640, height: 376 };
  return { frame: "max-w-[200px]", width: 220, height: 88 };
}

export function Logo({ variant = "full", tone = "default", className = "" }: Readonly<LogoProps>) {
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";
  const isCompact = variant === "compact";
  const isHero = variant === "hero";
  const isLight = tone === "light" || (tone === "default" && isDark);

  const box = logoFrame(isCompact, isHero);

  const classes = cn(
    "mx-auto h-auto w-full shrink-0 object-contain",
    box.frame,
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
      width={box.width}
      height={box.height}
      className={classes}
      priority
    />
  );
}
