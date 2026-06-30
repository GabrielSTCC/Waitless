#!/usr/bin/env node
/**
 * Configura domínios Firebase Auth + CORS Storage para Google OAuth em produção.
 * Passos manuais no Google Cloud Console: veja README.md § Google OAuth.
 *
 * Usage: npm run setup:google-oauth
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const domains = ["www.waitless.solutions", "waitless.solutions"];
const appUrl = "https://www.waitless.solutions";

function runNodeScript(script, args = []) {
  const result = spawnSync(process.execPath, [join(__dirname, script), ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_APP_URL: appUrl },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("=== Waitless — setup Google OAuth (Firebase + Storage) ===\n");
console.log("Domínios alvo:", domains.join(", "));
console.log("URL pública:", appUrl);
console.log("\n--- Firebase Authorized domains ---");

for (const domain of domains) {
  runNodeScript("add-firebase-auth-domain.mjs", [domain]);
}

console.log("\n--- Storage CORS ---");
runNodeScript("setup-storage-cors.mjs");

console.log(`
=== Próximos passos manuais (Google Cloud Console) ===

1. OAuth consent screen → Branding:
   https://console.cloud.google.com/apis/credentials/consent?project=waitless-queue-saas

   Homepage:     ${appUrl}
   Privacy:      ${appUrl}/privacidade
   Terms:        ${appUrl}/termos
   Support:      ${appUrl}/contato
   Auth domain:  waitless.solutions

2. Target audience → External → Production

3. Credentials → Web client → JavaScript origins:
   - ${appUrl}
   - https://waitless.solutions
   - http://localhost:3000

4. Vercel → NEXT_PUBLIC_APP_URL=${appUrl}

5. IAM: billing account + segundo contato Owner/Editor
`);
