process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
  "waitless-queue-saas.firebasestorage.app";

import { describe, expect, it } from "vitest";

const { parseOwnStorageLogoUrl } = await import("../src/lib/firebase/storage-url");

const ownLogo =
  "https://firebasestorage.googleapis.com/v0/b/waitless-queue-saas.firebasestorage.app/o/companies%2Fcafe%2Fbrand%2Flogo.png?alt=media&token=abc";

describe("parseOwnStorageLogoUrl", () => {
  it("accepts a logo in the project bucket", () => {
    expect(parseOwnStorageLogoUrl(ownLogo)).toEqual({ companyId: "cafe" });
  });

  it("rejects other hosts and buckets", () => {
    expect(parseOwnStorageLogoUrl("https://example.com/logo.png")).toBeNull();
    expect(parseOwnStorageLogoUrl("http://169.254.169.254/latest/meta-data")).toBeNull();
    expect(
      parseOwnStorageLogoUrl(
        "https://firebasestorage.googleapis.com/v0/b/other.appspot.com/o/companies%2Fcafe%2Fbrand%2Flogo.png",
      ),
    ).toBeNull();
  });
});
