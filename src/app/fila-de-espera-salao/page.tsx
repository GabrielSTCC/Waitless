import { SolutionLandingPage } from "@/components/landing/SolutionLandingPage";
import {
  buildSolutionFaqJsonLd,
  buildSolutionMetadata,
} from "@/lib/marketing/solutions-metadata";

export const metadata = buildSolutionMetadata("salao", "pt-BR");

export default function FilaDeEsperaSalaoPage() {
  const jsonLd = buildSolutionFaqJsonLd("salao", "pt-BR");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SolutionLandingPage solutionId="salao" pageLocale="pt-BR" />
    </>
  );
}
