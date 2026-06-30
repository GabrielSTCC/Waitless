import type { Metadata } from "next";
import { PlansPage } from "@/components/landing/PlansPage";

export const metadata: Metadata = {
  title: "Planos — Waitless",
  description:
    "Compare os planos Gratuito, Essencial e Pro do Waitless. Fila digital, Mini-CRM e white-label para seu estabelecimento.",
  openGraph: {
    title: "Planos — Waitless",
    description:
      "Planos justos para Brasil e EUA. Comece grátis e evolua quando sua operação crescer.",
    type: "website",
  },
};

export default function PlanosPage() {
  return <PlansPage />;
}
