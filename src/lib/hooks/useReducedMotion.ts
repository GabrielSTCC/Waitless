"use client";

import { useSyncExternalStore } from "react";
import { getMotionPreference } from "@/lib/i18n/preferences-storage";

function subscribe(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  window.addEventListener("waitless-motion-pref-change", callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener("waitless-motion-pref-change", callback);
  };
}

function getSnapshot() {
  const pref = getMotionPreference();
  const systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (pref === "reduce") return true;
  if (pref === "full") return false;
  return systemReduced;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
