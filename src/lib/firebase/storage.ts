import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "@/lib/firebase/config";
import {
  CREDENTIAL_SETUP_MESSAGE,
  isCredentialSetupError,
} from "@/lib/firebase/admin-constants";
import { isValidCompanyLogoUrl } from "@/lib/firebase/storage-url";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function resolveImageContentType(file: File): string {
  if (file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_TYPES[ext] ?? "image/png";
}

export function formatLogoUploadError(error: unknown): string {
  if (error instanceof Error) {
    if (isCredentialSetupError(error.message)) return CREDENTIAL_SETUP_MESSAGE;
    if (error.message.includes("Bucket de Storage")) return error.message;
    return error.message || "Falha ao enviar a logo. Tente novamente ou use uma URL externa.";
  }

  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";

  switch (code) {
    case "storage/unauthenticated":
      return "Faça login novamente para enviar a logo.";
    case "storage/canceled":
      return "Upload cancelado.";
    default:
      return "Falha ao enviar a logo. Tente novamente ou use uma URL externa.";
  }
}

async function uploadViaApi(companyId: string, file: File): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw Object.assign(new Error("Faça login novamente."), { code: "storage/unauthenticated" });
  }

  const idToken = await currentUser.getIdToken(true);
  const formData = new FormData();
  formData.append("companyId", companyId);
  formData.append("file", file);

  const response = await fetch("/api/upload-logo", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });

  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Falha ao enviar a logo pelo servidor.");
  }

  if (!data.url || !isValidCompanyLogoUrl(data.url)) {
    throw new Error("URL da logo inválida após upload.");
  }

  return data.url;
}

async function uploadViaClient(companyId: string, file: File): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw Object.assign(new Error("Faça login novamente."), { code: "storage/unauthenticated" });
  }
  await currentUser.getIdToken(true);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `companies/${companyId}/brand/logo.${ext}`;
  const storageRef = ref(storage, path);
  const contentType = resolveImageContentType(file);

  await uploadBytes(storageRef, file, { contentType });
  const url = await getDownloadURL(storageRef);

  if (!isValidCompanyLogoUrl(url)) {
    throw new Error(
      `URL gerada com bucket incorreto. Esperado: ${STORAGE_BUCKET}.`,
    );
  }

  return url;
}

export async function uploadCompanyLogo(
  companyId: string,
  file: File,
): Promise<string> {
  if (!STORAGE_BUCKET || STORAGE_BUCKET.endsWith(".firebaseapp.com")) {
    throw new Error(
      "Bucket incorreto em NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET — use waitless-queue-saas.firebasestorage.app.",
    );
  }

  try {
    return await uploadViaApi(companyId, file);
  } catch (apiError) {
    const message =
      apiError instanceof Error ? apiError.message : String(apiError);

    if (isCredentialSetupError(message)) {
      throw new Error(CREDENTIAL_SETUP_MESSAGE);
    }

    return uploadViaClient(companyId, file);
  }
}
