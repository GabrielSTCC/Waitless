#!/usr/bin/env node
/**
 * Seed idempotente: Barbearia Atlas (demo GTM Instagram/TikTok).
 *
 * Uso:
 *   DEMO_ATLAS_EMAIL=... DEMO_ATLAS_PASSWORD=... node scripts/seed-demo-atlas.mjs
 *
 * Requer FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON.
 * Não commite credenciais.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const COMPANY_NAME = "Barbearia Atlas";
const AVG_SERVICE_MIN = 28;

const SEED_CLIENTS = [
  { id: "atlas-ana", name: "Ana Demo", whatsapp: "11988880001", queue: "waiting" },
  { id: "atlas-bruno", name: "Bruno Teste", whatsapp: "11988880002", queue: "waiting" },
  { id: "atlas-carla", name: "Carla Demo", whatsapp: "11988880003", queue: "waiting" },
  { id: "atlas-diego", name: "Diego Fake", whatsapp: "11988880004", queue: "waiting" },
  { id: "atlas-elena", name: "Elena Demo", whatsapp: "11988880005", queue: "waiting" },
  { id: "atlas-felipe", name: "Felipe Teste", whatsapp: "11988880006", queue: "in_service" },
  { id: "atlas-gabi", name: "Gabi Demo", whatsapp: "11988880007", queue: "in_service" },
  { id: "atlas-hugo", name: "Hugo Fake", whatsapp: "11988880008", queue: "completed" },
  { id: "atlas-iris", name: "Iris Demo", whatsapp: "11988880009", queue: "completed" },
];

function requireDemoCredentials() {
  const email = process.env.DEMO_ATLAS_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_ATLAS_PASSWORD?.trim();
  if (!email || !password) {
    console.error(
      "Defina DEMO_ATLAS_EMAIL e DEMO_ATLAS_PASSWORD antes de rodar o seed.",
    );
    process.exit(1);
  }
  return { email, password };
}

function userUidFromEmail(email) {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");
  const localPart = atIndex >= 0 ? normalized.slice(0, atIndex) : normalized;
  const domainPart = atIndex >= 0 ? normalized.slice(atIndex + 1) : "unknown";
  const sanitize = (value) =>
    value.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");
  const safeLocal = sanitize(localPart) || "user";
  const safeDomain = sanitize(domainPart) || "unknown";
  return `${safeLocal}_at_${safeDomain}`.slice(0, 128);
}

function slugFromCompanyName(name) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeWhatsapp(value) {
  return value.replace(/\D/g, "");
}

function normalizeName(value) {
  return value.trim().toLowerCase();
}

function estimateWaitMin(position, avgServiceTimeMin) {
  return Math.max(0, (position - 1) * avgServiceTimeMin);
}

function loadServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return JSON.parse(json.trim());
  }
  const pathEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "secrets/firebase-service-account.json";
  const absolute = resolve(root, pathEnv);
  if (!existsSync(absolute)) {
    console.error(
      "Conta de serviço não encontrada. Rode npm run setup:service-account.",
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function deleteCollection(db, collectionPath, batchSize = 200) {
  const collRef = db.collection(collectionPath);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await collRef.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < batchSize) break;
  }
}

async function deletePublicQueueByCompany(db, companyId) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db
      .collection("publicQueue")
      .where("companyId", "==", companyId)
      .limit(200)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < 200) break;
  }
}

async function main() {
  loadEnvLocal();
  const { email: DEMO_EMAIL, password: DEMO_PASSWORD } = requireDemoCredentials();
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const { getFirestore, FieldValue, Timestamp } = await import("firebase-admin/firestore");

  if (getApps().length === 0) {
    const serviceAccount = loadServiceAccount();
    initializeApp({
      credential: cert(serviceAccount),
      projectId:
        serviceAccount.project_id ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
        "waitless-queue-saas",
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const uid = userUidFromEmail(DEMO_EMAIL);
  const companyId = slugFromCompanyName(COMPANY_NAME);
  const normalizedEmail = DEMO_EMAIL.trim().toLowerCase();

  console.log("Waitless — seed Barbearia Atlas (GTM media)\n");

  let user;
  try {
    user = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(user.uid, {
      password: DEMO_PASSWORD,
      emailVerified: true,
    });
    console.log(`Usuário atualizado: ${normalizedEmail} (${user.uid})`);
  } catch (error) {
    const code = error?.code ?? error?.errorInfo?.code;
    if (code !== "auth/user-not-found") throw error;
    user = await auth.createUser({
      uid,
      email: normalizedEmail,
      password: DEMO_PASSWORD,
      emailVerified: true,
    });
    console.log(`Usuário criado: ${normalizedEmail} (${user.uid})`);
  }

  const memberRef = db.doc(`members/${user.uid}`);
  const companyRef = db.doc(`companies/${companyId}`);

  const brand = {
    accentColor: "#1B4D3E",
    tagline: "Corte e barba · sem fila no escuro",
    logoUrl: "",
  };

  await companyRef.set(
    {
      name: COMPANY_NAME,
      ownerId: user.uid,
      avgServiceTimeMin: AVG_SERVICE_MIN,
      toleranceEnabled: false,
      toleranceMin: 5,
      billingCountry: "BR",
      billingMarket: "BR",
      defaultLocale: "pt-BR",
      contactWhatsapp: "11977770000",
      brand,
      subscription: { status: "active", planId: "pro" },
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`Company: ${companyId} (plano pro ativo)`);

  await memberRef.set(
    {
      companyId,
      email: normalizedEmail,
      role: "owner",
      security: {
        twoFactorEnabled: false,
        twoFactorPending: false,
        requireTwoFactorOnNextLogin: false,
      },
    },
    { merge: true },
  );
  console.log(`Member owner: ${user.uid}`);

  console.log("Limpando fila...");
  await deleteCollection(db, `companies/${companyId}/queue`);
  await deleteCollection(db, `companies/${companyId}/activeWaiting`);
  await deletePublicQueueByCompany(db, companyId);

  const now = Timestamp.now();
  let lastPosition = 0;
  let lastTicket = 0;
  const publicTokens = [];

  for (const client of SEED_CLIENTS) {
    const clientRef = db.doc(`companies/${companyId}/clients/${client.id}`);
    await clientRef.set(
      {
        name: client.name,
        whatsapp: client.whatsapp,
        normalizedWhatsapp: normalizeWhatsapp(client.whatsapp),
        normalizedName: normalizeName(client.name),
        visitCount: client.queue === "completed" ? 2 : 1,
        createdAt: now,
        lastVisitAt: now,
      },
      { merge: true },
    );

    if (client.queue === "completed") {
      const entryId = randomUUID();
      await db.doc(`companies/${companyId}/queue/${entryId}`).set({
        clientId: client.id,
        clientName: client.name,
        clientWhatsapp: client.whatsapp,
        status: "completed",
        position: 0,
        ticketNumber: ++lastTicket,
        estimatedWaitMin: 0,
        publicToken: randomUUID(),
        createdAt: now,
        startedAt: now,
        completedAt: now,
      });
      console.log(`Cliente CRM + completed: ${client.name}`);
      continue;
    }

    lastTicket += 1;
    const entryId = randomUUID();
    const publicToken = randomUUID();
    const waitingPos =
      client.queue === "waiting"
        ? SEED_CLIENTS.filter((c) => c.queue === "waiting").findIndex(
            (c) => c.id === client.id,
          ) + 1
        : 0;
    if (client.queue === "waiting") lastPosition = waitingPos;

    await db.doc(`companies/${companyId}/queue/${entryId}`).set({
      clientId: client.id,
      clientName: client.name,
      clientWhatsapp: client.whatsapp,
      status: client.queue,
      position: waitingPos,
      ticketNumber: lastTicket,
      estimatedWaitMin:
        client.queue === "waiting"
          ? estimateWaitMin(waitingPos, AVG_SERVICE_MIN)
          : 0,
      publicToken,
      createdAt: now,
      ...(client.queue === "in_service" ? { startedAt: now } : {}),
    });

    if (client.queue === "waiting") {
      await db.doc(`companies/${companyId}/activeWaiting/${client.id}`).set({
        entryId,
        createdAt: now,
      });
    }

    await db.doc(`publicQueue/${publicToken}`).set({
      companyId,
      entryId,
      status: client.queue,
      position: waitingPos,
      companyName: COMPANY_NAME,
      companyTagline: brand.tagline,
      brandAccent: brand.accentColor,
      brandLogoUrl: brand.logoUrl,
      avgServiceTimeMin: AVG_SERVICE_MIN,
      toleranceEnabled: false,
      toleranceMin: 5,
      locale: "pt-BR",
      companyContactWhatsapp: "11977770000",
      estimatedWaitMin:
        client.queue === "waiting"
          ? estimateWaitMin(waitingPos, AVG_SERVICE_MIN)
          : 0,
      clientName: client.name,
      clientId: client.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    publicTokens.push({
      name: client.name,
      status: client.queue,
      token: publicToken,
      url: `http://localhost:3000/q/${publicToken}`,
    });
    console.log(`Fila ${client.queue}: ${client.name} → /q/${publicToken.slice(0, 8)}…`);
  }

  const waitingCount = SEED_CLIENTS.filter((c) => c.queue === "waiting").length;
  await db.doc(`companies/${companyId}/meta/queue`).set(
    { lastPosition: waitingCount, lastTicket },
    { merge: true },
  );

  const mediaDir = join(root, "docs/gtm/media");
  mkdirSync(mediaDir, { recursive: true });
  const credPath = join(mediaDir, ".demo-credentials.local");
  writeFileSync(
    credPath,
    [
      `# NÃO COMMITAR — credenciais demo Barbearia Atlas`,
      `email=${normalizedEmail}`,
      `password=${DEMO_PASSWORD}`,
      `companyId=${companyId}`,
      `login=http://localhost:3000/admin/auth`,
      ``,
      `# Links /q (cliente)`,
      ...publicTokens.map(
        (t) => `${t.status}\t${t.name}\t${t.url}`,
      ),
      ``,
    ].join("\n"),
    { mode: 0o600 },
  );

  const tokensPath = join(mediaDir, "demo-queue-links.txt");
  writeFileSync(
    tokensPath,
    publicTokens.map((t) => `${t.status}\t${t.name}\t${t.url}`).join("\n") + "\n",
  );

  console.log("\n--- Seed Barbearia Atlas concluído ---");
  console.log(`Company: ${companyId}`);
  console.log(`Login: http://localhost:3000/admin/auth`);
  console.log(`Credenciais: ${credPath}`);
  console.log(`Links /q: ${tokensPath}`);
  console.log("------------------------------\n");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
