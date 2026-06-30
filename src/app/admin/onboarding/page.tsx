"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeGoogleOnboarding,
  getAuthErrorMessage,
  logout,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import type { BillingCountry } from "@/lib/types";
import { SignInCard } from "@/components/ui/sign-in-card-2";
import {
  buildWelcomeRedirectUrl,
  isSignupConversionPending,
  markSignupConversionPending,
} from "@/lib/marketing/signup-conversion";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, member, loading, hydrateSession } = useAuth();
  const { t } = useTranslations("auth");
  const { t: tc } = useTranslations("common");
  const { locale } = useLocale();
  const [companyName, setCompanyName] = useState("");
  const [billingCountry, setBillingCountry] = useState<BillingCountry>(() =>
    locale === "en" ? "US" : "BR",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/admin/auth");
      return;
    }
    if (member && !submitting) {
      if (isSignupConversionPending()) {
        router.replace(buildWelcomeRedirectUrl(null));
      } else {
        router.replace("/admin");
      }
    }
  }, [loading, user, member, router, submitting]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) {
      setError(t("invalidCredentials"));
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const result = await completeGoogleOnboarding(user.uid, user.email, companyName, billingCountry);
      markSignupConversionPending();
      hydrateSession(result.member, result.company);
      router.replace(buildWelcomeRedirectUrl(null));
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {tc("loading")}
      </div>
    );
  }

  return (
    <SignInCard
      mode="onboarding"
      title={t("onboardingAlmost")}
      subtitle={t("onboardingSubtitle")}
      companyName={companyName}
      billingCountry={billingCountry}
      onCompanyNameChange={setCompanyName}
      onBillingCountryChange={setBillingCountry}
      onSubmit={handleSubmit}
      isLoading={submitting}
      error={error}
      submitLabel={t("createEstablishment")}
      footerPrompt=""
      footerLinkText=""
      secondaryAction={{ label: tc("cancel"), onClick: () => logout() }}
      hideCompanyName={false}
      showGoogle={false}
    />
  );
}
