"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Store,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { surfaceModal } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import {
  AuthQueueParade,
  type ParadeDirection,
} from "@/components/auth/AuthQueueParade";
import { LanguageSwitcher } from "@/components/accessibility/LanguageSwitcher";
import { validatePassword } from "@/lib/auth/password-policy";
import { PasswordStrengthChecklist } from "@/components/security/PasswordStrengthChecklist";
import { useTranslations } from "@/components/providers/LocaleProvider";
import type { BillingCountry } from "@/lib/types";

export type SignInCardMode = "login" | "signup" | "onboarding";

export interface SignInCardProps {
  mode: SignInCardMode;
  title: string;
  subtitle: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  companyName?: string;
  billingCountry?: BillingCountry;
  onEmailChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
  onConfirmPasswordChange?: (value: string) => void;
  onCompanyNameChange?: (value: string) => void;
  onBillingCountryChange?: (value: BillingCountry) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleClick?: () => Promise<void>;
  isLoading?: boolean;
  isGoogleLoading?: boolean;
  googleDisabled?: boolean;
  showGoogle?: boolean;
  error?: string;
  footerPrompt: string;
  footerLinkHref?: string;
  footerLinkText: string;
  submitLabel: string;
  /** Link para voltar à home pública (ex.: landing `/`) */
  backHomeHref?: string;
  onModeSwitch?: (target: "login" | "signup") => void;
  secondaryAction?: { label: string; onClick: () => void };
  hideCompanyName?: boolean;
  /** Checkbox de aceite dos Termos e Privacidade (signup) */
  termsAcceptance?: React.ReactNode;
  requireTermsAcceptance?: boolean;
  termsAccepted?: boolean;
  /** Quando true, ocupa o espaço acima de um rodapé fixo em vez de forçar min-h-screen */
  embedded?: boolean;
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const inputClassName =
  "h-10 border-outline-variant bg-surface-container-low pl-10 text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:bg-surface-container";

type AuthFieldKey = "company" | "email" | "password" | "confirmPassword";

function validateAuthFields({
  mode,
  showCompanyField,
  showCredentials,
  showConfirmPasswordField,
  companyName,
  email,
  password,
  confirmPassword,
}: {
  mode: SignInCardMode;
  showCompanyField: boolean;
  showCredentials: boolean;
  showConfirmPasswordField: boolean;
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Partial<Record<AuthFieldKey, string>> {
  const errors: Partial<Record<AuthFieldKey, string>> = {};

  if (showCompanyField && !companyName.trim()) {
    errors.company = "Informe o nome do estabelecimento.";
  }

  if (showCredentials) {
    if (!email.trim()) {
      errors.email = "Informe seu e-mail.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "E-mail inválido.";
    }

    if (!password) {
      errors.password = "Informe sua senha.";
    } else if (mode === "signup" && !validatePassword(password).valid) {
      errors.password = "A senha não atende aos requisitos de segurança.";
    }

    if (showConfirmPasswordField) {
      if (!confirmPassword) {
        errors.confirmPassword = "Confirme sua senha.";
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "As senhas não coincidem.";
      }
    }
  }

  return errors;
}

export function SignInCard({
  mode,
  title,
  subtitle,
  email = "",
  password = "",
  confirmPassword = "",
  companyName = "",
  billingCountry = "BR",
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onCompanyNameChange,
  onBillingCountryChange,
  onSubmit,
  onGoogleClick,
  isLoading = false,
  isGoogleLoading = false,
  googleDisabled = false,
  showGoogle = true,
  error,
  footerPrompt,
  footerLinkHref,
  footerLinkText,
  submitLabel,
  backHomeHref,
  onModeSwitch,
  secondaryAction,
  hideCompanyName = false,
  termsAcceptance,
  requireTermsAcceptance = false,
  termsAccepted = false,
  embedded = false,
}: SignInCardProps) {
  const { t } = useTranslations("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldKey, string>>>({});
  const [paradeActive, setParadeActive] = useState(false);

  useEffect(() => {
    setFieldErrors({});
  }, [mode]);
  const [paradeDirection, setParadeDirection] = useState<ParadeDirection>("ltr");
  const [isSwitching, setIsSwitching] = useState(false);
  const switchTargetRef = useRef<"login" | "signup" | null>(null);
  const midpointFiredRef = useRef(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [6, -6]);
  const rotateY = useTransform(mouseX, [-300, 300], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const showCredentials = mode !== "onboarding";
  const showCompanyField = !hideCompanyName && (mode === "signup" || mode === "onboarding");
  const showConfirmPasswordField = mode === "signup";
  const passwordWeak =
    mode === "signup" &&
    password.length > 0 &&
    !validatePassword(password).valid;
  const passwordsMismatch =
    showConfirmPasswordField &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;
  const submitDisabled =
    isLoading ||
    isSwitching ||
    (mode === "signup" && !hideCompanyName && !companyName.trim()) ||
    (mode === "signup" && passwordWeak) ||
    (mode === "signup" && passwordsMismatch) ||
    (mode === "onboarding" && !companyName.trim()) ||
    (requireTermsAcceptance && !termsAccepted);

  function clearFieldError(field: AuthFieldKey) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateAuthFields({
      mode,
      showCompanyField,
      showCredentials,
      showConfirmPasswordField,
      companyName,
      email,
      password,
      confirmPassword,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    onSubmit(e);
  }

  function handleFooterClick() {
    if (!onModeSwitch || isSwitching || mode === "onboarding") return;
    const target = mode === "login" ? "signup" : "login";
    switchTargetRef.current = target;
    midpointFiredRef.current = false;
    setParadeDirection(mode === "login" ? "ltr" : "rtl");
    setParadeActive(true);
    setIsSwitching(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onModeSwitch(target);
      switchTargetRef.current = null;
      setParadeActive(false);
      setIsSwitching(false);
    }
  }

  function handleParadeMidpoint() {
    if (!onModeSwitch || midpointFiredRef.current || !switchTargetRef.current) return;
    midpointFiredRef.current = true;
    onModeSwitch(switchTargetRef.current);
  }

  function handleParadeComplete() {
    setParadeActive(false);
    setIsSwitching(false);
    switchTargetRef.current = null;
    midpointFiredRef.current = false;
  }

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center bg-background px-4",
        embedded ? "min-h-0 flex-1 overflow-y-auto py-6" : "min-h-screen overflow-hidden",
      )}
    >
      {backHomeHref && (
        <Link
          href={backHomeHref}
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container/80 px-3 py-2 text-xs font-medium text-on-surface-variant shadow-surface-input backdrop-blur-sm transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
          {t("backHome")}
        </Link>
      )}
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher variant="compact" />
      </div>
      <AuthQueueParade
        active={paradeActive}
        direction={paradeDirection}
        onMidpoint={handleParadeMidpoint}
        onComplete={handleParadeComplete}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-surface-dim" />

      <div className="absolute top-0 left-1/2 h-[50vh] w-[100vh] -translate-x-1/2 rounded-b-[50%] bg-primary/10 blur-[80px]" />
      <motion.div
        className="absolute bottom-0 left-1/2 h-[60vh] w-[80vh] -translate-x-1/2 rounded-t-full bg-brand-navy/5 blur-[60px]"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 10 }}
        >
          <div className="group relative">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/20 via-outline-variant/30 to-primary/20 opacity-80" />

            <div className={cn("relative overflow-hidden p-6", surfaceModal)}>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="mx-auto mb-5 flex w-full justify-center"
              >
                <Logo />
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative mb-5 space-y-2 text-center">
                    <h1 className="font-heading text-xl font-bold text-on-surface">
                      {title}
                    </h1>
                    <p className="text-xs text-on-surface-variant">{subtitle}</p>
                  </div>

              {showGoogle && mode !== "onboarding" && onGoogleClick && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    disabled={googleDisabled || isGoogleLoading}
                    onClick={() => onGoogleClick()}
                    className="group/google relative mb-4 w-full"
                  >
                    <div className="relative flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-medium text-on-surface transition-all duration-300 hover:border-outline hover:bg-surface-container-high disabled:opacity-50">
                      <GoogleIcon />
                      <span>
                        {isGoogleLoading
                          ? "Conectando..."
                          : mode === "signup"
                            ? "Cadastrar com Google"
                            : "Continuar com Google"}
                      </span>
                    </div>
                  </motion.button>

                  <div className="relative mb-4 flex items-center">
                    <div className="flex-grow border-t border-outline-variant" />
                    <span className="mx-3 text-xs text-on-surface-variant">ou</span>
                    <div className="flex-grow border-t border-outline-variant" />
                  </div>
                </>
              )}

              <form noValidate onSubmit={handleFormSubmit} className="relative space-y-4">
                {showCompanyField && (
                  <>
                    <AuthField
                      icon={Store}
                      focused={focusedInput === "company"}
                      error={fieldErrors.company}
                    >
                      <Input
                        value={companyName}
                        onChange={(e) => {
                          clearFieldError("company");
                          onCompanyNameChange?.(e.target.value);
                        }}
                        onFocus={() => setFocusedInput("company")}
                        onBlur={() => setFocusedInput(null)}
                        placeholder={t("companyName")}
                        className={cn(
                          inputClassName,
                          fieldErrors.company && "border-error focus:border-error",
                        )}
                      />
                    </AuthField>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="billing-country"
                        className="text-xs font-medium text-on-surface-variant"
                      >
                        {t("billingCountry")}
                      </label>
                      <select
                        id="billing-country"
                        value={billingCountry}
                        onChange={(e) =>
                          onBillingCountryChange?.(e.target.value as BillingCountry)
                        }
                        className={cn(
                          "h-10 w-full rounded-md border border-outline-variant bg-surface-container-low px-3.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                        )}
                      >
                        <option value="BR">{t("billingCountryBR")}</option>
                        <option value="US">{t("billingCountryUS")}</option>
                      </select>
                      <p className="text-[11px] text-on-surface-variant">{t("billingCountryHint")}</p>
                    </div>
                  </>
                )}

                {showCredentials && (
                  <>
                    <AuthField
                      icon={Mail}
                      focused={focusedInput === "email"}
                      error={fieldErrors.email}
                    >
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          clearFieldError("email");
                          onEmailChange?.(e.target.value);
                        }}
                        onFocus={() => setFocusedInput("email")}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="E-mail"
                        className={cn(
                          inputClassName,
                          fieldErrors.email && "border-error focus:border-error",
                        )}
                      />
                    </AuthField>

                    <AuthField
                      icon={Lock}
                      focused={focusedInput === "password"}
                      error={fieldErrors.password}
                    >
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => {
                          clearFieldError("password");
                          onPasswordChange?.(e.target.value);
                        }}
                        onFocus={() => setFocusedInput("password")}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="Senha"
                        className={cn(
                          inputClassName,
                          "pr-10",
                          (fieldErrors.password || passwordWeak) &&
                            "border-error focus:border-error",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-on-surface-variant transition-colors hover:text-on-surface"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </AuthField>

                    {showConfirmPasswordField && password.length > 0 && (
                      <PasswordStrengthChecklist password={password} />
                    )}

                    {showConfirmPasswordField && (
                      <AuthField
                        icon={Lock}
                        focused={focusedInput === "confirmPassword"}
                        error={fieldErrors.confirmPassword}
                      >
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => {
                            clearFieldError("confirmPassword");
                            onConfirmPasswordChange?.(e.target.value);
                          }}
                          onFocus={() => setFocusedInput("confirmPassword")}
                          onBlur={() => setFocusedInput(null)}
                          placeholder="Confirmar senha"
                          className={cn(
                            inputClassName,
                            "pr-10",
                            (fieldErrors.confirmPassword || passwordsMismatch) &&
                              "border-error focus:border-error",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 text-on-surface-variant transition-colors hover:text-on-surface"
                          aria-label={
                            showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </AuthField>
                    )}
                  </>
                )}

                {passwordWeak && !fieldErrors.password && (
                  <p className="rounded-lg border border-error/25 bg-error-container/40 px-3 py-2 text-xs text-error">
                    A senha não atende aos requisitos de segurança.
                  </p>
                )}

                {passwordsMismatch && !fieldErrors.confirmPassword && (
                  <p className="rounded-lg border border-error/25 bg-error-container/40 px-3 py-2 text-xs text-error">
                    As senhas não coincidem.
                  </p>
                )}

                {error && !passwordsMismatch && Object.keys(fieldErrors).length === 0 && (
                  <p className="rounded-lg border border-error/25 bg-error-container/40 px-3 py-2 text-center text-xs text-error">
                    {error}
                  </p>
                )}

                {termsAcceptance}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitDisabled}
                  className="group/button relative mt-2 w-full"
                >
                  <div className="absolute inset-0 rounded-lg bg-primary/20 opacity-0 blur-lg transition-opacity duration-300 group-hover/button:opacity-70" />
                  <div className="relative flex h-10 items-center justify-center overflow-hidden rounded-lg bg-primary font-medium text-on-primary transition-all duration-300 hover:brightness-95 disabled:opacity-60">
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/70 border-t-transparent" />
                        </motion.div>
                      ) : (
                        <motion.span
                          key="button-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1 text-sm font-medium"
                        >
                          {submitLabel}
                          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/button:translate-x-1" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>

                <motion.p
                  className="mt-4 text-center text-xs text-on-surface-variant"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {footerPrompt}{" "}
                  {onModeSwitch ? (
                    <button
                      type="button"
                      disabled={isSwitching}
                      onClick={handleFooterClick}
                      className="group/link relative inline-block font-medium text-primary disabled:opacity-50"
                    >
                      <span className="relative z-10 transition-colors duration-300 group-hover/link:text-surface-tint">
                        {footerLinkText}
                      </span>
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover/link:w-full" />
                    </button>
                  ) : (
                    <Link
                      href={footerLinkHref ?? "/admin/auth"}
                      className="group/link relative inline-block font-medium text-primary"
                    >
                      <span className="relative z-10 transition-colors duration-300 group-hover/link:text-surface-tint">
                        {footerLinkText}
                      </span>
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover/link:w-full" />
                    </Link>
                  )}
                </motion.p>

                {secondaryAction && (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    className="w-full text-xs text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </form>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function AuthField({
  icon: Icon,
  focused,
  error,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  focused: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={cn("relative", focused && "z-10")}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="relative flex items-center overflow-hidden rounded-lg">
        <Icon
          className={cn(
            "absolute left-3 h-4 w-4 transition-all duration-300",
            focused ? "text-primary" : error ? "text-error" : "text-on-surface-variant",
          )}
          strokeWidth={2}
        />
        {children}
      </div>
      {error && (
        <p className="mt-1.5 rounded-lg border border-error/25 bg-error-container/40 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}
    </motion.div>
  );
}

/** @deprecated Use SignInCard — kept for shadcn demo compatibility */
export const Component = SignInCard;
