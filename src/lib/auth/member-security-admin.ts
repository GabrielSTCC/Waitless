import { FieldValue, type Firestore } from "firebase-admin/firestore";

export class MemberNotFoundError extends Error {
  constructor() {
    super("Membro não encontrado.");
    this.name = "MemberNotFoundError";
  }
}

export async function getMemberRef(db: Firestore, userId: string) {
  const ref = db.doc(`members/${userId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new MemberNotFoundError();
  }
  return { ref, snap };
}

export async function enableTwoFactorSecurity(
  db: Firestore,
  userId: string,
): Promise<void> {
  const { ref } = await getMemberRef(db, userId);
  await ref.update({
    "security.twoFactorEnabled": true,
    "security.twoFactorMethod": "email",
    "security.twoFactorPending": false,
    "security.requireTwoFactorOnNextLogin": false,
    "security.enabledAt": FieldValue.serverTimestamp(),
    "security.lastTwoFactorVerifiedAt": FieldValue.serverTimestamp(),
  });
}

export async function disableTwoFactorSecurity(
  db: Firestore,
  userId: string,
): Promise<void> {
  const { ref } = await getMemberRef(db, userId);
  await ref.update({
    "security.twoFactorEnabled": false,
    "security.twoFactorMethod": FieldValue.delete(),
    "security.twoFactorPending": false,
    "security.requireTwoFactorOnNextLogin": false,
  });
}

export async function setTwoFactorPendingField(
  db: Firestore,
  userId: string,
  pending: boolean,
): Promise<void> {
  const { ref } = await getMemberRef(db, userId);
  await ref.update({ "security.twoFactorPending": pending });
}

export async function clearTwoFactorPendingFields(
  db: Firestore,
  userId: string,
): Promise<void> {
  const { ref } = await getMemberRef(db, userId);
  await ref.update({
    "security.twoFactorPending": false,
    "security.requireTwoFactorOnNextLogin": false,
    "security.lastTwoFactorVerifiedAt": FieldValue.serverTimestamp(),
  });
}

export async function setRequireTwoFactorOnNextLogin(
  db: Firestore,
  userId: string,
): Promise<void> {
  const { ref } = await getMemberRef(db, userId);
  await ref.update({ "security.requireTwoFactorOnNextLogin": true });
}
