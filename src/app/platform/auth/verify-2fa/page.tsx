import { PlatformVerify2FAClient } from "@/components/platform/PlatformVerify2FAClient";
import { getPlatformAdminEmail } from "@/lib/platform/auth";

export const dynamic = "force-dynamic";

export default function PlatformVerify2FAPage() {
  const adminEmail = getPlatformAdminEmail();
  return <PlatformVerify2FAClient adminEmail={adminEmail} />;
}
