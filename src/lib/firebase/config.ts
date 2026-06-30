import {
  getApps,
  initializeApp,
  type FirebaseApp,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  disableNetwork,
  enableNetwork,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  initAppCheckIfBrowser,
  waitForAppCheckToken,
} from "@/lib/firebase/init-app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

let dbInstance: Firestore | null = null;
let dbPromise: Promise<Firestore> | null = null;

const NETWORK_RESET_DELAY_MS = 500;

function ensureClientApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("[Firebase] SDK client disponível apenas no browser.");
  }

  if (appInstance) return appInstance;

  if (getApps().length > 0) {
    appInstance = getApps()[0]!;
  } else {
    appInstance = initializeApp(firebaseConfig);
  }

  authInstance = getAuth(appInstance);
  return appInstance;
}

function ensureServerApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
  }
  return appInstance;
}

function getAuthInstance(): Auth {
  if (typeof window === "undefined") {
    return authInstance ?? getAuth(ensureServerApp());
  }
  return authInstance ?? getAuth(ensureClientApp());
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (prop === "then") return undefined;
    const instance = getAuthInstance();
    const value = instance[prop as keyof Auth];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    return ensureServerApp();
  }
  return ensureClientApp();
}

function getStorageInstance(): FirebaseStorage {
  const app = getFirebaseApp();
  if (!storageInstance) {
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    storageInstance = storageBucket
      ? getStorage(app, `gs://${storageBucket}`)
      : getStorage(app);
  }
  return storageInstance;
}

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    const instance = getStorageInstance();
    const value = instance[prop as keyof FirebaseStorage];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

async function prepareAuthBeforeFirestore(): Promise<void> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return;

  try {
    await user.getIdToken(false);
  } catch (error) {
    console.warn("[Firebase] Falha ao obter ID token antes do Firestore:", error);
  }
}

async function createDbInstance(): Promise<Firestore> {
  if (typeof window === "undefined") {
    dbInstance = getFirestore(ensureServerApp());
    return dbInstance;
  }

  const firebaseApp = ensureClientApp();
  initAppCheckIfBrowser(firebaseApp);

  await prepareAuthBeforeFirestore();

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    try {
      await waitForAppCheckToken(false);
    } catch (error) {
      console.warn("[Firebase] App Check indisponível antes do Firestore:", error);
    }
  }

  dbInstance = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  });
  return dbInstance;
}

export async function ensureDb(): Promise<Firestore> {
  if (dbInstance) return dbInstance;

  if (!dbPromise) {
    dbPromise = createDbInstance().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

export function invalidateDbCache(): void {
  dbInstance = null;
  dbPromise = null;
}

export function isDbReady(): boolean {
  return dbInstance !== null;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    throw new Error(
      "[Firebase] Firestore não inicializado. Chame ensureDb() antes de operações client.",
    );
  }
  return dbInstance;
}

/** Recovery leve: reset de rede + refresh de tokens (sem deleteApp / reinit App Check). */
export async function resetFirestoreClient(): Promise<Firestore> {
  if (typeof window === "undefined") {
    return ensureDb();
  }

  const db = await ensureDb();

  try {
    await disableNetwork(db);
  } catch {
    // Firestore pode já estar offline.
  }

  await new Promise((resolve) => setTimeout(resolve, NETWORK_RESET_DELAY_MS));

  try {
    await enableNetwork(db);
  } catch {
    // Firestore pode já estar online.
  }

  return db;
}
