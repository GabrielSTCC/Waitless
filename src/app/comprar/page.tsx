import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscriptionLeadLoader } from "@/components/marketing/SubscriptionLeadLoader";

export const metadata: Metadata = {
  title: "Assinatura — Waitless",
  description: "Redirecionando para a área de assinatura do Waitless.",
  robots: { index: false, follow: false },
};

export default function ComprarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-on-surface-variant">
          Carregando...
        </div>
      }
    >
      <SubscriptionLeadLoader />
    </Suspense>
  );
}
