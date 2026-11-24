import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getRequestIp,
  rateLimitResponse,
} from "@/lib/rate-limit/check-rate-limit";

/** Rate limit compartilhado das rotas públicas /api/queue/* (token + IP). */
export async function enforcePublicQueueRateLimit(
  request: Request,
  routeKey: string,
  token: string,
): Promise<NextResponse | null> {
  const ip = getRequestIp(request);
  const tokenPart = token.slice(0, 16) || "none";
  const limited = await checkRateLimit(
    `queue:${routeKey}:${ip}:${tokenPart}`,
    30,
    60_000,
  );
  if (!limited.ok) {
    const { body, init } = rateLimitResponse(limited);
    return NextResponse.json(body, init);
  }
  return null;
}
