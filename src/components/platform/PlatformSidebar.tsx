"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PauseCircle,
  Receipt,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { logoutPlatformSession } from "@/lib/platform/client";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface PlatformSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  query?: string;
}

export function PlatformSidebar({ mobileOpen, onCloseMobile }: PlatformSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslations("platform");

  async function handleLogout() {
    await logoutPlatformSession();
    await signOut(auth);
    if (typeof window !== "undefined") {
      window.location.assign("/platform/auth");
    }
    onCloseMobile?.();
  }

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: t("sections.operation"),
      items: [
        { href: "/platform", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/platform/companies", label: t("companies"), icon: Building2 },
      ],
    },
    {
      title: t("sections.subscriptions"),
      items: [
        {
          href: "/platform/companies",
          label: t("pastDue"),
          icon: AlertTriangle,
          query: "?platformStatus=past_due",
        },
        {
          href: "/platform/companies",
          label: t("suspended"),
          icon: PauseCircle,
          query: "?platformStatus=suspended",
        },
      ],
    },
    {
      title: t("sections.system"),
      items: [
        { href: "/platform/finance", label: t("finance.title"), icon: Receipt },
        { href: "/platform/audit", label: t("audit"), icon: ClipboardList },
      ],
    },
  ];

  function isActive(href: string, query?: string) {
    if (query) {
      return pathname === href && typeof window !== "undefined"
        ? window.location.search === query
        : false;
    }
    return pathname === href || (href !== "/platform" && pathname.startsWith(href));
  }

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
          "md:sticky md:top-0 md:h-dvh md:w-[240px] md:translate-x-0 md:py-5 md:pb-5 md:pt-5",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2 md:mb-6">
          <Logo variant="compact" tone="light" className="mx-0 max-w-[130px] md:max-w-[150px]" />
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t("closeMenu")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#a8b8d0] transition-colors hover:bg-[#122952] hover:text-[#F8F9FA] md:hidden"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto custom-scrollbar">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#6b7c93]">
                {section.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const href = `${item.href}${item.query ?? ""}`;
                  const active = isActive(item.href, item.query);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onCloseMobile}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm transition-all duration-150 active:scale-[0.98]",
                        active
                          ? "bg-[#FF6600]/15 font-medium text-[#FF6600]"
                          : "text-[#a8b8d0] hover:bg-[#122952] hover:text-[#F8F9FA]",
                      )}
                    >
                      <Icon
                        className="h-[18px] w-[18px] shrink-0"
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto shrink-0 border-t border-[#2a4068] pt-3">
          {user?.email && (
            <p className="mb-2 truncate px-2.5 text-xs text-[#6b7c93]">{user.email}</p>
          )}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-[#a8b8d0] transition-colors hover:bg-[#122952] hover:text-[#F8F9FA]"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {t("logout")}
          </button>
        </div>
      </nav>
    </>
  );
}
