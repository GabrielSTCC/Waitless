#!/usr/bin/env node
/**
 * Adds a domain to Firebase Auth authorized domains list.
 * Usage: node scripts/add-firebase-auth-domain.mjs www.waitless.solutions
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const projectId = "waitless-queue-saas";
const domain = process.argv[2]?.trim();

if (!domain) {
  console.error("Uso: node scripts/add-firebase-auth-domain.mjs <dominio>");
  process.exit(1);
}

const firebaseConfig = join(homedir(), ".config", "configstore", "firebase-tools.json");
if (!existsSync(firebaseConfig)) {
  console.error("Firebase CLI não autenticado. Rode: npx firebase-tools@latest login");
  process.exit(1);
}

const { tokens } = JSON.parse(readFileSync(firebaseConfig, "utf8"));
const accessToken = tokens?.access_token;
if (!accessToken) {
  console.error("Token Firebase ausente. Rode: npx firebase-tools@latest login --reauth");
  process.exit(1);
}

const baseUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

const getRes = await fetch(baseUrl, { headers });
if (!getRes.ok) {
  console.error("Falha ao ler config:", getRes.status, await getRes.text());
  process.exit(1);
}

const current = await getRes.json();
const authorizedDomains = [...new Set([...(current.authorizedDomains ?? []), domain])];

if ((current.authorizedDomains ?? []).includes(domain)) {
  console.log(`Domínio já autorizado: ${domain}`);
  process.exit(0);
}

const patchRes = await fetch(`${baseUrl}?updateMask=authorizedDomains`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ authorizedDomains }),
});

if (!patchRes.ok) {
  console.error("Falha ao atualizar:", patchRes.status, await patchRes.text());
  process.exit(1);
}

console.log(`Domínio autorizado: ${domain}`);
