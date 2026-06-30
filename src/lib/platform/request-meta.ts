import type { NextRequest } from "next/server";
import { buildDeviceLabel } from "@/lib/auth/two-factor-server";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "desconhecido";
  }
  return request.headers.get("x-real-ip") ?? "desconhecido";
}

export function getRequestMeta(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "desconhecido";
  return {
    ip: getClientIp(request),
    userAgent,
    deviceLabel: buildDeviceLabel(userAgent),
    timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }),
  };
}
