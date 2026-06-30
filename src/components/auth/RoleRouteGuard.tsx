"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { canAccessRoute } from "@/lib/permissions";

interface RoleRouteGuardProps {
  children: React.ReactNode;
}

export function RoleRouteGuard({ children }: RoleRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { member, company, loading, user } = useAuth();

  useEffect(() => {
    if (loading || !member) return;
    if (
      !canAccessRoute(member.role, pathname, {
        userId: user?.uid,
        companyOwnerId: company?.ownerId,
        company,
      })
    ) {
      router.replace("/admin");
    }
  }, [loading, member, company, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  if (member && !canAccessRoute(member.role, pathname, {
    userId: user?.uid,
    companyOwnerId: company?.ownerId,
    company,
  })) {
    return null;
  }

  return <>{children}</>;
}
