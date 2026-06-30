import { NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  isCredentialError,
} from "@/lib/firebase/admin";
import { MemberNotFoundError } from "@/lib/auth/member-security-admin";

export function handleAuthApiError(
  route: string,
  error: unknown,
  fallback: string,
): NextResponse {
  console.error(`[${route}]`, error);

  if (error instanceof MemberNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json(
    {
      error: isCredentialError(error) ? CREDENTIAL_SETUP_MESSAGE : message,
    },
    { status: 500 },
  );
}
