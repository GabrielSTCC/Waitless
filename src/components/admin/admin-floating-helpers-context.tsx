"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AdminFloatingHelpersContextValue {
  areaGuideOpen: boolean;
  setAreaGuideOpen: (open: boolean) => void;
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
  const [areaGuideOpen, setAreaGuideOpenState] = useState(false);

  const setAreaGuideOpen = useCallback((open: boolean) => {
    setAreaGuideOpenState(open);
  }, []);

  const value = useMemo(
    () => ({ areaGuideOpen, setAreaGuideOpen }),
    [areaGuideOpen, setAreaGuideOpen],
  );

  return (
    <AdminFloatingHelpersContext.Provider value={value}>
      {children}
    </AdminFloatingHelpersContext.Provider>
  );
}
