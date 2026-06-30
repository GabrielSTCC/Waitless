"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export type ParadeDirection = "ltr" | "rtl";

interface OutfitPalette {
  skin: string;
  hair: string;
  shirt: string;
  shirtAccent: string;
  pants: string;
  shoe: string;
  bag: string;
}

const OUTFIT_PALETTES: OutfitPalette[] = [
  { skin: "#f4c4a0", hair: "#5c3d2e", shirt: "#ff6600", shirtAccent: "#e85d00", pants: "#6b3a12", shoe: "#2a2218", bag: "#cc5500" },
  { skin: "#e8c4a8", hair: "#1e3050", shirt: "#3d6cb5", shirtAccent: "#2d5290", pants: "#2a3d62", shoe: "#1a2230", bag: "#5a8fd4" },
  { skin: "#d4b896", hair: "#2a3a28", shirt: "#2a9d8f", shirtAccent: "#1f7a6e", pants: "#1a4a42", shoe: "#1a2828", bag: "#3ec4b0" },
  { skin: "#f0c8a0", hair: "#4a2818", shirt: "#43aa5a", shirtAccent: "#358f48", pants: "#245c30", shoe: "#1e2a1e", bag: "#5cbd72" },
  { skin: "#e0bca0", hair: "#3a2848", shirt: "#7b5ea7", shirtAccent: "#6248a0", pants: "#3e2e5c", shoe: "#221a30", bag: "#9b7fd4" },
  { skin: "#f2c0a8", hair: "#2a1818", shirt: "#e63946", shirtAccent: "#c42d38", pants: "#6b2830", shoe: "#2a1818", bag: "#f07178" },
  { skin: "#e8d0a8", hair: "#4a3818", shirt: "#e9b44c", shirtAccent: "#d49a30", pants: "#6b5520", shoe: "#3a3020", bag: "#f0c860" },
  { skin: "#f0b8a8", hair: "#4a2838", shirt: "#e07a9a", shirtAccent: "#c85a7a", pants: "#6b3a52", shoe: "#2a1820", bag: "#f090a8" },
];

interface PersonConfig {
  size: number;
  bottom: string;
  delay: number;
  paletteId: number;
}

const PEOPLE: PersonConfig[] = [
  { size: 130, bottom: "10%", delay: 0, paletteId: 0 },
  { size: 105, bottom: "16%", delay: 0.12, paletteId: 1 },
  { size: 125, bottom: "12%", delay: 0.24, paletteId: 2 },
  { size: 100, bottom: "18%", delay: 0.36, paletteId: 3 },
  { size: 118, bottom: "11%", delay: 0.48, paletteId: 4 },
  { size: 105, bottom: "17%", delay: 0.6, paletteId: 5 },
  { size: 125, bottom: "13%", delay: 0.72, paletteId: 6 },
  { size: 100, bottom: "19%", delay: 0.84, paletteId: 7 },
];

const STEP_DURATION = 0.35;

type PersonStyle = 0 | 1 | 2 | 3;

function Limb({
  originX,
  originY,
  from,
  to,
  phase,
  opacity = 1,
  children,
}: {
  originX: number;
  originY: number;
  from: number;
  to: number;
  phase: number;
  opacity?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.g
      style={{
        transformOrigin: `${originX}px ${originY}px`,
        transformBox: "fill-box" as const,
        opacity,
      }}
      initial={{ rotate: from }}
      animate={{ rotate: to }}
      transition={{
        duration: STEP_DURATION,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
        delay: phase,
      }}
    >
      {children}
    </motion.g>
  );
}

