"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";
import {
  clearTwoFactorPending,
  getTwoFactorReason,
  isTwoFactorPending,
} from "@/lib/auth/two-factor-client";
import { useAuth } from "@/lib/context/AuthContext";
import { surfaceModal } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export function Verify2FAContent() {
  const router = useRouter();
  const { user, loading, refreshSession } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/admin/auth");
      return;
    }
    if (!isTwoFactorPending(user.uid)) {
      router.replace("/admin");
    }
  }, [loading, user, router]);

  if (loading || !user || !isTwoFactorPending(user.uid)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className={cn("w-full max-w-sm p-6", surfaceModal)}>
        <TwoFactorChallenge
          email={user.email}
          reason={getTwoFactorReason()}
          onVerified={async () => {
            clearTwoFactorPending();
            await refreshSession();
            router.replace("/admin");
          }}
        />
      </div>
    </div>
  );
}
