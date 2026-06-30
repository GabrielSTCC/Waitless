import { PlatformAuthForm } from "@/components/platform/PlatformAuthForm";
import { getPlatformAdminEmail } from "@/lib/platform/auth";

export default function PlatformAuthPage() {
  const adminEmail = getPlatformAdminEmail();
  return <PlatformAuthForm adminEmail={adminEmail} />;
}
