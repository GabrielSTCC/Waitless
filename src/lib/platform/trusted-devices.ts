import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  buildDeviceLabel,
  hashDeviceFingerprint,
  TRUSTED_DEVICE_DAYS,
  type DeviceContext,
} from "@/lib/auth/two-factor-server";

export async function isPlatformDeviceTrusted(
  db: Firestore,
  userId: string,
  device: DeviceContext,
): Promise<boolean> {
  const fingerprintHash = hashDeviceFingerprint(userId, device);
  const now = Timestamp.now();
  const snap = await db
    .collection(`platformAdmins/${userId}/trustedDevices`)
    .where("fingerprintHash", "==", fingerprintHash)
    .where("expiresAt", ">", now)
    .limit(1)
    .get();

  if (snap.empty) return false;

  await snap.docs[0].ref.update({ lastUsedAt: FieldValue.serverTimestamp() });
  return true;
}

export async function registerPlatformTrustedDevice(
  db: Firestore,
  userId: string,
  device: DeviceContext,
): Promise<void> {
  const fingerprintHash = hashDeviceFingerprint(userId, device);
  const expiresAt = Timestamp.fromMillis(
    Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
  );

  const existing = await db
    .collection(`platformAdmins/${userId}/trustedDevices`)
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

  await db.collection(`platformAdmins/${userId}/trustedDevices`).add({
    label: buildDeviceLabel(device.userAgent),
    fingerprintHash,
    userAgent: device.userAgent,
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: FieldValue.serverTimestamp(),
    expiresAt,
  });
}

export async function touchPlatformAdminSession(
  db: Firestore,
  userId: string,
  email: string,
): Promise<void> {
  await db.doc(`platformAdmins/${userId}`).set(
    {
      email: email.trim().toLowerCase(),
      lastPlatformAuthAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
