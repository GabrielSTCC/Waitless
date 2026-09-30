"use client";

import { LocaleAuthSync } from "@/components/providers/LocaleAuthSync";
import { AuthProvider } from "@/lib/context/AuthContext";

export default function PlatformRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <LocaleAuthSync />
      {children}
    </AuthProvider>
  );
}
