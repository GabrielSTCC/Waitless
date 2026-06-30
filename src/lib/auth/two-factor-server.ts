import { createHash, randomInt } from "crypto";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { MemberSecurity } from "@/lib/types";
import { sendOtpEmail } from "@/lib/email/send-otp";
import {
  clearTwoFactorPendingFields,
  setRequireTwoFactorOnNextLogin,
  setTwoFactorPendingField,
} from "@/lib/auth/member-security-admin";

export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const TRUSTED_DEVICE_DAYS = 90;
export const FAILED_LOGIN_THRESHOLD = 2;

export interface DeviceContext {
  deviceId: string;
  userAgent: string;
}

export function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function hashDeviceFingerprint(
  userId: string,
  device: DeviceContext,
): string {
  return createHash("sha256")
    .update(`${userId}:${device.deviceId}:${device.userAgent}`)
    .digest("hex");
}

export function hashOtpCode(code: string, challengeId: string): string {
  return createHash("sha256")
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export function parseDeviceContext(
  deviceId: string | null,
  userAgent: string | null,
): DeviceContext | null {
  if (!deviceId?.trim()) return null;
  return {
    deviceId: deviceId.trim(),
    userAgent: userAgent?.trim() || "unknown",
  };
}

export function parseMemberSecurity(
  data: Record<string, unknown> | undefined,
): MemberSecurity {
  if (!data) return {};
  return {
    twoFactorEnabled: data.twoFactorEnabled === true,
    twoFactorMethod: data.twoFactorMethod === "email" ? "email" : undefined,
    twoFactorPending: data.twoFactorPending === true,
    requireTwoFactorOnNextLogin: data.requireTwoFactorOnNextLogin === true,
    lastTwoFactorVerifiedAt:
      data.lastTwoFactorVerifiedAt instanceof Timestamp
        ? data.lastTwoFactorVerifiedAt.toDate()
        : undefined,
  };
}

export async function isDeviceTrusted(
  db: Firestore,
  userId: string,
  device: DeviceContext,
): Promise<boolean> {
  const fingerprintHash = hashDeviceFingerprint(userId, device);
  const now = Timestamp.now();
  const snap = await db
    .collection(`members/${userId}/trustedDevices`)
    .where("fingerprintHash", "==", fingerprintHash)
    .where("expiresAt", ">", now)
    .limit(1)
    .get();

  if (snap.empty) return false;

  await snap.docs[0].ref.update({ lastUsedAt: FieldValue.serverTimestamp() });
  return true;
}

export async function evaluateTwoFactorRequired(
  db: Firestore,
  userId: string,
  security: MemberSecurity,
  device: DeviceContext | null,
): Promise<{ required: boolean; reason?: "new_device" | "failed_attempts" }> {
  if (!security.twoFactorEnabled) {
    return { required: false };
  }

  if (security.requireTwoFactorOnNextLogin) {
    return { required: true, reason: "failed_attempts" };
  }

  if (!device) {
    return { required: true, reason: "new_device" };
  }

  const trusted = await isDeviceTrusted(db, userId, device);
  if (!trusted) {
    return { required: true, reason: "new_device" };
  }

  return { required: false };
}

export function buildDeviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  let browser = "Navegador";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";

  let os = "Desconhecido";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  return `${browser} — ${os}`;
}

