import { NextResponse, type NextRequest } from "next/server";
import {
  getPlatformSessionCookieName,
  verifyPlatformSessionToken,
} from "@/lib/platform/session";

const PUBLIC_PLATFORM_PATHS = ["/platform/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/platform")) {
    return NextResponse.next();
  }

  if (PUBLIC_PLATFORM_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getPlatformSessionCookieName())?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/platform/auth", request.url));
  }

  const session = await verifyPlatformSessionToken(token);
  if (!session) {
    const response = NextResponse.redirect(new URL("/platform/auth", request.url));
    response.cookies.delete(getPlatformSessionCookieName());
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/platform/:path*"],
};
