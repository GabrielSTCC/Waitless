import { SolutionLandingPage } from "@/components/landing/SolutionLandingPage";
import {
  buildSolutionFaqJsonLd,
  buildSolutionMetadata,
} from "@/lib/marketing/solutions-metadata";

export const metadata = buildSolutionMetadata("restaurante", "pt-BR");

export default function FilaDeEsperaRestaurantePage() {
  const jsonLd = buildSolutionFaqJsonLd("restaurante", "pt-BR");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SolutionLandingPage solutionId="restaurante" pageLocale="pt-BR" />
    </>
  );
}
