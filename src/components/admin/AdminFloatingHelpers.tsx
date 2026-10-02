"use client";

import { AreaGuide } from "@/components/admin/AreaGuide";
import { ProtectionAdvisory } from "@/components/admin/ProtectionAdvisory";
import { AdminFloatingHelpersProvider } from "@/components/admin/admin-floating-helpers-context";

export function AdminFloatingHelpers() {
  return (
    <AdminFloatingHelpersProvider>
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-max max-w-[calc(100vw-2rem)] flex-col items-end gap-3 bg-transparent">
        <AreaGuide />
        <ProtectionAdvisory embedded />
      </div>
    </AdminFloatingHelpersProvider>
  );
}

export {
  useAdminFloatingHelpers,
  useAdminFloatingHelpersOptional,
} from "@/components/admin/admin-floating-helpers-context";
