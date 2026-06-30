"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { logoutPlatformSession, verifyPlatformSession } from "@/lib/platform/client";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { cn } from "@/lib/utils/cn";

interface PlatformShellProps {
  children: ReactNode;
  pageTitle?: string;
}

export function PlatformShell({ children, pageTitle }: PlatformShellProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslations("platform");
  const { t: tc } = useTranslations("common");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void logoutPlatformSession().finally(() => {
        router.replace("/platform/auth");
      });
      return;
    }
    void (async () => {
      const ok = await verifyPlatformSession();
      if (!ok) {
        router.replace("/platform/auth");
        return;
      }
      setSessionReady(true);
    })();
  }, [loading, user, router]);

  if (loading || !user || !sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background md:h-dvh md:overflow-hidden">
      <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-outline-variant/40 bg-surface-container px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("navLabel")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-on-surface-variant">
          {pageTitle ?? t("panelTitle")}
        </span>
        <div className="w-9" />
      </header>

      <div className="flex min-h-0 flex-1 md:overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          {tc("skipToContent")}
        </a>
        <PlatformSidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col")}>{children}</div>
      </div>
    </div>
  );
}
