"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { landingPageBg } from "@/components/landing/landing-layout";
import { cn } from "@/lib/utils/cn";

export function PlansPage() {
  return (
    <div className={cn("flex min-h-dvh flex-col", landingPageBg)}>
      <LandingNav showLogo />
      <main id="main-content" className="flex-1 pt-20 sm:pt-24">
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}
