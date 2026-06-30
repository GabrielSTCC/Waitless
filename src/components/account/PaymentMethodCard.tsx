"use client";

import { useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { openBillingPortal } from "@/lib/billing/client";
import { hasActiveSubscription } from "@/lib/subscription";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsSection } from "@/components/settings/SettingsSection";

export function PaymentMethodCard() {
  const { t } = useTranslations("account");
  const { t: tb } = useTranslations("billing");
  const { t: tc } = useTranslations("common");
  const { company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const provider = company?.subscription?.paymentProvider ?? "stripe";
  const hasStripeCustomer = Boolean(company?.subscription?.stripeCustomerId);
  const hasAsaasCustomer = Boolean(company?.subscription?.asaasCustomerId);
  const hasCustomer = provider === "asaas" ? hasAsaasCustomer : hasStripeCustomer;
  const isActive = company ? hasActiveSubscription(company) : false;

  async function handlePortal() {
    setError("");
    setLoading(true);
    try {
      await openBillingPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : tb("portalError"));
      setLoading(false);
    }
  }

  return (
    <SettingsSection
      title={t("paymentTitle")}
      description={t("paymentDescription")}
      info={t("info.payment")}
      infoLabel={tc("infoMore")}
      icon={Wallet}
      compact
      className="h-full"
    >
      <p className="text-sm text-on-surface-variant">
        {isActive ? t("paymentActive") : t("noMethod")}
      </p>

      {hasCustomer ? (
        provider === "asaas" ? (
          <>
            <p className="text-xs text-on-surface-variant">{tb("pix.manageHint")}</p>
          </>
        ) : (
          <>
            <SettingsButton
              type="button"
              variant="secondary"
              size="sm"
              icon={ExternalLink}
              loading={loading}
              onClick={() => void handlePortal()}
            >
              {t("managePayment")}
            </SettingsButton>
            <p className="text-xs text-on-surface-variant">{tb("portalHint")}</p>
          </>
        )
      ) : (
        <>
          <SettingsButton type="button" variant="secondary" size="sm" disabled>
            {t("addPayment")}
          </SettingsButton>
          <p className="text-xs text-on-surface-variant">{t("addPaymentHint")}</p>
        </>
      )}

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
    </SettingsSection>
  );
}
