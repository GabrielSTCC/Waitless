"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ClientExperienceShell } from "@/components/client/ClientExperienceShell";
import { ClientHeader } from "@/components/client/ClientHeader";
import { ClientLivePill } from "@/components/client/ClientLivePill";
import { ClientNeutralLoading } from "@/components/client/ClientNeutralLoading";
import { ClientPrivacyFooter } from "@/components/client/ClientPrivacyFooter";
import { SpotOfferModal } from "@/components/client/SpotOfferModal";
import { WithdrawConfirmModal } from "@/components/client/WithdrawConfirmModal";
import { ClientTabBar, type ClientTab } from "@/components/client/ClientTabBar";
import { ClientQueueTab } from "@/components/client/ClientQueueTab";
import { ClientHistoryTab } from "@/components/client/ClientHistoryTab";
import { ClientProfileTab } from "@/components/client/ClientProfileTab";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import { usePublicQueue } from "@/lib/hooks/usePublicQueue";
import { useClientLocale } from "@/lib/hooks/useClientLocale";
import { useClientHistory } from "@/lib/hooks/useClientHistory";
import { withdrawFromQueue } from "@/lib/firebase/vacancy";

interface ClientQueuePageContentProps {
  token: string;
  initialTab: ClientTab;
}

type WithdrawPhase = "idle" | "confirm" | "whatsapp-prompt" | "done";

const VALID_TABS = new Set<ClientTab>(["queue", "history", "profile"]);

function parseTabFromSearch(search: string): ClientTab {
  const value = new URLSearchParams(search).get("tab");
  if (value && VALID_TABS.has(value as ClientTab)) {
    return value as ClientTab;
  }
  return "queue";
}

export function ClientQueuePageContent({
  token,
  initialTab,
}: Readonly<ClientQueuePageContentProps>) {
  const router = useRouter();
  const { snapshot, loading, connected } = usePublicQueue(token);
  const defaultLocale = snapshot?.locale ?? "pt-BR";
  const { locale, setLocale } = useClientLocale(defaultLocale);
  const t = useClientTranslations(locale);
  const { visits, loading: historyLoading, error: historyError, fetchHistory } =
    useClientHistory(token);

  const [activeTab, setActiveTab] = useState<ClientTab>(initialTab);
  const [withdrawPhase, setWithdrawPhase] = useState<WithdrawPhase>("idle");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  const accentColor = snapshot?.brandAccent;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Sincroniza voltar/avançar do browser sem useSearchParams (evita Suspense na árvore toda).
  useEffect(() => {
    function syncTabFromUrl() {
      setActiveTab(parseTabFromSearch(window.location.search));
    }
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);

  const handleTabChange = useCallback(
    (tab: ClientTab) => {
      setActiveTab(tab);
      const nextParams = new URLSearchParams(window.location.search);
      if (tab === "queue") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", tab);
      }
      const query = nextParams.toString();
      router.replace(query ? `/q/${token}?${query}` : `/q/${token}`, { scroll: false });
    },
    [router, token],
  );

  useEffect(() => {
    if (activeTab === "history") {
      void fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  async function handleWithdrawConfirm() {
    setWithdrawLoading(true);
    setWithdrawError("");
    try {
      const result = await withdrawFromQueue(token);
      if (!result.ok) {
        setWithdrawError(result.error ?? t("client.withdraw.error"));
        return;
      }
      setWithdrawPhase(result.alreadyCancelled ? "done" : "whatsapp-prompt");
    } catch {
      setWithdrawError(t("client.withdraw.error"));
    } finally {
      setWithdrawLoading(false);
    }
  }

  if (loading) {
    return <ClientNeutralLoading />;
  }

  if (!snapshot && !connected) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-heading text-lg font-semibold text-on-surface">
          {t("common.clientRecoveryTitle")}
        </p>
        <p className="max-w-sm text-sm text-on-surface-variant">
          {t("common.clientRecoveryReloadRequired")}
        </p>
        <button
          type="button"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary"
          onClick={() => window.location.reload()}
        >
          {t("common.adBlockerModalReload")}
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-heading text-lg font-semibold text-on-surface">
          {t("client.invalidLink")}
        </p>
        <p className="text-sm text-on-surface-variant">{t("client.invalidLinkBody")}</p>
      </div>
    );
  }

  const brandStyle: CSSProperties | undefined = accentColor
    ? ({ "--color-primary": accentColor, "--color-surface-tint": accentColor } as CSSProperties)
    : undefined;

  const showSpotOffer = snapshot.spotOffer?.status === "pending";

  return (
    <ClientExperienceShell accentColor={accentColor} style={brandStyle} immediate>
      <ClientHeader
        companyName={snapshot.companyName}
        tagline={snapshot.companyTagline}
        logoUrl={snapshot.brandLogoUrl}
        accentColor={accentColor}
        locale={locale}
        compact
        liveSlot={
          <ClientLivePill
            connected={connected}
            accentColor={accentColor}
            locale={locale}
            dense
          />
        }
      />

      <ClientTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        locale={locale}
        accentColor={accentColor}
      />

      <main className="flex flex-1 flex-col">
        <div
          role="tabpanel"
          id={`client-panel-${activeTab}`}
          aria-labelledby={`client-tab-${activeTab}`}
        >
          {activeTab === "queue" && (
            <ClientQueueTab
              snapshot={snapshot}
              accentColor={accentColor}
              locale={locale}
              withdrawPhase={withdrawPhase}
              onWithdrawClick={() => setWithdrawPhase("confirm")}
              onWithdrawSkip={() => setWithdrawPhase("done")}
            />
          )}
          {activeTab === "history" && (
            <ClientHistoryTab
              visits={visits}
              loading={historyLoading}
              error={historyError}
              locale={locale}
              accentColor={accentColor}
            />
          )}
          {activeTab === "profile" && (
            <ClientProfileTab
              token={token}
              locale={locale}
              onLocaleChange={setLocale}
              accentColor={accentColor}
            />
          )}
        </div>
      </main>

      <ClientPrivacyFooter
        privacyNotice={t("client.privacyNotice", { company: snapshot.companyName })}
        privacyLink={t("client.privacyLink")}
      />

      {showSpotOffer && (
        <SpotOfferModal
          token={token}
          companyName={snapshot.companyName}
          accentColor={accentColor}
          locale={locale}
        />
      )}

      <WithdrawConfirmModal
        open={withdrawPhase === "confirm"}
        loading={withdrawLoading}
        error={withdrawError}
        onConfirm={handleWithdrawConfirm}
        onCancel={() => {
          setWithdrawPhase("idle");
          setWithdrawError("");
        }}
        locale={locale}
      />
    </ClientExperienceShell>
  );
}
