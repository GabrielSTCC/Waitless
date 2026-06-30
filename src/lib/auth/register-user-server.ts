import { getAdminAuth } from "@/lib/firebase/admin";
import { userUidFromEmail } from "@/lib/auth/user-uid";

export class RegisterUserError extends Error {
  code: "email_in_use" | "invalid_email" | "weak_password" | "server";

  constructor(
    code: RegisterUserError["code"],
    message: string,
  ) {
    super(message);
    this.name = "RegisterUserError";
    this.code = code;
  }
}

function mapAdminCreateError(error: unknown): never {
  const code = (error as { code?: string })?.code;
  if (code === "auth/email-already-exists") {
    throw new RegisterUserError("email_in_use", "Este e-mail já está em uso.");
  }
  if (code === "auth/invalid-email") {
    throw new RegisterUserError("invalid_email", "E-mail inválido.");
  }
  if (code === "auth/invalid-password" || code === "auth/weak-password") {
    throw new RegisterUserError("weak_password", "Senha fraca ou inválida.");
  }
  throw error;
}

export async function registerEmailUserWithReadableUid(
  email: string,
  password: string,
): Promise<{ uid: string; customToken: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const uid = userUidFromEmail(normalizedEmail);
  const auth = getAdminAuth();

  try {
    await auth.getUserByEmail(normalizedEmail);
    throw new RegisterUserError("email_in_use", "Este e-mail já está em uso.");
  } catch (error) {
    if (error instanceof RegisterUserError) throw error;
    const code = (error as { code?: string })?.code;
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  try {
    await auth.createUser({
      uid,
      email: normalizedEmail,
      password,
      emailVerified: false,
    });
  } catch (error) {
    mapAdminCreateError(error);
  }

  const customToken = await auth.createCustomToken(uid);
  return { uid, customToken };
}

export async function finalizeGoogleUserWithReadableUid(input: {
  idToken: string;
  provisionalUid: string;
}): Promise<{ uid: string; customToken: string; created: boolean }> {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(input.idToken);
  const email = decoded.email?.trim().toLowerCase();

  if (!email) {
    throw new RegisterUserError("invalid_email", "Conta Google sem e-mail.");
  }

  const readableUid = userUidFromEmail(email);

  try {
    const existing = await auth.getUserByEmail(email);
    if (input.provisionalUid !== existing.uid) {
      try {
        await auth.deleteUser(input.provisionalUid);
      } catch {
        // Conta provisória já removida ou inexistente
      }
    }
    const customToken = await auth.createCustomToken(existing.uid);
    return { uid: existing.uid, customToken, created: false };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  if (input.provisionalUid !== readableUid) {
    try {
      await auth.deleteUser(input.provisionalUid);
    } catch {
      // ignore
    }
  }

  try {
    await auth.createUser({
      uid: readableUid,
      email,
      emailVerified: decoded.email_verified === true,
      displayName: decoded.name ?? undefined,
      photoURL: decoded.picture ?? undefined,
    });
  } catch (error) {
    const adminCode = (error as { code?: string })?.code;
    if (adminCode === "auth/uid-already-exists") {
      const customToken = await auth.createCustomToken(readableUid);
      return { uid: readableUid, customToken, created: false };
    }
    mapAdminCreateError(error);
  }

  const customToken = await auth.createCustomToken(readableUid);
  return { uid: readableUid, customToken, created: true };
}
