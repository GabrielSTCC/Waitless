import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { getPlatformAdminEmail } from "@/lib/platform/auth";

const SESSION_MAX_AGE_SEC = 8 * 60 * 60;

export interface PlatformSessionPayload {
  uid: string;
  email: string;
  platformAdmin: true;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.PLATFORM_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "development") {
      return new TextEncoder().encode("dev-only-platform-session-secret-32chars!!");
    }
    throw new Error("PLATFORM_SESSION_SECRET não configurado (mín. 32 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

export function getPlatformSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Host-platform-session"
    : "platform-session";
}

export async function createPlatformSessionToken(
  payload: PlatformSessionPayload,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SEC)
    .sign(getSessionSecret());
}

export async function verifyPlatformSessionToken(
  token: string,
): Promise<PlatformSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const uid = payload.uid;
    const email = payload.email;
    if (
      typeof uid !== "string" ||
      typeof email !== "string" ||
      payload.platformAdmin !== true
    ) {
      return null;
    }
    if (email.toLowerCase() !== getPlatformAdminEmail()) {
      return null;
    }
    return { uid, email, platformAdmin: true };
  } catch {
    return null;
  }
}

export function getPlatformSessionFromRequest(
  request: NextRequest,
): string | null {
  return request.cookies.get(getPlatformSessionCookieName())?.value ?? null;
}

export async function verifyPlatformSessionFromRequest(
  request: NextRequest,
): Promise<PlatformSessionPayload | null> {
  const token = getPlatformSessionFromRequest(request);
  if (!token) return null;
  return verifyPlatformSessionToken(token);
}

export function setPlatformSessionCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(getPlatformSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearPlatformSessionCookie(response: NextResponse): void {
  response.cookies.set(getPlatformSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
