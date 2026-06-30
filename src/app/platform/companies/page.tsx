import { Suspense } from "react";
import PlatformCompaniesPage from "./PlatformCompaniesContent";

export default function PlatformCompaniesRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
          Carregando...
        </div>
      }
    >
      <PlatformCompaniesPage />
    </Suspense>
  );
}
