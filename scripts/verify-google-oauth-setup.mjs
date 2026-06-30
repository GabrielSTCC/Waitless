#!/usr/bin/env node
/**
 * Validates Google OAuth / Firebase Auth setup for production.
 * Usage: npm run verify:google-oauth
 */

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
  "https://www.waitless.solutions";
const projectId = "waitless-queue-saas";
const requiredDomains = ["www.waitless.solutions", "waitless.solutions"];
const publicPaths = ["/", "/privacidade", "/termos", "/contato", "/admin/auth"];

async function checkUrl(path) {
  const url = `${appUrl}${path}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    return { path, url, ok: res.ok, status: res.status };
  } catch (error) {
    return { path, url, ok: false, status: 0, error: String(error) };
  }
}

async function checkAuthorizedDomains(accessToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Goog-User-Project": projectId,
      },
    },
  );
  if (!res.ok) {
    return { ok: false, error: `${res.status} ${await res.text()}` };
  }
  const data = await res.json();
  const domains = data.authorizedDomains ?? [];
  const missing = requiredDomains.filter((d) => !domains.includes(d));
  return { ok: missing.length === 0, domains, missing };
}

function printManualChecklist() {
  console.log(`
Checklist manual (Google Cloud Console):
- Branding: https://console.cloud.google.com/apis/credentials/consent?project=${projectId}
  Homepage:     ${appUrl}
  Privacy:      ${appUrl}/privacidade
  Terms:        ${appUrl}/termos
  Support:      ${appUrl}/contato
  Auth domain:  waitless.solutions
- Target audience: External → Production
- Credentials → Web client → JavaScript origins:
  ${appUrl}, https://waitless.solutions, http://localhost:3000
- IAM: billing account + segundo contato Owner/Editor
- Search Console: verificar waitless.solutions (se solicitado)
`);
}

async function main() {
  console.log("=== Verificação Google OAuth — Waitless ===\n");
  console.log("URL base:", appUrl);

  console.log("\n--- Páginas públicas ---");
  const urlResults = await Promise.all(publicPaths.map(checkUrl));
  for (const r of urlResults) {
    console.log(`${r.ok ? "OK" : "FAIL"} ${r.status} ${r.url}`);
  }

  let accessToken = process.env.GCLOUD_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    try {
      const { execSync } = await import("node:child_process");
      accessToken = execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
    } catch {
      console.warn("\nAviso: gcloud não autenticado — pulando verificação de domínios Firebase.");
    }
  }

  if (accessToken) {
    console.log("\n--- Firebase Authorized domains ---");
    const domainCheck = await checkAuthorizedDomains(accessToken);
    if (domainCheck.ok) {
      console.log("OK:", domainCheck.domains.filter((d) => requiredDomains.includes(d)).join(", "));
    } else if (domainCheck.missing) {
      console.log("FAIL — faltam:", domainCheck.missing.join(", "));
      console.log("Atual:", domainCheck.domains?.join(", "));
    } else {
      console.log("FAIL:", domainCheck.error);
    }
  }

  printManualChecklist();

  const failedUrls = urlResults.filter((r) => !r.ok).length;
  process.exit(failedUrls > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
