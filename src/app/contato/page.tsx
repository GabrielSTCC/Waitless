import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Contato — Waitless",
  description: "Canais oficiais de suporte e contato do Waitless.",
};

export default function ContactPage() {
  return <LegalPageShell documentKey="contact" />;
}
