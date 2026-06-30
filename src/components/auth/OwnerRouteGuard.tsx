"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { canAccessOwnerRoute } from "@/lib/permissions";

interface OwnerRouteGuardProps {
  children: React.ReactNode;
}

export function OwnerRouteGuard({ children }: OwnerRouteGuardProps) {
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
    if (!allowed) {
      router.replace("/admin");
    }
  }, [loading, allowed, router]);

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
        {t("loading")}
      </div>
    );
  }

  return <>{children}</>;
}
