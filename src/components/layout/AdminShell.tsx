"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { buildAuthRedirectUrl } from "@/lib/marketing/return-to";
import { useAuth } from "@/lib/context/AuthContext";
import {
  addExistingClientToQueue,
  upsertClientAndAddToQueue,
} from "@/lib/queue/queue-actions";
import {
  canAccessRouteWhenSuspended,
  isCompanyOperationallyBlocked,
} from "@/lib/permissions";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { LegalFooterStrip } from "@/components/legal/LegalFooterStrip";
import { SuspendedBanner } from "@/components/platform/SuspendedBanner";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { TrialWelcomeModal } from "@/components/billing/TrialWelcomeModal";
import { isTrialWelcomeDismissed } from "@/lib/billing/trial-intro-storage";
import { canOperateQueue, isTrialActive } from "@/lib/billing/trial";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { AddCustomerModal } from "@/components/clients/AddCustomerModal";
import type { Client } from "@/lib/types";

interface AdminShellProps {
  children: ReactNode;
  /** Exibe modal de adicionar cliente via sidebar */
  showAddCustomer?: boolean;
  requireMember?: boolean;
  onAddCustomerSubmit?: (data: { name: string; whatsapp: string }) => Promise<void>;
  /** Optional: enqueue an already registered client from the modal list. */
  onSelectExistingCustomer?: (client: Client) => Promise<void>;
  /** Controlled open state for the add-customer modal (e.g. header shortcut). */
  addCustomerOpen?: boolean;
  onAddCustomerOpenChange?: (open: boolean) => void;
}

function LoadingScreen({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
      {label}
    </div>
  );
}

export function AdminShell({
  children,
  showAddCustomer = true,
  requireMember = true,
  onAddCustomerSubmit,
  onSelectExistingCustomer,
  addCustomerOpen,
  onAddCustomerOpenChange,
}: Readonly<AdminShellProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, member, company, loading, twoFactorPending } = useAuth();
  const { t } = useTranslations("common");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [trialWelcomeOpen, setTrialWelcomeOpen] = useState(false);

  const isControlled = addCustomerOpen !== undefined;
  const modalOpen = isControlled ? addCustomerOpen : internalModalOpen;

  function setModalOpen(open: boolean) {
    if (isControlled) {
      onAddCustomerOpenChange?.(open);
      return;
    }
    setInternalModalOpen(open);
  }

  const sessionReady =
    !loading &&
    !!user &&
    !twoFactorPending &&
    (!requireMember || !!member);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const returnPath = `${pathname}${search}`;
      router.replace(buildAuthRedirectUrl(returnPath));
      return;
    }
    if (twoFactorPending) {
      router.replace("/admin/auth/verify-2fa");
      return;
    }
    if (requireMember && !member) {
      router.replace("/admin/onboarding");
    }
  }, [loading, user, member, twoFactorPending, requireMember, router, pathname]);

  useEffect(() => {
    if (loading || !company || !pathname) return;
    if (
      isCompanyOperationallyBlocked(company) &&
      !canAccessRouteWhenSuspended(pathname)
    ) {
      router.replace("/admin/account");
    }
  }, [loading, company, pathname, router]);

  useEffect(() => {
    if (!sessionReady || !company || !user) return;
    const isOwner = user.uid === company.ownerId;
    if (
      isOwner &&
      isTrialActive(company) &&
      !isTrialWelcomeDismissed(company.id)
    ) {
      setTrialWelcomeOpen(true);
    }
  }, [sessionReady, company, user]);

  const canOperate = company ? canOperateQueue(company) : true;

  async function handleAddCustomer(data: { name: string; whatsapp: string }) {
    if (!canOperate) return;
    if (onAddCustomerSubmit) {
      await onAddCustomerSubmit(data);
      return;
    }
    if (!member?.companyId) return;
    const avg = company?.avgServiceTimeMin ?? 10;
    await upsertClientAndAddToQueue(member.companyId, data, avg);
  }

  async function handleSelectExisting(client: Client) {
    if (!canOperate) return;
    if (onSelectExistingCustomer) {
      await onSelectExistingCustomer(client);
      return;
    }
    if (!member?.companyId) return;
    const avg = company?.avgServiceTimeMin ?? 10;
    await addExistingClientToQueue(member.companyId, client, avg);
  }

  if (!sessionReady) {
    return <LoadingScreen label={t("loading")} />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          {t("skipToContent")}
        </a>
        <MobileHeader
          menuOpen={mobileMenuOpen}
          onMenuClick={() => setMobileMenuOpen(true)}
          onMenuClose={() => setMobileMenuOpen(false)}
        />
        <Sidebar
          onAddCustomer={showAddCustomer && canOperate ? () => setModalOpen(true) : () => {}}
          disableAddCustomer={!canOperate}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {company && <SuspendedBanner company={company} />}
          {company && <TrialBanner company={company} />}
          {children}
          <LegalFooterStrip variant="admin" className="bg-surface-container-low/40" />
        </div>
        {showAddCustomer && canOperate && (
          <AddCustomerModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={handleAddCustomer}
            onSelectExisting={handleSelectExisting}
            companyId={member?.companyId}
          />
        )}
        {user?.uid != null && user.uid === company?.ownerId && (
          <TrialWelcomeModal
            open={trialWelcomeOpen}
            company={company}
            onClose={() => setTrialWelcomeOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
