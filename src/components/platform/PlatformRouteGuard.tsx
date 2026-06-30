"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { logoutPlatformSession, verifyPlatformSession } from "@/lib/platform/client";
import { useTranslations } from "@/components/providers/LocaleProvider";

interface PlatformRouteGuardProps {
  children: ReactNode;
}

export function PlatformRouteGuard({ children }: PlatformRouteGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslations("platform");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void logoutPlatformSession().finally(() => {
        router.replace("/platform/auth");
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      const ok = await verifyPlatformSession();
      if (cancelled) return;
      if (!ok) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, router]);

  if (loading || authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {t("loading")}
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="text-on-surface-variant">{t("accessDenied")}</p>
        <button
          type="button"
          onClick={() => router.replace("/platform/auth")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {t("loginTitle")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
