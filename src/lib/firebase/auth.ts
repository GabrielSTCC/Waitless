import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User,
  type UserCredential,
} from "firebase/auth";
import { acceptInvite } from "@/lib/firebase/firestore";
import type { BillingCountry } from "@/lib/billing/resolve-market";
import {
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { createEstablishmentViaApi, type OnboardingResult } from "@/lib/auth/onboarding-client";
import { fetchSessionViaApi } from "@/lib/auth/session-client";
import { awaitAppCheckReady } from "@/lib/firebase/app-check";
import { auth, ensureDb } from "@/lib/firebase/config";
import { mapMember } from "@/lib/firebase/mappers";
import {
  getCompanyErrorMessage,
} from "@/lib/utils/company-slug";
import { clearSessionLocale } from "@/lib/i18n/locale-storage";
import {
  assertPasswordValid,
  isPasswordValidationError,
  MIN_PASSWORD_LENGTH,
  type PasswordRuleKey,
} from "@/lib/auth/password-policy";
import type { Member } from "@/lib/types";

const googleProvider = new GoogleAuthProvider();

async function registerWithEmailAndSignIn(email: string, password: string): Promise<UserCredential> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    customToken?: string;
    error?: string;
  };
  if (!res.ok || !body.customToken) {
    const err = new Error(body.error ?? "Erro ao criar conta.");
    (err as Error & { code?: string }).code =
      res.status === 409 ? "auth/email-already-in-use" : undefined;
    throw err;
  }
  await awaitAppCheckReady();
  return signInWithCustomToken(auth, body.customToken);
}

async function finalizeGoogleSignIn(credential: UserCredential): Promise<UserCredential> {
  const googleCredential = GoogleAuthProvider.credentialFromResult(credential);
  const idToken = await credential.user.getIdToken();
  const provisionalUid = credential.user.uid;
  const res = await fetch("/api/auth/register-google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, provisionalUid }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    customToken?: string;
    uid?: string;
    error?: string;
  };
  if (!res.ok || !body.customToken) {
    throw new Error(body.error ?? "Erro ao finalizar cadastro com Google.");
  }

  await awaitAppCheckReady();

  let session =
    body.uid === provisionalUid
      ? credential
      : await signInWithCustomToken(auth, body.customToken);

  if (
    googleCredential &&
    !session.user.providerData.some((provider) => provider.providerId === "google.com")
  ) {
    try {
      session = await linkWithCredential(session.user, googleCredential);
    } catch {
      // Provedor já vinculado ou credencial expirada
    }
  }

  return session;
}

export { MIN_PASSWORD_LENGTH };

export function userHasPasswordProvider(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === "password");
}

export function getLoginProviderIds(user: User): string[] {
  return user.providerData.map((provider) => provider.providerId);
}

export async function changeUserPassword(
  user: User,
  currentPassword: string,
  newPassword: string,
) {
  if (!user.email) {
    throw new Error("Sua conta não possui e-mail vinculado.");
  }

  assertPasswordValid(newPassword);

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function linkPasswordToUser(user: User, newPassword: string) {
  if (!user.email) {
    throw new Error("Sua conta não possui e-mail vinculado.");
  }

  assertPasswordValid(newPassword);

  const credential = EmailAuthProvider.credential(user.email, newPassword);
  await linkWithCredential(user, credential);
}

export async function login(email: string, password: string) {
  await awaitAppCheckReady();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  clearSessionLocale();
  await signOut(auth);
  if (typeof window !== "undefined") {
    window.location.assign("/admin/auth");
  }
}

export async function createEstablishmentForUser(
  userId: string,
  _email: string,
  companyName: string,
  billingCountry: BillingCountry = "BR",
): Promise<OnboardingResult> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }

  return createEstablishmentViaApi(companyName, billingCountry);
}

export async function signupEstablishment(
  email: string,
  password: string,
  companyName: string,
  billingCountry: BillingCountry = "BR",
) {
  assertPasswordValid(password);
  const credential = await registerWithEmailAndSignIn(email, password);
  const result = await createEstablishmentForUser(
    credential.user.uid,
    email,
    companyName,
    billingCountry,
  );

  return { user: credential.user, ...result };
}

export async function signupWithInvite(
  email: string,
  password: string,
  inviteId: string,
) {
  assertPasswordValid(password);
  const credential = await registerWithEmailAndSignIn(email, password);
  await acceptInvite(inviteId, credential.user.uid, email);
  return { user: credential.user };
}

