import { SolutionLandingPage } from "@/components/landing/SolutionLandingPage";
import {
  buildSolutionFaqJsonLd,
  buildSolutionMetadata,
} from "@/lib/marketing/solutions-metadata";

export const metadata = buildSolutionMetadata("salao", "en");

export default function SalonWaitingQueuePage() {
  const jsonLd = buildSolutionFaqJsonLd("salao", "en");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SolutionLandingPage solutionId="salao" pageLocale="en" />
    </>
  );
}
