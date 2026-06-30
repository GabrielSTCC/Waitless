"use client";

import Link from "next/link";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface SignupTermsAcceptanceProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  className?: string;
}

export function SignupTermsAcceptance({
  checked,
  onChange,
  error,
  className,
}: SignupTermsAcceptanceProps) {
  const { t } = useTranslations("legal");

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex cursor-pointer items-start gap-2.5 text-left">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline text-primary focus:ring-primary"
        />
        <span className="text-xs leading-relaxed text-on-surface-variant">
          {t("signupTermsPrefix")}{" "}
          <Link href="/termos" target="_blank" className="font-medium text-primary hover:underline">
            {t("signupTermsLink")}
          </Link>{" "}
          {t("signupTermsAnd")}{" "}
          <Link
            href="/privacidade"
            target="_blank"
            className="font-medium text-primary hover:underline"
          >
            {t("signupPrivacyLink")}
          </Link>
          .
        </span>
      </label>
      {error && (
        <p className="rounded-lg border border-error/25 bg-error-container/40 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
