import { ClientQueuePageContent } from "./ClientQueuePageContent";
import type { ClientTab } from "@/components/client/ClientTabBar";

interface ClientQueuePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}

const VALID_TABS = new Set<ClientTab>(["queue", "history", "profile"]);

function parseTab(value: string | string[] | undefined): ClientTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && VALID_TABS.has(raw as ClientTab)) {
    return raw as ClientTab;
  }
  return "queue";
}

export default async function ClientQueuePage({
  params,
  searchParams,
}: Readonly<ClientQueuePageProps>) {
  const { token } = await params;
  const sp = await searchParams;

  return <ClientQueuePageContent token={token} initialTab={parseTab(sp.tab)} />;
}
