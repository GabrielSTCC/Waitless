import { SolutionLandingPage } from "@/components/landing/SolutionLandingPage";
import {
  buildSolutionFaqJsonLd,
  buildSolutionMetadata,
} from "@/lib/marketing/solutions-metadata";

export const metadata = buildSolutionMetadata("restaurante", "en");

export default function RestaurantWaitingQueuePage() {
  const jsonLd = buildSolutionFaqJsonLd("restaurante", "en");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SolutionLandingPage solutionId="restaurante" pageLocale="en" />
    </>
  );
}
