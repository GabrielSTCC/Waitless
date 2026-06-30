import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Política de Privacidade — Waitless",
  description: "Como o Waitless trata dados pessoais conforme a LGPD.",
};

export default function PrivacyPage() {
  return <LegalPageShell documentKey="privacy" />;
}
