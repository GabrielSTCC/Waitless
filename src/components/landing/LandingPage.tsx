"use client";

import { useMemo, useRef } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingContrast } from "@/components/landing/LandingContrast";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingSteps } from "@/components/landing/LandingSteps";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingSolutions } from "@/components/landing/LandingSolutions";
import { landingPageBg } from "@/components/landing/landing-layout";
import { useElementVisible } from "@/lib/hooks/useElementVisible";
import { cn } from "@/lib/utils/cn";

export function LandingPage() {
  const stepsRef = useRef<HTMLElement>(null);
  const heroLogoRef = useRef<HTMLDivElement>(null);
  const heroLogoObserver = useMemo(
    () => ({ threshold: 0, rootMargin: "-72px 0px 0px 0px" }),
    [],
  );
  const heroLogoVisible = useElementVisible(heroLogoRef, heroLogoObserver);

  function scrollToSteps() {
    stepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={cn("flex min-h-dvh flex-col", landingPageBg)}>
      <LandingNav showLogo={!heroLogoVisible} />
      <main id="main-content" className="flex-1">
        <LandingHero heroLogoRef={heroLogoRef} onScrollToSteps={scrollToSteps} />
        <LandingContrast />
        <LandingFeatures />
        <LandingSolutions />
        <LandingPricing />
        <LandingSteps ref={stepsRef} />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
