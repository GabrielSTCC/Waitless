import { buildHubMetadata } from "@/lib/marketing/solutions-metadata";
import { SolutionsHubPage } from "@/components/landing/SolutionsHubPage";

export const metadata = buildHubMetadata("pt-BR");

export default function SolucoesPage() {
  return <SolutionsHubPage pageLocale="pt-BR" />;
}
