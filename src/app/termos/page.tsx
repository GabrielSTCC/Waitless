import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Termos de Uso — Waitless",
  description: "Condições de uso da plataforma Waitless.",
};

export default function TermsPage() {
  return <LegalPageShell documentKey="terms" />;
}
