import { createHmac, timingSafeEqual } from "node:crypto";

/** Valida X-Hub-Signature-256 (Meta WhatsApp Cloud API). */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) {
    return false;
  }
  const provided = signatureHeader.slice("sha256=".length).trim();
  if (!/^[a-f0-9]{64}$/i.test(provided)) {
    return false;
  }
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex"),
    );
  } catch {
    return false;
  }
}
