"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { ThemeConsentSync } from "@/components/legal/ThemeConsentSync";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      storageKey="waitless-theme"
      disableTransitionOnChange
    >
      <ThemeConsentSync />
      {children}
    </NextThemesProvider>
  );
}
