"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const SIZE_WIDTH = {
  sm: 280,
  md: 300,
  lg: 340,
} as const;

const BEZEL_PADDING = 20;
const LOGICAL_VIEWPORT_WIDTH = 390;
const SCREEN_ASPECT = 19.5 / 9;

interface IPhoneMockupProps {
  children: ReactNode;
  size?: keyof typeof SIZE_WIDTH;
  className?: string;
  /** Sombra mais forte para prévia flutuante */
  floating?: boolean;
}

export function IPhoneMockup({
  children,
  size = "md",
  className,
  floating = false,
}: IPhoneMockupProps) {
  const displayWidth = SIZE_WIDTH[size];
  const screenInnerWidth = displayWidth - BEZEL_PADDING;
  const scale = screenInnerWidth / LOGICAL_VIEWPORT_WIDTH;
  const logicalViewportHeight = LOGICAL_VIEWPORT_WIDTH * SCREEN_ASPECT;
  const islandLogicalPx = 32 / scale;
  const contentLogicalHeight = logicalViewportHeight - islandLogicalPx;

  return (
    <div
      className={cn(
        "relative mx-auto shrink-0 select-none",
        floating && "animate-[iphone-float_4s_ease-in-out_infinite]",
        className,
      )}
      style={{ width: displayWidth } as CSSProperties}
      aria-hidden={false}
    >
      {/* Corpo do iPhone */}
      <div
        className={cn(
          "relative rounded-[2.75rem] bg-gradient-to-b from-[#3d3d3f] via-[#1d1d1f] to-[#0a0a0c] p-[10px]",
          "ring-1 ring-white/10",
          floating
            ? "shadow-[0_32px_64px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
            : "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)]",
        )}
      >
        {/* Botões laterais (detalhe visual) */}
        <div className="absolute -left-[2px] top-[88px] h-8 w-[3px] rounded-l-sm bg-[#2a2a2c]" />
        <div className="absolute -left-[2px] top-[128px] h-14 w-[3px] rounded-l-sm bg-[#2a2a2c]" />
        <div className="absolute -left-[2px] top-[172px] h-14 w-[3px] rounded-l-sm bg-[#2a2a2c]" />
        <div className="absolute -right-[2px] top-[140px] h-20 w-[3px] rounded-r-sm bg-[#2a2a2c]" />

        {/* Tela */}
        <div
          className="relative overflow-hidden rounded-[2.15rem] bg-background"
          style={{ aspectRatio: "9 / 19.5" }}
        >
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-20 -translate-x-1/2">
            <div className="h-[22px] w-[72px] rounded-full bg-black shadow-inner" />
          </div>

          {/* Conteúdo escalado na largura lógica do iPhone */}
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pt-8">
            <div
              className="overflow-hidden"
              style={{
                width: screenInnerWidth,
                height: contentLogicalHeight * scale,
              }}
            >
              <div
                style={{
                  width: LOGICAL_VIEWPORT_WIDTH,
                  height: contentLogicalHeight,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                {children}
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2">
            <div className="h-1 w-[100px] rounded-full bg-on-surface/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
