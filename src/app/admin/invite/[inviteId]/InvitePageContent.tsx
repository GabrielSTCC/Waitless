"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  completeLoginFlow,
  isInvalidCredentialError,
  isTwoFactorPending,
  reportLoginFailed,
} from "@/lib/auth/two-factor-client";
import {
  getAuthErrorMessage,
  loginAndAcceptInvite,
  loginWithGoogleAndAcceptInvite,
  signupGoogleWithInvite,
  signupWithInvite,
} from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import { acceptInvite } from "@/lib/firebase/firestore";
import { fetchInvitePreview } from "@/lib/invites/accept-invite-client";
import { useAuth } from "@/lib/context/AuthContext";
import { SignInCard } from "@/components/ui/sign-in-card-2";

type InviteMode = "signup" | "login";

interface InvitePageContentProps {
  inviteId: string;
}

export function InvitePageContent({ inviteId }: InvitePageContentProps) {
  const router = useRouter();
  const { user, member, loading, twoFactorPending, refreshSession } = useAuth();

  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mode, setMode] = useState<InviteMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const autoAcceptStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setInviteLoading(true);
      setInviteError("");
      try {
        const preview = await fetchInvitePreview(inviteId);
        if (!preview.valid) {
          if (!cancelled) setInviteError("Convite inválido ou expirado.");
          return;
        }

        if (!cancelled) {
          setCompanyName(preview.companyName || "estabelecimento");
        }
      } catch {
        if (!cancelled) setInviteError("Não foi possível carregar o convite.");
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    }

    void loadInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteId]);

  useEffect(() => {
    if (loading || inviteLoading || inviteError) return;
    if (submitting || googleLoading || acceptingInvite) return;

    if (member) {
      if (
        user &&
        (isTwoFactorPending(user.uid) || twoFactorPending)
      ) {
        router.replace("/admin/auth/verify-2fa");
      } else {
        router.replace("/admin");
      }
      return;
    }

    if (!user || autoAcceptStarted.current) return;

    autoAcceptStarted.current = true;
    setAcceptingInvite(true);
    setError("");

    void (async () => {
      try {
        await acceptInvite(inviteId, user.uid, user.email ?? "");
        await refreshSession();
        router.replace("/admin");
      } catch (err) {
        setError(getAuthErrorMessage(err));
        autoAcceptStarted.current = false;
      } finally {
        setAcceptingInvite(false);
      }
    })();
  }, [
    user,
    member,
    loading,
    inviteLoading,
    inviteError,
    inviteId,
    refreshSession,
    router,
    twoFactorPending,
    submitting,
    googleLoading,
    acceptingInvite,
  ]);

  async function finishInviteFlow() {
    await auth.authStateReady();
    await refreshSession();
    router.replace("/admin");
  }

  async function handleSignupSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await signupWithInvite(email, password, inviteId);
      await finishInviteFlow();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginAndAcceptInvite(email, password, inviteId);
      await completeLoginFlow(router, finishInviteFlow);
    } catch (err) {
      if (isInvalidCredentialError(err)) {
        await reportLoginFailed(email);
      }
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      if (mode === "signup") {
        const result = await signupGoogleWithInvite(inviteId);
        if (result.alreadyRegistered) {
          setError("Esta conta já pertence a um estabelecimento.");
          return;
        }
      } else {
        const result = await loginWithGoogleAndAcceptInvite(inviteId);
        if (result.alreadyRegistered) {
          await completeLoginFlow(router, finishInviteFlow);
          return;
        }
      }
      await completeLoginFlow(router, finishInviteFlow);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  if (inviteLoading || loading || acceptingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {acceptingInvite ? "Aceitando convite..." : "Carregando convite..."}
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-outline-variant bg-surface-container p-6 text-center">
          <p className="text-sm text-error">{inviteError}</p>
          <Link
            href="/admin/auth"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  const isSignup = mode === "signup";

  return (
    <SignInCard
      mode={isSignup ? "signup" : "login"}
      title="Você foi convidado"
      subtitle={`Entre na equipe de ${companyName} no Waitless. Use o e-mail que recebeu o convite.`}
      hideCompanyName
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={isSignup ? handleSignupSubmit : handleLoginSubmit}
      onGoogleClick={handleGoogle}
      isLoading={submitting}
      isGoogleLoading={googleLoading}
      error={error}
      submitLabel={isSignup ? "Criar conta e entrar" : "Entrar na equipe"}
      footerPrompt={isSignup ? "Já tem conta?" : "Primeiro acesso?"}
      footerLinkText={isSignup ? "Entrar com este convite" : "Criar conta com convite"}
      onModeSwitch={(target) => {
        setError("");
        setMode(target);
      }}
    />
  );
}
