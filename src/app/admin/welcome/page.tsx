import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupWelcomePage } from "@/components/marketing/SignupWelcomePage";

export const metadata: Metadata = {
  title: "Bem-vindo — Waitless",
  description: "Sua conta Waitless foi criada com sucesso.",
  robots: { index: false, follow: false },
};

export default function AdminWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-on-surface-variant">
          Carregando...
        </div>
      }
    >
      <SignupWelcomePage />
    </Suspense>
  );
}
