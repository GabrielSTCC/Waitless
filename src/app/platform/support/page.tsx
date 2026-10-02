import { Suspense } from "react";
import PlatformSupportContent from "./PlatformSupportContent";

export default function PlatformSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
          Carregando...
        </div>
      }
    >
      <PlatformSupportContent />
    </Suspense>
  );
}
