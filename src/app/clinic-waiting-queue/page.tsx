import { SolutionLandingPage } from "@/components/landing/SolutionLandingPage";
import {
  buildSolutionFaqJsonLd,
  buildSolutionMetadata,
} from "@/lib/marketing/solutions-metadata";

export const metadata = buildSolutionMetadata("clinica", "en");

export default function ClinicWaitingQueuePage() {
  const jsonLd = buildSolutionFaqJsonLd("clinica", "en");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SolutionLandingPage solutionId="clinica" pageLocale="en" />
    </>
  );
}