export async function loginAndAcceptInvite(
  email: string,
  password: string,
  inviteId: string,
) {
  await awaitAppCheckReady();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const existing = await fetchMember(credential.user.uid);
  if (existing) {
    throw new Error("Esta conta já pertence a um estabelecimento.");
  }
  await acceptInvite(inviteId, credential.user.uid, email);
  return { user: credential.user };
}

export async function loginWithGoogleAndAcceptInvite(inviteId: string) {
  const credential = await finalizeGoogleSignIn(await signInWithGoogle());
  const email = credential.user.email ?? "";
  const existing = await fetchMember(credential.user.uid);
  if (existing) {
    return { user: credential.user, member: existing, alreadyRegistered: true };
  }
  await acceptInvite(inviteId, credential.user.uid, email);
  return { user: credential.user, member: null, alreadyRegistered: false };
}

export async function signupGoogleWithInvite(inviteId: string) {
  const credential = await finalizeGoogleSignIn(await signInWithGoogle());
  const email = credential.user.email ?? "";
  const existing = await fetchMember(credential.user.uid);
  if (existing) {
    return { user: credential.user, alreadyRegistered: true };
  }
  await acceptInvite(inviteId, credential.user.uid, email);
  return { user: credential.user, alreadyRegistered: false };
}

export async function signInWithGoogle(): Promise<UserCredential> {
  await awaitAppCheckReady();
  googleProvider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, googleProvider);
}

export async function registerGoogleAccount(): Promise<UserCredential> {
  return finalizeGoogleSignIn(await signInWithGoogle());
}

export async function loginWithGoogle() {
  const credential = await signInWithGoogle();
  const session = await fetchSessionViaApi();
  return {
    user: credential.user,
    member: session.member,
    isNewMember: !session.member,
  };
}

export async function signupWithGoogle(
  companyName: string,
  billingCountry: BillingCountry = "BR",
) {
  const credential = await finalizeGoogleSignIn(await signInWithGoogle());
  const user = credential.user;
  const email = user.email ?? "";

  const result = await createEstablishmentForUser(
    user.uid,
    email,
    companyName.trim(),
    billingCountry,
  );

  return { user, ...result };
}

export async function completeGoogleOnboarding(
  userId: string,
  _email: string,
  companyName: string,
  billingCountry: BillingCountry = "BR",
): Promise<OnboardingResult> {
  return createEstablishmentForUser(
    userId,
    _email,
    companyName.trim(),
    billingCountry,
  );
}

export async function fetchMember(userId: string): Promise<Member | null> {
  try {
    const session = await fetchSessionViaApi();
    if (session.member?.companyId) {
      return session.member;
    }
  } catch {
    // Fallback para Firestore quando a API não estiver disponível.
  }

  await awaitAppCheckReady();
  const snap = await getDoc(doc(await ensureDb(), "members", userId));
  if (!snap.exists()) return null;
  return mapMember(snap);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getAuthErrorMessage(error: unknown): string {
  const companyMessage = getCompanyErrorMessage(error);
  if (companyMessage) return companyMessage;

  const code = (error as { code?: string })?.code;
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Login cancelado.";
    case "auth/popup-blocked":
      return "Popup bloqueado. Permita popups para este site.";
    case "auth/account-exists-with-different-credential":
      return "Este e-mail já está cadastrado com outro método de login.";
    case "auth/email-already-in-use":
      return "Este e-mail já está em uso.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha inválidos.";
    case "auth/weak-password":
      return getPasswordPolicyErrorMessage();
    case "auth/requires-recent-login":
      return "Por segurança, saia e entre novamente antes de alterar a senha.";
    case "auth/provider-already-linked":
      return "Esta conta já possui senha cadastrada.";
    case "auth/credential-already-in-use":
      return "Este e-mail já está vinculado a outra conta.";
    case "permission-denied":
      return "Permissão negada ao acessar dados. Desative bloqueadores de anúncios para este site e recarregue a página.";
    default:
      if (error instanceof Error) {
        const msg = error.message;
        if (
          msg.includes("Missing or insufficient permissions") ||
          msg.includes("permission-denied")
        ) {
          return "Permissão negada ao acessar dados. Desative bloqueadores de anúncios para este site e recarregue a página.";
        }
        if (msg) return msg;
      }
      if (isPasswordValidationError(error)) {
        return getPasswordPolicyErrorMessage(error.errors);
      }
      return "Não foi possível autenticar. Tente novamente.";
  }
}

function getPasswordPolicyErrorMessage(errors?: PasswordRuleKey[]): string {
  if (!errors || errors.length === 0) {
    return "A senha não atende aos requisitos de segurança.";
  }
  return "A senha não atende aos requisitos de segurança.";
}

export { Timestamp };
