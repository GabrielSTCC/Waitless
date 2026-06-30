"use client";

import Script from "next/script";
import { useCallback, useEffect } from "react";
import { hasConsent } from "@/lib/legal/cookie-consent";
import {
  getGoogleAdsId,
  hasGoogleAdsId,
  syncGoogleAdsConsent,
} from "@/lib/marketing/google-ads";

export function GoogleAdsScripts() {
  const adsId = getGoogleAdsId();

  const syncConsent = useCallback(() => {
    syncGoogleAdsConsent(hasConsent("marketing"));
  }, []);

  useEffect(() => {
    syncConsent();
    window.addEventListener("waitless:cookie-consent-updated", syncConsent);
    return () => window.removeEventListener("waitless:cookie-consent-updated", syncConsent);
  }, [syncConsent]);

  if (!hasGoogleAdsId() || !adsId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="afterInteractive"
        onLoad={syncConsent}
      />
      <Script id="google-ads-gtag" strategy="afterInteractive" onReady={syncConsent}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
          });
          gtag('js', new Date());
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  );
}
