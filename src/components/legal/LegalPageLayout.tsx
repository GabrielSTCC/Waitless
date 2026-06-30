import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LegalFooterStrip } from "@/components/legal/LegalFooterStrip";
import { landingContainer, landingPageBg } from "@/components/landing/landing-layout";
import { cn } from "@/lib/utils/cn";

interface LegalPageLayoutProps {
  children: React.ReactNode;
  backLabel: string;
}

export function LegalPageLayout({ children, backLabel }: LegalPageLayoutProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col", landingPageBg)}>
      <header className="border-b border-outline-variant/40 bg-surface/80 backdrop-blur-sm">
        <div
          className={cn(
            landingContainer,
            "flex h-16 items-center justify-between gap-4 py-3",
          )}
        >
          <Link href="/" className="shrink-0">
            <Logo variant="compact" className="mx-0 max-w-[100px]" />
          </Link>
          <Link
            href="/"
            className="text-sm text-on-surface-variant transition-colors hover:text-on-surface"
          >
            {backLabel}
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1 py-10 md:py-14">
        <div className={cn(landingContainer, "max-w-3xl")}>{children}</div>
      </main>

      <LegalFooterStrip showDpo className="bg-surface/60" />
    </div>
  );
}
