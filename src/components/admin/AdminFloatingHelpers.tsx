"use client";

import { AreaGuideFab, AreaGuidePanel } from "@/components/admin/AreaGuide";
import {
  ProtectionAdvisoryFab,
  ProtectionAdvisoryPanel,
  useProtectionAdvisoryState,
} from "@/components/admin/ProtectionAdvisory";
import { AdminFloatingHelpersProvider } from "@/components/admin/admin-floating-helpers-context";

function FloatingHelpersContent() {
  const protection = useProtectionAdvisoryState();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-max max-w-[calc(100vw-2rem)] flex-col items-end gap-3 bg-transparent">
      <AreaGuidePanel />
      <ProtectionAdvisoryPanel state={protection} />
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <AreaGuideFab />
        <ProtectionAdvisoryFab state={protection} />
      </div>
    </div>
  );
}

export function AdminFloatingHelpers() {
  return (
    <AdminFloatingHelpersProvider>
      <FloatingHelpersContent />
    </AdminFloatingHelpersProvider>
  );
}

export {
  useAdminFloatingHelpers,
  useAdminFloatingHelpersOptional,
} from "@/components/admin/admin-floating-helpers-context";
