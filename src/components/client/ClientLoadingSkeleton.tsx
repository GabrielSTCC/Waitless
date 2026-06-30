"use client";

import { deepBrandCard, glassPedestal } from "@/lib/utils/brand-surface";
import { ClientExperienceShell } from "./ClientExperienceShell";

export function ClientLoadingSkeleton() {
  return (
    <ClientExperienceShell>
      <div className="flex flex-col items-center px-4 pt-8">
        <div
          className="mb-4 h-20 w-20 animate-pulse rounded-2xl"
          style={glassPedestal()}
        />
        <div className="mb-2 h-5 w-36 animate-pulse rounded-lg bg-on-surface/12" />
        <div className="mb-6 h-3 w-48 animate-pulse rounded-lg bg-on-surface/8" />

        <div className="mx-4 w-full overflow-hidden rounded-3xl" style={deepBrandCard()}>
          <div className="rounded-3xl p-8">
            <div className="mx-auto mb-4 h-3 w-24 animate-pulse rounded bg-white/20" />
            <div className="mx-auto mb-4 h-20 w-16 animate-pulse rounded-lg bg-white/25" />
            <div className="mx-auto h-3 w-40 animate-pulse rounded bg-white/15" />
          </div>
        </div>
      </div>
    </ClientExperienceShell>
  );
}
