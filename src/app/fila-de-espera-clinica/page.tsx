import { SolutionLandingPage } from "@/components/landing/SolutionLandingPage";
import {
  buildSolutionFaqJsonLd,
  buildSolutionMetadata,
} from "@/lib/marketing/solutions-metadata";

export const metadata = buildSolutionMetadata("clinica", "pt-BR");

export default function FilaDeEsperaClinicaPage() {
  const jsonLd = buildSolutionFaqJsonLd("clinica", "pt-BR");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SolutionLandingPage solutionId="clinica" pageLocale="pt-BR" />
    </>
  );
}
