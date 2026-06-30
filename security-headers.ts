/**
 * Cabeçalhos HTTP de segurança (infraestrutura).
 *
 * CSP: defina CSP_REPORT_ONLY=false na Vercel após validar no console do browser.
 * Opcional: CSP_REPORT_URI para coletar violações.
 */

const GOOGLE = "https://www.google.com";
const GSTATIC = "https://www.gstatic.com";
const GOOGLE_APIS = "https://apis.google.com";
const GOOGLE_ACCOUNTS = "https://accounts.google.com";
const GTM = "https://www.googletagmanager.com";
const GOOGLE_ADS = "https://www.googleadservices.com";
const DOUBLECLICK = "https://googleads.g.doubleclick.net";
const RECAPTCHA = "https://www.recaptcha.net";
const RECAPTCHA_ALT = "https://recaptcha.net";
const FIREBASE_STORAGE = "https://firebasestorage.googleapis.com";
const FIREBASE_APIS = "https://*.googleapis.com";
const FIREBASE_IO = "https://*.firebaseio.com";
const FIREBASE_IO_WSS = "wss://*.firebaseio.com";

function buildContentSecurityPolicy(): string {
  const reportUri = process.env.CSP_REPORT_URI?.trim();

  const directives = [
    "default-src 'self'",
    [
      "script-src 'self' 'unsafe-inline'",
      GTM,
      GOOGLE,
      GSTATIC,
      GOOGLE_APIS,
      GOOGLE_ACCOUNTS,
      GOOGLE_ADS,
      DOUBLECLICK,
      RECAPTCHA,
      RECAPTCHA_ALT,
    ].join(" "),
    [
      "connect-src 'self'",
      FIREBASE_APIS,
      FIREBASE_IO,
      FIREBASE_IO_WSS,
      GOOGLE,
      GSTATIC,
      GTM,
      GOOGLE_ADS,
      DOUBLECLICK,
      RECAPTCHA,
      RECAPTCHA_ALT,
      "https://vitals.vercel-insights.com",
    ].join(" "),
    [
      "img-src 'self' data: blob:",
      FIREBASE_STORAGE,
      GOOGLE,
      GSTATIC,
      GTM,
      GOOGLE_ADS,
      DOUBLECLICK,
    ].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    [
      "frame-src 'self'",
      GOOGLE_ACCOUNTS,
      GOOGLE,
      RECAPTCHA,
      RECAPTCHA_ALT,
      "https://*.firebaseapp.com",
    ].join(" "),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "media-src 'self'",
    "upgrade-insecure-requests",
  ];

  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join("; ");
}

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "bluetooth=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
  "interest-cohort=()",
].join(", ");

const HSTS = "max-age=63072000; includeSubDomains; preload";

export function getHttpSecurityHeaders(): { key: string; value: string }[] {
  const csp = buildContentSecurityPolicy();
  const cspReportOnly = process.env.CSP_REPORT_ONLY !== "false";
  const cspHeaderKey = cspReportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "Strict-Transport-Security", value: HSTS },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Cross-Origin-Resource-Policy", value: "same-site" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: cspHeaderKey, value: csp },
  ];
}
