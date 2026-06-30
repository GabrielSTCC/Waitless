import { Suspense } from "react";
import { ClientLoadingSkeleton } from "@/components/client/ClientLoadingSkeleton";
import { ClientQueuePageContent } from "./ClientQueuePageContent";

interface ClientQueuePageProps {
  params: Promise<{ token: string }>;
}

export default function ClientQueuePage({ params }: ClientQueuePageProps) {
  return (
    <Suspense fallback={<ClientLoadingSkeleton />}>
      <ClientQueuePageContent params={params} />
    </Suspense>
  );
}
