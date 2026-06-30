"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

export function CheckoutStatusBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslations("billing");
  const [status, setStatus] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      setStatus(checkout);
      router.replace("/admin/account", { scroll: false });
    }
  }, [searchParams, router]);

  if (!status) return null;

  const isSuccess = status === "success";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        isSuccess
          ? "border-primary/30 bg-primary/5 text-on-surface"
          : "border-outline-variant bg-surface-container-low text-on-surface-variant",
      )}
      role="status"
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      <div>
        <p className="font-medium text-on-surface">
          {isSuccess ? t("checkoutSuccessTitle") : t("checkoutCancelTitle")}
        </p>
        <p className="mt-0.5 text-on-surface-variant">
          {isSuccess ? t("checkoutSuccessBody") : t("checkoutCancelBody")}
        </p>
      </div>
    </div>
  );
}
