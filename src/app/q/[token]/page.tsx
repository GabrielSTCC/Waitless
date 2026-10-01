import { Suspense } from "react";
import { ClientNeutralLoading } from "@/components/client/ClientNeutralLoading";
import { ClientQueuePageContent } from "./ClientQueuePageContent";

interface ClientQueuePageProps {
  params: Promise<{ token: string }>;
}

export default function ClientQueuePage({ params }: Readonly<ClientQueuePageProps>) {
  return (
    <Suspense fallback={<ClientNeutralLoading />}>
      <ClientQueuePageContent params={params} />
    </Suspense>
  );
}
