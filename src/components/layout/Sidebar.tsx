"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accessibility,
  BarChart3,
  CreditCard,
  HelpCircle,
  KeyRound,
  ListOrdered,
  LogOut,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { logout } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { canAccessRoute } from "@/lib/permissions";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  onAddCustomer: () => void;
  disableAddCustomer?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ onAddCustomer, disableAddCustomer = false, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, member, company } = useAuth();
  const { t } = useTranslations("sidebar");

  async function handleLogout() {
    await logout();
    onCloseMobile?.();
  }

  function handleAddCustomer() {
    onAddCustomer();
    onCloseMobile?.();
  }

  const links = [
    { href: "/admin", label: t("queue"), icon: ListOrdered },
    { href: "/admin/customers", label: t("customers"), icon: Users },
    { href: "/admin/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/admin/settings", label: t("settings"), icon: Settings },
    { href: "/admin/accessibility", label: t("accessibility"), icon: Accessibility },
    { href: "/admin/security", label: t("security"), icon: KeyRound },
    { href: "/admin/account", label: t("account"), icon: CreditCard },
  ];

  const visibleLinks = links.filter((link) =>
    member
      ? canAccessRoute(member.role, link.href, {
          userId: user?.uid,
          companyOwnerId: company?.ownerId,
          company,
        })
      : true,
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
        aria-hidden={!mobileOpen}
      />
      <nav
        aria-label={t("navLabel")}
        className={cn(
          "fixed left-0 z-40 flex w-[min(280px,85vw)] shrink-0 transform flex-col border-r border-[#2a4068] bg-[#0A1B3F] px-3 shadow-surface-sidebar transition-transform duration-200 ease-out",
          "top-14 h-[calc(100dvh-3.5rem)] pb-[env(safe-area-inset-bottom,0px)] pt-4",
          "md:sticky md:top-0 md:h-dvh md:w-[220px] md:translate-x-0 md:py-5 md:pb-5 md:pt-5",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2 md:mb-6">
          <Logo
            variant="compact"
            tone="light"
            className="mx-0 max-w-[130px] md:max-w-[150px]"
          />
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t("closeMenu")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#a8b8d0] transition-colors hover:bg-[#122952] hover:text-[#F8F9FA] md:hidden"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto custom-scrollbar">
          {visibleLinks.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onCloseMobile}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm transition-all duration-150 active:scale-[0.98]",
                  active
                    ? "bg-[#FF6600]/15 font-medium text-[#FF6600]"
                    : "text-[#a8b8d0] hover:bg-[#122952] hover:text-[#F8F9FA]",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto shrink-0 pt-3">
          <button
            type="button"
            onClick={handleAddCustomer}
            disabled={disableAddCustomer}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6600] px-3 py-2.5 text-sm font-medium text-white shadow-surface-raised transition-colors hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            {t("addCustomer")}
          </button>

          <div className="flex flex-col gap-0.5 border-t border-[#2a4068] pt-3">
            <Link
              href="/admin/help"
              onClick={onCloseMobile}
              aria-current={pathname === "/admin/help" ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm transition-all duration-150 active:scale-[0.98]",
                pathname === "/admin/help"
                  ? "bg-[#FF6600]/15 font-medium text-[#FF6600]"
                  : "text-[#a8b8d0] hover:bg-[#122952] hover:text-[#F8F9FA]",
              )}
            >
              <HelpCircle
                className="h-[18px] w-[18px] shrink-0"
                strokeWidth={pathname === "/admin/help" ? 2.25 : 1.75}
              />
              {t("helpCenter")}
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-[#a8b8d0] transition-colors hover:bg-[#122952] hover:text-[#F8F9FA]"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {t("logout")}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
