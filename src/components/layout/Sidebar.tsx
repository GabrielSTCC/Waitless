"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Accessibility,
  BarChart3,
  CalendarClock,
  CreditCard,
  HelpCircle,
  KeyRound,
  ListOrdered,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
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

const COLLAPSED_KEY = "waitless-sidebar-collapsed";

interface SidebarProps {
  onAddCustomer: () => void;
  disableAddCustomer?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ onAddCustomer, disableAddCustomer = false, mobileOpen, onCloseMobile }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const { user, member, company } = useAuth();
  const { t } = useTranslations("sidebar");
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [widthReady, setWidthReady] = useState(false);

  useEffect(() => {
    setWidthReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

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
    { href: "/admin/appointments", label: t("appointments"), icon: CalendarClock },
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

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <>
      <button
        type="button"
        aria-label={t("closeMenu")}
        disabled={!mobileOpen}
        className={cn(
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
      />
      <nav
        aria-label={t("navLabel")}
        data-collapsed={collapsed ? "true" : undefined}
        className={cn(
          "fixed left-0 z-40 flex w-[min(280px,85vw)] shrink-0 transform flex-col border-r border-sidebar-border bg-sidebar px-3 shadow-surface-sidebar backdrop-blur-sm transition-transform duration-200 ease-out",
          "top-14 h-[calc(100dvh-3.5rem)] pb-[env(safe-area-inset-bottom,0px)] pt-4",
          "md:relative md:top-auto md:left-auto md:h-full md:translate-x-0 md:rounded-3xl md:border md:border-sidebar-border md:bg-sidebar md:py-5 md:pb-5 md:pt-5 md:backdrop-blur-sm",
          widthReady && "md:transition-[width] md:duration-200 md:ease-out",
          collapsed ? "md:w-[4.5rem] md:px-2" : "md:w-[220px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div
          className={cn(
            "mb-4 flex shrink-0 items-center gap-2 md:mb-6",
            collapsed ? "md:justify-center" : "justify-between",
          )}
        >
          <Logo
            variant="compact"
            tone="light"
            className={cn(
              "mx-0 max-w-[130px] md:max-w-[150px]",
              collapsed && "md:hidden",
            )}
          />
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t("closeMenu")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-sidebar-hover hover:text-white md:hidden"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t("expandMenu") : t("collapseMenu")}
            title={collapsed ? t("expandMenu") : t("collapseMenu")}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-sidebar-hover hover:text-white md:flex"
          >
            <ToggleIcon className="h-5 w-5" strokeWidth={2} />
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
                aria-label={link.label}
                title={link.label}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm transition-all duration-150 active:scale-[0.98]",
                  collapsed
                    ? "gap-2.5 px-2.5 md:justify-center md:gap-0 md:px-0"
                    : "gap-2.5 px-2.5",
                  active
                    ? "bg-[#FF6600]/20 font-medium text-[#FF6600]"
                    : "text-white/90 hover:bg-sidebar-hover hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span className={cn(collapsed && "md:sr-only")}>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto shrink-0 pt-3">
          <button
            type="button"
            onClick={handleAddCustomer}
            disabled={disableAddCustomer}
            title={t("addCustomer")}
            aria-label={t("addCustomer")}
            className={cn(
              "mb-3 flex w-full items-center justify-center rounded-lg bg-[#FF6600] py-2.5 text-sm font-medium text-white shadow-surface-raised transition-colors hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              collapsed ? "md:px-0" : "gap-2 px-3",
            )}
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            <span className={cn(collapsed && "md:sr-only")}>{t("addCustomer")}</span>
          </button>

          <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
            <Link
              href="/admin/help"
              onClick={onCloseMobile}
              aria-current={pathname === "/admin/help" ? "page" : undefined}
              aria-label={t("helpCenter")}
              title={t("helpCenter")}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm transition-all duration-150 active:scale-[0.98]",
                collapsed && "md:justify-center md:gap-0",
                pathname === "/admin/help"
                  ? "bg-[#FF6600]/20 font-medium text-[#FF6600]"
                  : "text-white/90 hover:bg-sidebar-hover hover:text-white",
              )}
            >
              <HelpCircle
                className="h-[18px] w-[18px] shrink-0"
                strokeWidth={pathname === "/admin/help" ? 2.25 : 1.75}
              />
              <span className={cn(collapsed && "md:sr-only")}>{t("helpCenter")}</span>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={t("logout")}
              title={t("logout")}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-white/90 transition-colors hover:bg-sidebar-hover hover:text-white",
                collapsed && "md:justify-center md:gap-0",
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span className={cn(collapsed && "md:sr-only")}>{t("logout")}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
