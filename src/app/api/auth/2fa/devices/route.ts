import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { handleAuthApiError } from "@/lib/auth/api-error";

export const runtime = "nodejs";

function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return "";
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const snap = await getAdminDb()
      .collection(`members/${authResult.uid}/trustedDevices`)
      .orderBy("lastUsedAt", "desc")
      .get();

    const devices = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        label: (data.label as string | undefined) ?? "Dispositivo",
        createdAt: toIso(data.createdAt),
        lastUsedAt: toIso(data.lastUsedAt),
        expiresAt: toIso(data.expiresAt),
      };
    });

    return NextResponse.json({ devices });
  } catch (error) {
    return handleAuthApiError(
      "2fa/devices GET",
      error,
      "Falha ao listar dispositivos.",
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json().catch(() => ({}))) as {
      deviceId?: unknown;
    };
    const deviceId =
      typeof body.deviceId === "string" ? body.deviceId.trim() : "";

    if (!deviceId) {
      return NextResponse.json(
        { error: "Dispositivo inválido." },
        { status: 400 },
      );
    }

    const ref = getAdminDb().doc(
      `members/${authResult.uid}/trustedDevices/${deviceId}`,
    );
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Dispositivo não encontrado." },
        { status: 404 },
      );
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthApiError(
      "2fa/devices DELETE",
      error,
      "Falha ao revogar dispositivo.",
    );
  }
}
