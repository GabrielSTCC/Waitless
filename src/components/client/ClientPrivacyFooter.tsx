"use client";

import Link from "next/link";
import { LegalFooterStrip } from "@/components/legal/LegalFooterStrip";

interface ClientPrivacyFooterProps {
  privacyNotice: string;
  privacyLink: string;
}

export function ClientPrivacyFooter({
  privacyNotice,
  privacyLink,
}: ClientPrivacyFooterProps) {
  return (
    <div className="mt-auto px-4 pt-6">
      <p className="mb-3 text-center text-[11px] leading-relaxed text-on-surface-variant">
        {privacyNotice}{" "}
        <Link href="/privacidade" className="font-medium text-primary hover:underline">
          {privacyLink}
        </Link>
        .
      </p>
      <LegalFooterStrip className="border-outline-variant/30 bg-transparent px-0" />
    </div>
  );
}
