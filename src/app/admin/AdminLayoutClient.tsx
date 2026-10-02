"use client";

import { AdminFloatingHelpers } from "@/components/admin/AdminFloatingHelpers";
import { LocaleAuthSync } from "@/components/providers/LocaleAuthSync";
import { AuthProvider } from "@/lib/context/AuthContext";

export function AdminLayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <LocaleAuthSync />
      <AdminFloatingHelpers />
      {children}
    </AuthProvider>
  );
}
