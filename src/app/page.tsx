import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Waitless — Fila de Espera Inteligente",
  description:
    "Espere na fila sem ficar parado nela. Gerencie filas em tempo real com Mini-CRM, link WhatsApp e marca própria.",
  openGraph: {
    title: "Waitless — Fila de Espera Inteligente",
    description:
      "Seu cliente acompanha a posição pelo celular. Você gerencia tudo em tempo real.",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
