"use client";

import { Check, X } from "lucide-react";
import {
  PASSWORD_RULE_ORDER,
  testPasswordRule,
  type PasswordRuleKey,
} from "@/lib/auth/password-policy";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface PasswordStrengthChecklistProps {
  password: string;
  className?: string;
}

export function PasswordStrengthChecklist({
  password,
  className,
}: PasswordStrengthChecklistProps) {
  const { t } = useTranslations("security");

  const ruleLabel = (rule: PasswordRuleKey) => {
    switch (rule) {
      case "minLength":
        return t("passwordRuleMinLength");
      case "uppercase":
        return t("passwordRuleUppercase");
      case "lowercase":
        return t("passwordRuleLowercase");
      case "number":
        return t("passwordRuleNumber");
      case "special":
        return t("passwordRuleSpecial");
    }
  };

  return (
    <ul className={cn("space-y-1", className)} aria-live="polite">
      {PASSWORD_RULE_ORDER.map((rule) => {
        const hasInput = password.length > 0;
        const passed = hasInput && testPasswordRule(password, rule);
        const failed = hasInput && !passed;
        return (
          <li
            key={rule}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              passed && "text-success",
              failed && "text-error",
              !hasInput && "text-on-surface-variant",
            )}
          >
            {passed ? (
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
            ) : (
              <X
                className={cn("h-3.5 w-3.5 shrink-0", !failed && "opacity-50")}
                strokeWidth={2}
              />
            )}
            <span>{ruleLabel(rule)}</span>
          </li>
        );
      })}
    </ul>
  );
}
