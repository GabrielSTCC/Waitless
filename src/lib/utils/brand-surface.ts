import type { CSSProperties } from "react";

const DEFAULT_ACCENT = "var(--color-primary)";

export function brandMeshBackground(accent?: string, dark = false): CSSProperties {
  const color = accent ?? DEFAULT_ACCENT;
  if (dark) {
    return {
      backgroundColor: "#0a1b3f",
      backgroundImage: [
        `linear-gradient(180deg, color-mix(in srgb, ${color} 14%, #0a1b3f) 0%, #081630 48%, color-mix(in srgb, ${color} 20%, #0a1b3f) 100%)`,
        `radial-gradient(ellipse 85% 55% at 50% -5%, color-mix(in srgb, ${color} 30%, transparent) 0%, transparent 68%)`,
        `radial-gradient(ellipse 55% 45% at 100% 15%, color-mix(in srgb, ${color} 22%, transparent) 0%, transparent 62%)`,
        `radial-gradient(ellipse 50% 40% at 0% 55%, color-mix(in srgb, ${color} 16%, transparent) 0%, transparent 58%)`,
      ].join(", "),
    };
  }
  return {
    backgroundColor: "#ECEEF2",
    backgroundImage: [
      `linear-gradient(180deg, color-mix(in srgb, ${color} 8%, #ECEEF2) 0%, #ECEEF2 45%, color-mix(in srgb, ${color} 14%, #E4E7ED) 100%)`,
      `radial-gradient(ellipse 85% 55% at 50% -5%, color-mix(in srgb, ${color} 32%, transparent) 0%, transparent 68%)`,
      `radial-gradient(ellipse 55% 45% at 100% 15%, color-mix(in srgb, ${color} 22%, transparent) 0%, transparent 62%)`,
      `radial-gradient(ellipse 50% 40% at 0% 55%, color-mix(in srgb, ${color} 18%, transparent) 0%, transparent 58%)`,
    ].join(", "),
  };
}

export function deepBrandCard(accent?: string): CSSProperties {
  const color = accent ?? DEFAULT_ACCENT;
  return {
    background: `linear-gradient(155deg, color-mix(in srgb, ${color} 90%, #0a1628) 0%, color-mix(in srgb, ${color} 40%, #060d18) 100%)`,
    boxShadow: [
      `0 20px 50px -12px color-mix(in srgb, ${color} 55%, transparent)`,
      "0 8px 24px -8px rgba(0, 0, 0, 0.25)",
      `0 0 0 1px color-mix(in srgb, ${color} 40%, rgba(255,255,255,0.15))`,
    ].join(", "),
  };
}

export function deepGlassOverlay(): CSSProperties {
  return {
    backgroundColor: "rgba(0, 0, 0, 0.12)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.22)",
  };
}

export function heroPanel(accent?: string, dark = false): CSSProperties {
  const color = accent ?? DEFAULT_ACCENT;
  if (dark) {
    return {
      backgroundColor: "#122952",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: [
        "0 12px 36px -10px rgba(0, 0, 0, 0.45)",
        `0 0 0 1px color-mix(in srgb, ${color} 22%, transparent)`,
      ].join(", "),
    };
  }
  return {
    backgroundColor: "#FFFFFF",
    border: "1px solid rgba(0, 0, 0, 0.06)",
    boxShadow: [
      "0 12px 36px -10px rgba(0, 0, 0, 0.14)",
      `0 0 0 1px color-mix(in srgb, ${color} 10%, transparent)`,
    ].join(", "),
  };
}

/** @deprecated Prefer deepBrandCard for client queue card */
export function glassPanel(accent?: string): CSSProperties {
  const color = accent ?? DEFAULT_ACCENT;
  return {
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: [
      "0 24px 48px -20px rgba(0, 0, 0, 0.12)",
      `0 0 0 1px color-mix(in srgb, ${color} 6%, transparent)`,
    ].join(", "),
  };
}

export function glassPedestal(accent?: string, dark = false): CSSProperties {
  const color = accent ?? DEFAULT_ACCENT;
  if (dark) {
    return {
      backgroundColor: "#1a3058",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      boxShadow: [
        `0 16px 40px -10px color-mix(in srgb, ${color} 38%, transparent)`,
        "0 6px 20px -6px rgba(0, 0, 0, 0.4)",
        "0 0 0 1px rgba(255, 255, 255, 0.06)",
      ].join(", "),
    };
  }
  return {
    backgroundColor: "#FFFFFF",
    border: "1px solid rgba(255, 255, 255, 0.9)",
    boxShadow: [
      `0 16px 40px -10px color-mix(in srgb, ${color} 45%, transparent)`,
      "0 6px 20px -6px rgba(0, 0, 0, 0.15)",
      "0 0 0 1px rgba(0, 0, 0, 0.04)",
    ].join(", "),
  };
}

export function softBrandBase(accent?: string): CSSProperties {
  const color = accent ?? DEFAULT_ACCENT;
  return {
    background: `linear-gradient(160deg, color-mix(in srgb, ${color} 22%, white) 0%, color-mix(in srgb, ${color} 12%, #eceef2) 100%)`,
  };
}

export function glassChip(accent?: string): CSSProperties {
  const color = accent ?? DEFAULT_ACCENT;
  return {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 15%, transparent)`,
  };
}

export function glassChipDark(): CSSProperties {
  return {
    backgroundColor: "rgba(10, 16, 30, 0.72)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    boxShadow: "0 4px 16px -4px rgba(0, 0, 0, 0.3)",
  };
}
