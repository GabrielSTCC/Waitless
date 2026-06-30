import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Política de Cookies — Waitless",
  description: "Cookies e tecnologias similares utilizados no Waitless.",
};

export default function CookiesPage() {
  return <LegalPageShell documentKey="cookies" />;
}