function WalkingPerson({
  size,
  palette,
  flip,
  phase,
  styleIndex,
}: {
  size: number;
  palette: OutfitPalette;
  flip: boolean;
  phase: number;
  styleIndex: PersonStyle;
}) {
  const { skin, hair, shirt, shirtAccent, pants, shoe, bag } = palette;

  const hairPaths: Record<PersonStyle, React.ReactNode> = {
    0: (
      <>
        <path d="M16 11 C16 5.5 20 3 24 3 C28 3 32 5.5 32 11 C32 14 30.5 15.5 28 16 L20 16 C17.5 15.5 16 14 16 11 Z" fill={hair} />
        <path d="M17 12 C18 9 22 8 24 8 C26 8 30 9 31 12" fill="none" stroke={hair} strokeWidth="1.2" opacity="0.5" />
      </>
    ),
    1: (
      <>
        <path d="M16 11 C16 5.5 20 3 24 3 C28 3 32 5.5 32 11 L31 24 C30 27 28 28 24 28 C20 28 18 27 17 24 Z" fill={hair} />
        <ellipse cx="24" cy="26" rx="5" ry="7" fill={hair} />
      </>
    ),
    2: (
      <>
        <path d="M15 12 C15 4 20 1 24 1 C28 1 33 4 33 12 L34 18 C34 20 32 21 30 20 L18 20 C16 21 14 20 14 18 Z" fill={shirtAccent} />
        <path d="M16 11 C16 5.5 20 3 24 3 C28 3 32 5.5 32 11" fill={hair} />
      </>
    ),
    3: (
      <>
        <path d="M16 11 C16 5.5 20 3 24 3 C28 3 32 5.5 32 11 C32 13.5 30.5 15 28.5 15.5 L19.5 15.5 C17.5 15 16 13.5 16 11 Z" fill={hair} />
        <rect x="22" y="4" width="4" height="3" rx="1" fill={hair} opacity="0.7" />
      </>
    ),
  };

  const torsoPaths: Record<PersonStyle, React.ReactNode> = {
    0: (
      <>
        <path d="M13 24 C13 21 16 19 24 19 C32 19 35 21 35 24 L34 44 C34 47 31 49 24 49 C17 49 14 47 14 44 Z" fill={shirt} />
        <path d="M18 24 L24 29 L30 24" fill="none" stroke={shirtAccent} strokeWidth="1.5" strokeLinecap="round" />
        <rect x="17" y="42" width="14" height="2.5" rx="1" fill={shirtAccent} opacity="0.6" />
      </>
    ),
    1: (
      <>
        <path d="M14 24 C14 21 17 19 24 19 C31 19 34 21 34 24 L33 46 C33 48.5 30 50 24 50 C18 50 15 48.5 15 46 Z" fill={shirt} />
        <path d="M15 26 C18 28 30 28 33 26" fill="none" stroke={shirtAccent} strokeWidth="1.2" />
        <ellipse cx="24" cy="30" rx="4" ry="5" fill={shirtAccent} opacity="0.35" />
      </>
    ),
    2: (
      <>
        <path d="M12 23 C12 19 16 17 24 17 C32 17 36 19 36 23 L37 47 C37 50 33 52 24 52 C15 52 11 50 11 47 Z" fill={shirtAccent} />
        <path d="M16 28 L24 34 L32 28" fill="none" stroke={shirt} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <rect x="14" y="44" width="20" height="3" rx="1.5" fill={shirt} opacity="0.45" />
      </>
    ),
    3: (
      <>
        <path d="M13 24 C13 21 16 19 24 19 C32 19 35 21 35 24 L34 45 C34 48 31 50 24 50 C17 50 14 48 14 45 Z" fill={shirt} />
        <rect x="16" y="24" width="16" height="10" rx="2" fill={shirtAccent} opacity="0.35" />
        <line x1="16" y1="34" x2="32" y2="34" stroke={shirtAccent} strokeWidth="1" opacity="0.5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 48 92"
      width={size}
      height={size * 1.92}
      className={cn("drop-shadow-lg", flip && "-scale-x-100")}
      aria-hidden
    >
      {/* braço de trás */}
      <Limb originX={24} originY={28} from={22} to={-22} phase={phase} opacity={0.65}>
        <path d="M22 27 C20 27 18 29 17 32 L14 44 C13 46 14 48 16 48 C18 48 19 46 20 44 L23 33 C24 30 23 28 22 27 Z" fill={shirt} />
        <path d="M14 44 L12 50 C11 52 12 54 14 54 C15.5 54 16.5 52.5 17 51 L19 45 Z" fill={skin} />
        <circle cx="13.5" cy="53.5" r="2.2" fill={skin} />
      </Limb>

      {/* perna de trás */}
      <Limb originX={24} originY={52} from={-20} to={20} phase={phase} opacity={0.7}>
        <path d="M21 51 C19.5 51 18.5 53 18.5 55 L17 68 C16.5 71 18 73 20 73 L22 73 C24 73 25 71 24.5 68 L23.5 55 C23.5 53 22.5 51 21 51 Z" fill={pants} />
        <path d="M17 68 L15.5 76 C15 78 16 80 18 80 L22 80 C24 80 25 78 24.5 76 L23 68 Z" fill={shoe} />
        <rect x="14.5" y="78.5" width="11" height="3.5" rx="1.5" fill={shoe} />
      </Limb>

      {/* perna da frente */}
      <Limb originX={24} originY={52} from={20} to={-20} phase={phase}>
        <path d="M27 51 C28.5 51 29.5 53 29.5 55 L30.5 68 C31 71 29.5 73 27.5 73 L25.5 73 C23.5 73 22.5 71 23 68 L24 55 C24 53 25 51 27 51 Z" fill={pants} />
        <path d="M30.5 68 L32 76 C32.5 78 31.5 80 29.5 80 L25.5 80 C23.5 80 22.5 78 23 76 L24.5 68 Z" fill={shoe} />
        <rect x="22.5" y="78.5" width="11" height="3.5" rx="1.5" fill={shoe} />
      </Limb>

      {/* tronco */}
      {torsoPaths[styleIndex]}

      {/* pescoço */}
      <rect x="21.5" y="17" width="5" height="5" rx="2" fill={skin} />

      {/* cabeça */}
      <circle cx="24" cy="12" r="8" fill={skin} />
      <circle cx="21.5" cy="11" r="1" fill="#2a2a2a" opacity="0.7" />
      <circle cx="26.5" cy="11" r="1" fill="#2a2a2a" opacity="0.7" />
      <path d="M22 14.5 Q24 15.8 26 14.5" fill="none" stroke="#c97a5a" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />

      {/* cabelo / acessório de cabeça */}
      {hairPaths[styleIndex]}

      {/* bolsa (alguns estilos) */}
      {styleIndex === 3 && (
        <path d="M33 30 C36 30 38 33 38 37 L38 46 C38 49 36 51 33 51 L31 51 C29 51 28 49 28 46 L28 37 C28 33 30 30 33 30 Z" fill={bag} opacity="0.9" />
      )}

      {/* braço da frente */}
      <Limb originX={24} originY={28} from={-22} to={22} phase={phase}>
        <path d="M26 27 C28 27 30 29 31 32 L34 44 C35 46 34 48 32 48 C30 48 29 46 28 44 L25 33 C24 30 25 28 26 27 Z" fill={shirt} />
        <path d="M34 44 L36 50 C37 52 36 54 34 54 C32.5 54 31.5 52.5 31 51 L29 45 Z" fill={skin} />
        <circle cx="36.5" cy="53.5" r="2.2" fill={skin} />
        {styleIndex === 1 && (
          <rect x="35" y="50" width="3" height="5" rx="1" fill="#2a2a2a" opacity="0.8" />
        )}
      </Limb>
    </svg>
  );
}

const DURATION = 1.8;
const MIDPOINT_MS = 1000;

interface AuthQueueParadeProps {
  active: boolean;
  direction: ParadeDirection;
  onMidpoint: () => void;
  onComplete: () => void;
}

export function AuthQueueParade({
  active,
  direction,
  onMidpoint,
  onComplete,
}: AuthQueueParadeProps) {
  const midpointCalled = useRef(false);
  const completeCalled = useRef(false);
  const onMidpointRef = useRef(onMidpoint);
  const onCompleteRef = useRef(onComplete);
  const [reducedMotion, setReducedMotion] = useState(false);

  onMidpointRef.current = onMidpoint;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!active) {
      midpointCalled.current = false;
      completeCalled.current = false;
      return;
    }

    if (reducedMotion) {
      onMidpointRef.current();
      onCompleteRef.current();
      return;
    }

    midpointCalled.current = false;
    completeCalled.current = false;

    const midpointTimer = window.setTimeout(() => {
      if (!midpointCalled.current) {
        midpointCalled.current = true;
        onMidpointRef.current();
      }
    }, MIDPOINT_MS);

    const completeTimer = window.setTimeout(() => {
      if (!completeCalled.current) {
        completeCalled.current = true;
        onCompleteRef.current();
      }
    }, DURATION * 1000 + 0.84 * 1000);

    return () => {
      window.clearTimeout(midpointTimer);
      window.clearTimeout(completeTimer);
    };
  }, [active, reducedMotion]);

  const startX = direction === "ltr" ? "-12vw" : "112vw";
  const endX = direction === "ltr" ? "112vw" : "-12vw";

  return (
    <AnimatePresence>
      {active && !reducedMotion && (
        <motion.div
          key="parade-overlay"
          className="pointer-events-none fixed inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-background/25 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {PEOPLE.map((person, index) => (
            <motion.div
              key={index}
              className="absolute"
              style={{ bottom: person.bottom }}
              initial={{ x: startX, y: 0 }}
              animate={{
                x: endX,
                y: [0, -12, 0, -8, 0],
              }}
              transition={{
                x: {
                  duration: DURATION,
                  delay: person.delay,
                  ease: "linear",
                },
                y: {
                  duration: 0.4,
                  delay: person.delay,
                  repeat: Math.ceil(DURATION / 0.4),
                  ease: "easeInOut",
                },
              }}
              onAnimationComplete={
                index === PEOPLE.length - 1
                  ? () => {
                      if (!completeCalled.current) {
                        completeCalled.current = true;
                        onCompleteRef.current();
                      }
                    }
                  : undefined
              }
            >
              <WalkingPerson
                size={person.size}
                palette={OUTFIT_PALETTES[person.paletteId % OUTFIT_PALETTES.length]}
                flip={direction === "rtl"}
                phase={(index % 2) * (STEP_DURATION / 2)}
                styleIndex={(index % 4) as PersonStyle}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
