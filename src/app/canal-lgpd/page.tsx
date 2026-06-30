import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Canal LGPD — Waitless",
  description: "Exercício de direitos do titular conforme Art. 18 da LGPD.",
};

export default function LgpdChannelPage() {
  return <LegalPageShell documentKey="lgpdChannel" />;
}