export async function createOtpChallenge(
  db: Firestore,
  userId: string,
  email: string,
  purpose: "login" | "enable",
): Promise<{ challengeId: string; code: string }> {
  const code = generateOtpCode();
  const challengeRef = db.collection("otpChallenges").doc();
  const expiresAt = Timestamp.fromMillis(Date.now() + OTP_EXPIRY_MS);

  await challengeRef.set({
    userId,
    email: email.trim().toLowerCase(),
    codeHash: hashOtpCode(code, challengeRef.id),
    purpose,
    attempts: 0,
    used: false,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendOtpEmail(email, code);
  return { challengeId: challengeRef.id, code };
}

export async function verifyOtpChallengeForPurpose(
  db: Firestore,
  challengeId: string,
  userId: string,
  code: string,
  purpose: "login" | "enable",
): Promise<boolean> {
  const ref = db.doc(`otpChallenges/${challengeId}`);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const data = snap.data()!;
  if (data.purpose !== purpose) return false;
  if (data.userId !== userId || data.used === true) return false;

  const expiresAt = data.expiresAt as Timestamp;
  if (expiresAt.toMillis() < Date.now()) return false;

  const attempts = (data.attempts as number | undefined) ?? 0;
  if (attempts >= OTP_MAX_ATTEMPTS) return false;

  const expectedHash = data.codeHash as string;
  const providedHash = hashOtpCode(code, challengeId);

  if (providedHash !== expectedHash) {
    await ref.update({ attempts: attempts + 1 });
    return false;
  }

  await ref.update({ used: true, verifiedAt: FieldValue.serverTimestamp() });
  return true;
}

export async function verifyOtpChallenge(
  db: Firestore,
  challengeId: string,
  userId: string,
  code: string,
): Promise<boolean> {
  const ref = db.doc(`otpChallenges/${challengeId}`);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const data = snap.data()!;
  if (data.userId !== userId || data.used === true) return false;

  const expiresAt = data.expiresAt as Timestamp;
  if (expiresAt.toMillis() < Date.now()) return false;

  const attempts = (data.attempts as number | undefined) ?? 0;
  if (attempts >= OTP_MAX_ATTEMPTS) return false;

  const expectedHash = data.codeHash as string;
  const providedHash = hashOtpCode(code, challengeId);

  if (providedHash !== expectedHash) {
    await ref.update({ attempts: attempts + 1 });
    return false;
  }

  await ref.update({ used: true, verifiedAt: FieldValue.serverTimestamp() });
  return true;
}

export async function registerTrustedDevice(
  db: Firestore,
  userId: string,
  device: DeviceContext,
): Promise<void> {
  const fingerprintHash = hashDeviceFingerprint(userId, device);
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(
    now + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
  );

  const existing = await db
    .collection(`members/${userId}/trustedDevices`)
    .where("fingerprintHash", "==", fingerprintHash)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.update({
      lastUsedAt: FieldValue.serverTimestamp(),
      expiresAt,
      label: buildDeviceLabel(device.userAgent),
    });
    return;
  }

  await db.collection(`members/${userId}/trustedDevices`).add({
    label: buildDeviceLabel(device.userAgent),
    fingerprintHash,
    userAgent: device.userAgent,
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: FieldValue.serverTimestamp(),
    expiresAt,
  });
}

export async function clearTwoFactorPending(
  db: Firestore,
  userId: string,
): Promise<void> {
  await clearTwoFactorPendingFields(db, userId);
}

export async function setTwoFactorPending(
  db: Firestore,
  userId: string,
  pending: boolean,
): Promise<void> {
  await setTwoFactorPendingField(db, userId, pending);
}

export async function recordFailedLogin(
  db: Firestore,
  email: string,
): Promise<void> {
  const emailHash = hashEmail(email);
  const ref = db.doc(`authSecurity/${emailHash}`);
  const snap = await ref.get();
  const current = (snap.data()?.failedAttempts as number | undefined) ?? 0;
  const nextAttempts = current + 1;

  await ref.set(
    {
      failedAttempts: nextAttempts,
      lastFailedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (nextAttempts < FAILED_LOGIN_THRESHOLD) return;

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const user = await getAuth().getUserByEmail(email.trim().toLowerCase());
    const memberSnap = await db.doc(`members/${user.uid}`).get();
    const security = parseMemberSecurity(
      memberSnap.data()?.security as Record<string, unknown> | undefined,
    );

    if (!security.twoFactorEnabled) return;

    await setRequireTwoFactorOnNextLogin(db, user.uid);
  } catch {
    // Usuário inexistente — não expor informação
  }
}

export async function resetFailedLogins(
  db: Firestore,
  email: string,
): Promise<void> {
  const emailHash = hashEmail(email);
  await db.doc(`authSecurity/${emailHash}`).set(
    { failedAttempts: 0, lastFailedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function revokeAllTrustedDevices(
  db: Firestore,
  userId: string,
): Promise<void> {
  const snap = await db.collection(`members/${userId}/trustedDevices`).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
