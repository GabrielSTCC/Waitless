"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  markAreaGuideSeen,
  resolveAreaId,
  shouldAutoOpenAreaGuide,
  type AreaGuideId,
} from "@/lib/admin/area-guide";
import { isAdminProtectedPath } from "@/lib/admin/protection-advisory";

interface AdminFloatingHelpersContextValue {
  areaGuideOpen: boolean;
  setAreaGuideOpen: (open: boolean) => void;
  areaId: AreaGuideId | null;
  areaGuideVisible: boolean;
  closeAreaGuide: () => void;
  toggleAreaGuide: () => void;
}

const AdminFloatingHelpersContext =
  createContext<AdminFloatingHelpersContextValue | null>(null);

export function useAdminFloatingHelpers(): AdminFloatingHelpersContextValue {
  const ctx = useContext(AdminFloatingHelpersContext);
  if (!ctx) {
    throw new Error("useAdminFloatingHelpers must be used within AdminFloatingHelpers");
  }
  return ctx;
}

export function useAdminFloatingHelpersOptional(): AdminFloatingHelpersContextValue | null {
  return useContext(AdminFloatingHelpersContext);
}

export function AdminFloatingHelpersProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const { user, company, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [areaGuideOpen, setAreaGuideOpenState] = useState(false);

  const areaId = resolveAreaId(pathname);
  const onAdminPath = isAdminProtectedPath(pathname);
  const uid = user?.uid ?? "";
  const isOwner = !!user && !!company && user.uid === company.ownerId;
  const areaAllowed = areaId !== "account" || isOwner;
  const areaGuideVisible =
    mounted && onAdminPath && !loading && !!user && !!areaId && areaAllowed;

  useEffect(() => {
    setMounted(true);
  }, []);

  const setAreaGuideOpen = useCallback((open: boolean) => {
    setAreaGuideOpenState(open);
  }, []);

  const closeAreaGuide = useCallback(() => {
    if (uid && areaId) {
      markAreaGuideSeen(uid, areaId);
    }
    setAreaGuideOpenState(false);
  }, [uid, areaId]);

  const toggleAreaGuide = useCallback(() => {
    setAreaGuideOpenState((current) => {
      const next = !current;
      if (!next && uid && areaId) {
        markAreaGuideSeen(uid, areaId);
      }
      return next;
    });
  }, [uid, areaId]);

  useEffect(() => {
    if (!mounted || !uid || !areaId || !areaAllowed) {
      setAreaGuideOpenState(false);
      return;
    }
    if (shouldAutoOpenAreaGuide(uid, areaId)) {
      setAreaGuideOpenState(true);
      return;
    }
    setAreaGuideOpenState(false);
  }, [mounted, uid, areaId, areaAllowed]);

  const value = useMemo(
    () => ({
      areaGuideOpen,
      setAreaGuideOpen,
      areaId,
      areaGuideVisible,
      closeAreaGuide,
      toggleAreaGuide,
    }),
    [
      areaGuideOpen,
      setAreaGuideOpen,
      areaId,
      areaGuideVisible,
      closeAreaGuide,
      toggleAreaGuide,
    ],
  );

  return (
    <AdminFloatingHelpersContext.Provider value={value}>
      {children}
    </AdminFloatingHelpersContext.Provider>
  );
}
