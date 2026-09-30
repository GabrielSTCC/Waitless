import type { ReactNode } from "react";

export default function ClientQueueLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-background">
      {children}
    </div>
  );
}
