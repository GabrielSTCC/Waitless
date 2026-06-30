"use client";

import { useEffect } from "react";

/** Remove service workers órfãos que quebram navegação em dev (ex.: sw.js 404). */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }, []);

  return null;
}
