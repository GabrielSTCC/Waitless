import { buildHubMetadata } from "@/lib/marketing/solutions-metadata";
import { SolutionsHubPage } from "@/components/landing/SolutionsHubPage";

export const metadata = buildHubMetadata("en");

export default function SolutionsPage() {
  return <SolutionsHubPage pageLocale="en" />;
}
