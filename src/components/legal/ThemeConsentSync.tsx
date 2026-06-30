"use client";

import { useEffect } from "react";
import {
  canUseFunctionalStorage,
  clearFunctionalStorage,
} from "@/lib/legal/cookie-consent";

/** Remove tema persistido quando cookies funcionais não foram consentidos. */
export function ThemeConsentSync() {
  useEffect(() => {
    function sync() {
      if (!canUseFunctionalStorage()) {
        clearFunctionalStorage();
      }
    }

    sync();
    window.addEventListener("waitless:cookie-consent-updated", sync);
    return () => window.removeEventListener("waitless:cookie-consent-updated", sync);
  }, []);

  return null;
}
