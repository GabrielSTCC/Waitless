"use client";

import { LocaleAuthSync } from "@/components/providers/LocaleAuthSync";
import { ProtectionAdvisory } from "@/components/admin/ProtectionAdvisory";
import { AuthProvider } from "@/lib/context/AuthContext";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleAuthSync />
      <ProtectionAdvisory />
      {children}
    </AuthProvider>
  );
}
