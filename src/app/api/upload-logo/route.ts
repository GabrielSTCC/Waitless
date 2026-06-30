import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  isCredentialError,
} from "@/lib/firebase/admin";
import { canUploadLogo, normalizeRole } from "@/lib/permissions";
import { isValidCompanyLogoUrl } from "@/lib/firebase/storage-url";

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const MAX_BYTES = 4 * 1024 * 1024;

function resolveContentType(file: File): string {
  if (file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_TYPES[ext] ?? "image/png";
}

async function canUploadCompanyLogo(uid: string, companyId: string): Promise<boolean> {
  const db = getAdminDb();
  const [companySnap, memberSnap] = await Promise.all([
    db.doc(`companies/${companyId}`).get(),
    db.doc(`members/${uid}`).get(),
  ]);

  if (!companySnap.exists) return false;

  const ownerId = companySnap.data()?.ownerId as string | undefined;
  const member = memberSnap.data();
  if (member?.companyId !== companyId) return false;

  return canUploadLogo(normalizeRole(member?.role as string | undefined), uid, ownerId ?? "");
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const formData = await request.formData();
    const companyId = formData.get("companyId");
    const file = formData.get("file");

    if (typeof companyId !== "string" || !companyId) {
      return NextResponse.json({ error: "companyId obrigatório." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo de imagem obrigatório." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagem acima de 4 MB." }, { status: 400 });
    }

    const contentType = resolveContentType(file);
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
    }

    const allowed = await canUploadCompanyLogo(decoded.uid, companyId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Sem permissão para enviar a logo." },
        { status: 403 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const objectPath = `companies/${companyId}/brand/logo.${ext}`;
    const bucket = getAdminStorage().bucket();
    const objectRef = bucket.file(objectPath);
    const buffer = Buffer.from(await file.arrayBuffer());
    const downloadToken = randomUUID();

    await objectRef.save(buffer, {
      contentType,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(objectPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    if (!isValidCompanyLogoUrl(url)) {
      return NextResponse.json({ error: "Bucket de Storage incorreto na URL gerada." }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao enviar a logo.";

    return NextResponse.json(
      {
        error: isCredentialError(error) ? CREDENTIAL_SETUP_MESSAGE : message,
      },
      { status: 500 },
    );
  }
}
