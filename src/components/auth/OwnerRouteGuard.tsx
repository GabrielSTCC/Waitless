"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { buildAuthRedirectUrl } from "@/lib/marketing/return-to";
import { canAccessOwnerRoute } from "@/lib/permissions";

interface OwnerRouteGuardProps {
  children: React.ReactNode;
}

export function OwnerRouteGuard({ children }: Readonly<OwnerRouteGuardProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, company, loading } = useAuth();
  const { t } = useTranslations("common");

  const allowed =
    !!user &&
    !!company &&
    canAccessOwnerRoute(user.uid, company.ownerId, pathname);

  useEffect(() => {
    if (loading) return;
    if (allowed) return;

    if (!user) {
      const returnPath = `${pathname}${window.location.search}`;
      router.replace(buildAuthRedirectUrl(returnPath));
      return;
    }

    router.replace("/admin");
  }, [loading, allowed, user, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {t("loading")}
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {user ? t("loading") : t("redirectingToLogin")}
      </div>
    );
  }

  return <>{children}</>;
}
