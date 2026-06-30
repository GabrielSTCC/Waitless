#!/usr/bin/env node
/**
 * Sincroniza FIREBASE_SERVICE_ACCOUNT_JSON na Vercel (Production).
 * Usa stdin para evitar corrupção da private_key no shell (Windows).
 * Uso: node scripts/sync-vercel-service-account.mjs
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { cert } from "firebase-admin/app";

const keyPath = resolve("secrets/firebase-service-account.json");
const raw = readFileSync(keyPath, "utf8");
const parsed = JSON.parse(raw);
const minified = JSON.stringify(parsed);

cert(parsed);
console.log(`JSON válido (${minified.length} chars, project: ${parsed.project_id})`);

// Simula o parse que o servidor faz após ler da env var
const roundtrip = JSON.parse(minified);
const normalizedKey = roundtrip.private_key.includes("\n")
  ? roundtrip.private_key
  : roundtrip.private_key.replace(/\\n/g, "\n");
cert({ ...roundtrip, private_key: normalizedKey });
console.log("OK: roundtrip minificado + normalização PEM");

const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (publicProjectId && publicProjectId !== parsed.project_id) {
  console.warn(
    `WARN: NEXT_PUBLIC_FIREBASE_PROJECT_ID="${publicProjectId}" difere da service account="${parsed.project_id}".`,
  );
}

const result = spawnSync(
  "npx",
  [
    "vercel",
    "env",
    "add",
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    "production",
    "--yes",
    "--sensitive",
    "--force",
  ],
  {
    input: minified,
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  console.error("Falha ao atualizar variável na Vercel.");
  process.exit(result.status ?? 1);
}

console.log("Variável atualizada em Production. Rode: npx vercel --prod --yes");
