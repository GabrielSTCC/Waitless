"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/lib/context/AuthContext";
import {
  clearPlatform2faPending,
  getPlatform2faPending,
} from "@/lib/platform/platform-2fa-client";
import { PlatformTwoFactorChallenge } from "@/components/platform/PlatformTwoFactorChallenge";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceModal } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface PlatformVerify2FAClientProps {
  adminEmail: string;
}

export function PlatformVerify2FAClient({ adminEmail }: PlatformVerify2FAClientProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslations("platform");
  const [pending, setPending] = useState<ReturnType<typeof getPlatform2faPending>>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/platform/auth");
      return;
    }
    const data = getPlatform2faPending();
    if (!data) {
      router.replace("/platform/auth");
      return;
    }
    setPending(data);
  }, [loading, user, router]);

  if (loading || !user || !pending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className={cn("w-full max-w-sm p-6", surfaceModal)}>
        <PlatformTwoFactorChallenge
          challengeId={pending.challengeId}
          adminEmail={adminEmail}
          onVerified={async () => {
            clearPlatform2faPending();
            router.replace("/platform");
          }}
          onCancel={async () => {
            clearPlatform2faPending();
            await signOut(auth);
            router.replace("/platform/auth");
          }}
        />
      </div>
    </div>
  );
}
