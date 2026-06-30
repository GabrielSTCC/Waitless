"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { brandMeshBackground } from "@/lib/utils/brand-surface";
import { cn } from "@/lib/utils/cn";

interface ClientExperienceShellProps {
  children: ReactNode;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function ClientExperienceShell({
  children,
  accentColor,
  className,
  style,
}: ClientExperienceShellProps) {
  const reducedMotion = useReducedMotion();

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div
      className={cn("relative mx-auto flex min-h-dvh max-w-lg flex-col pb-8", className)}
      style={{ ...brandMeshBackground(accentColor), ...style }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <motion.div className="relative flex flex-1 flex-col" {...motionProps}>
        {children}
      </motion.div>
    </div>
  );
}
