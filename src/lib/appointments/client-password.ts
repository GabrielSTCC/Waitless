import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { CLIENT_PASSWORD_MIN_LENGTH } from "@/lib/appointments/client-password-policy";

export { CLIENT_PASSWORD_MIN_LENGTH } from "@/lib/appointments/client-password-policy";

/** Format: scrypt$N$r$p$saltHex$hashHex — N/r/p fixed for v1. */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;

function scryptDerive(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

export function assertClientPasswordValid(password: string): void {
  if (password.length < CLIENT_PASSWORD_MIN_LENGTH) {
    throw new Error(`A senha deve ter pelo menos ${CLIENT_PASSWORD_MIN_LENGTH} caracteres.`);
  }
}

export async function hashClientPassword(password: string): Promise<string> {
  assertClientPasswordValid(password);
  const salt = randomBytes(SALT_LEN);
  const derived = await scryptDerive(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyClientPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash.startsWith("scrypt$")) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 6) return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltHex = parts[4] ?? "";
  const hashHex = parts[5] ?? "";
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = await scryptDerive(password, salt, expected.length, {
      N: n,
      r,
      p,
    });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
