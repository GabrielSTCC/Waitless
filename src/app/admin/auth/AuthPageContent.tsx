"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  completeLoginFlow,
  isInvalidCredentialError,
  isTwoFactorPending,
  reportLoginFailed,
} from "@/lib/auth/two-factor-client";
import {
  getAuthErrorMessage,
  login,
  loginWithGoogle,
  registerGoogleAccount,
  signupEstablishment,
  signupWithGoogle,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import type { BillingCountry } from "@/lib/types";
import { SignInCard } from "@/components/ui/sign-in-card-2";
import { LegalFooterStrip } from "@/components/legal/LegalFooterStrip";
import { SignupTermsAcceptance } from "@/components/legal/SignupTermsAcceptance";
import {
  buildWelcomeRedirectUrl,
  isSignupConversionPending,
  markSignupConversionPending,
} from "@/lib/marketing/signup-conversion";
import { getReturnToParam } from "@/lib/marketing/return-to";

type AuthMode = "login" | "signup";

function parseMode(param: string | null): AuthMode {
  return param === "signup" ? "signup" : "login";
}

export function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, member, loading, twoFactorPending, hydrateSession } = useAuth();
  const { t } = useTranslations("auth");
  const { t: tc } = useTranslations("common");
  const { t: tLegal } = useTranslations("legal");
  const { locale } = useLocale();

  const [mode, setMode] = useState<AuthMode>(() =>
    parseMode(searchParams.get("mode")),
  );
  const [companyName, setCompanyName] = useState("");
  const [billingCountry, setBillingCountry] = useState<BillingCountry>(() =>
    locale === "en" ? "US" : "BR",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState("");
  const inviteId = searchParams.get("invite");
  const returnTo = getReturnToParam(searchParams);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      router.replace(`/admin/invite/${invite}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (mode === "login") {
      setTermsAccepted(false);
      setTermsError("");
    }
  }, [mode]);

  useEffect(() => {
    const paramMode = parseMode(searchParams.get("mode"));
    if (paramMode !== modeRef.current) {
      setMode(paramMode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (inviteId) return;
    if (loading || !user) return;
    if (submitting || googleLoading) return;
    if (isTwoFactorPending(user.uid) || twoFactorPending) return;
    if (member) {
      if (isSignupConversionPending()) {
        router.replace(buildWelcomeRedirectUrl(returnTo));
      } else {
        router.replace(returnTo ?? "/admin");
      }
    } else {
      router.replace(returnTo ?? "/admin/onboarding");
    }
  }, [
    loading,
    user,
    member,
    router,
    inviteId,
    submitting,
    googleLoading,
    twoFactorPending,
    returnTo,
  ]);

  const handleModeSwitch = useCallback(
    (target: AuthMode) => {
      if (modeRef.current === target) return;
      modeRef.current = target;
      setMode(target);
      setError("");
      const query = new URLSearchParams();
      if (target === "signup") query.set("mode", "signup");
      if (returnTo) query.set("returnTo", returnTo);
      const qs = query.toString();
      router.replace(`/admin/auth${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, returnTo],
  );

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      await completeLoginFlow(router, () => router.replace(returnTo ?? "/admin"));
    } catch (err) {
      if (isInvalidCredentialError(err)) {
        await reportLoginFailed(email);
      }
      setError(t("invalidCredentials"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignupSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setTermsError("");
    if (!termsAccepted) {
      setTermsError(tLegal("signupTermsRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await signupEstablishment(email, password, companyName, billingCountry);
      markSignupConversionPending();
      hydrateSession(result.member, result.company);
      router.replace(buildWelcomeRedirectUrl(returnTo));
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    try {
      const { isNewMember } = await loginWithGoogle();
      await completeLoginFlow(router, () =>
        router.replace(returnTo ?? (isNewMember ? "/admin/onboarding" : "/admin")),
      );
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setTermsError("");
    if (!termsAccepted) {
      setTermsError(tLegal("signupTermsRequired"));
      return;
    }
    setError("");
    setGoogleLoading(true);
    try {
      if (companyName.trim()) {
        const result = await signupWithGoogle(companyName, billingCountry);
        markSignupConversionPending();
        hydrateSession(result.member, result.company);
        router.replace(buildWelcomeRedirectUrl(returnTo));
      } else {
        await registerGoogleAccount();
        router.replace("/admin/onboarding");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-on-surface-variant">
        {tc("loading")}
      </div>
    );
  }

  const isLogin = mode === "login";

  if (inviteId) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SignInCard
        embedded
        mode={mode}
        title={isLogin ? t("welcomeBack") : t("welcomeSignup")}
        subtitle={isLogin ? t("subtitleLogin") : t("subtitleSignup")}
        companyName={companyName}
        billingCountry={billingCountry}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        onCompanyNameChange={setCompanyName}
        onBillingCountryChange={setBillingCountry}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={isLogin ? handleLoginSubmit : handleSignupSubmit}
        onGoogleClick={isLogin ? handleGoogleLogin : handleGoogleSignup}
        isLoading={submitting}
        isGoogleLoading={googleLoading}
        googleDisabled={!isLogin && !termsAccepted}
        error={error}
        submitLabel={isLogin ? t("submitLogin") : t("submitSignupEmail")}
        backHomeHref="/"
        footerPrompt={isLogin ? t("firstAccess") : t("hasAccount")}
        footerLinkText={isLogin ? t("createEstablishmentLink") : t("login")}
        onModeSwitch={handleModeSwitch}
        requireTermsAcceptance={!isLogin}
        termsAccepted={termsAccepted}
        termsAcceptance={
          !isLogin ? (
            <SignupTermsAcceptance
              checked={termsAccepted}
              onChange={(value) => {
                setTermsAccepted(value);
                if (value) setTermsError("");
              }}
              error={termsError}
            />
          ) : undefined
        }
      />
      <LegalFooterStrip className="shrink-0 bg-background/80" showAdminLink />
    </div>
  );
}
