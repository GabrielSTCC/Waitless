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
  connectFirestoreEmulator,
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
let firestoreEmulatorConnected = false;

const NETWORK_RESET_DELAY_MS = 500;
/** Auth e App Check não podem segurar a tela pública da fila para sempre. */
const FIREBASE_BOOT_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("[Firebase] Tempo esgotado ao preparar a conexão."));
    }, ms);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function ensureClientApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new TypeError("[Firebase] SDK client disponível apenas no browser.");
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
      const tokenWait = waitForAppCheckToken(false);
      if (auth.currentUser) {
        await tokenWait;
      } else {
        await withTimeout(tokenWait, FIREBASE_BOOT_TIMEOUT_MS);
      }
    } catch (error) {
      console.warn("[Firebase] App Check indisponível antes do Firestore:", error);
    }
  }

  dbInstance = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  });

  // Opt-in: NEXT_PUBLIC_FIRESTORE_EMULATOR=1 em localhost aponta ao emulador :8080
  if (
    typeof window !== "undefined" &&
    !firestoreEmulatorConnected &&
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR === "1" &&
    (window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost")
  ) {
    try {
      connectFirestoreEmulator(dbInstance, "127.0.0.1", 8080);
      firestoreEmulatorConnected = true;
    } catch {
      firestoreEmulatorConnected = true;
    }
  }

  return dbInstance;
}

export async function ensureDb(): Promise<Firestore> {
  if (dbInstance) return dbInstance;

  dbPromise ??= createDbInstance().catch((error) => {
    dbPromise = null;
    throw error;
  });

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
