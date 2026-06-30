import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { GoogleAdsScripts } from "@/components/marketing/GoogleAdsScripts";
import { ServiceWorkerCleanup } from "@/components/providers/ServiceWorkerCleanup";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
  "https://www.waitless.solutions";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Waitless — Fila de Espera Inteligente",
  description: "Gerencie filas em tempo real com Mini-CRM integrado.",
  openGraph: {
    siteName: "Waitless",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${poppins.variable} h-full`}
      data-theme="light"
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
        <ThemeProvider>
          <LocaleProvider>
            <ServiceWorkerCleanup />
            <GoogleAdsScripts />
            {children}
            <CookieConsentBanner />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
