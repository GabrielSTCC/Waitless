import { canUseFunctionalStorage } from "@/lib/legal/cookie-consent";
import type { MotionPreference, TextScale } from "@/lib/i18n/types";

const MOTION_KEY = "waitless-motion-pref";
const TEXT_SCALE_KEY = "waitless-text-scale";

export function getMotionPreference(): MotionPreference {
  if (typeof window === "undefined") return "system";
  if (!canUseFunctionalStorage()) return "system";
  const value = localStorage.getItem(MOTION_KEY);
  if (value === "reduce" || value === "full" || value === "system") return value;
  return "system";
}

export function setMotionPreference(pref: MotionPreference): void {
  if (!canUseFunctionalStorage()) return;
  localStorage.setItem(MOTION_KEY, pref);
}

export function getTextScale(): TextScale {
  if (typeof window === "undefined") return "100";
  if (!canUseFunctionalStorage()) return "100";
  const value = localStorage.getItem(TEXT_SCALE_KEY);
  if (value === "110" || value === "125" || value === "100") return value;
  return "100";
}

export function setTextScale(scale: TextScale): void {
  document.documentElement.style.setProperty("--text-scale", `${Number(scale) / 100}`);
  if (!canUseFunctionalStorage()) return;
  localStorage.setItem(TEXT_SCALE_KEY, scale);
}

export function applyTextScale(scale?: TextScale): void {
  const value = scale ?? getTextScale();
  document.documentElement.style.setProperty("--text-scale", `${Number(value) / 100}`);
}
