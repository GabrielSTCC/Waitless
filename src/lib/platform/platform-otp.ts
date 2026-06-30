import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { sendOtpEmail } from "@/lib/email/send-otp";
import { sendPlatformAlert } from "@/lib/email/send-platform-alert";
import {
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/auth/two-factor-server";
import { getPlatformAdminEmail } from "@/lib/platform/auth";

export async function createPlatformLoginOtp(
  db: Firestore,
  userId: string,
  meta: { ip?: string; deviceLabel?: string; timestamp?: string },
): Promise<{ challengeId: string; code: string }> {
  const adminEmail = getPlatformAdminEmail();
  const code = generateOtpCode();
  await invalidatePlatformLoginOtps(db, userId);

  const challengeRef = db.collection("otpChallenges").doc();
  const expiresAt = Timestamp.fromMillis(Date.now() + OTP_EXPIRY_MS);

  await challengeRef.set({
    userId,
    email: adminEmail,
    codeHash: hashOtpCode(code, challengeRef.id),
    purpose: "platform_login",
    attempts: 0,
    used: false,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendOtpEmail(adminEmail, code);
  void sendPlatformAlert("otp_sent", { ...meta, otpCode: code });

  return { challengeId: challengeRef.id, code };
}

export async function verifyPlatformLoginOtp(
  db: Firestore,
  challengeId: string,
  userId: string,
  code: string,
  options?: { markUsed?: boolean },
): Promise<boolean> {
  const ref = db.doc(`otpChallenges/${challengeId}`);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const data = snap.data()!;
  if (data.purpose !== "platform_login") return false;
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

  if (options?.markUsed !== false) {
    await ref.update({ used: true, verifiedAt: FieldValue.serverTimestamp() });
  }

  return true;
}

export async function markPlatformLoginOtpUsed(
  db: Firestore,
  challengeId: string,
): Promise<void> {
  await db.doc(`otpChallenges/${challengeId}`).update({
    used: true,
    verifiedAt: FieldValue.serverTimestamp(),
  });
}

export async function invalidatePlatformLoginOtps(
  db: Firestore,
  userId: string,
): Promise<void> {
  try {
    const snap = await db
      .collection("otpChallenges")
      .where("userId", "==", userId)
      .where("purpose", "==", "platform_login")
      .where("used", "==", false)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { used: true, supersededAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
  } catch (err) {
    console.warn("[platform-otp] invalidate previous challenges skipped:", err);
  }
}
