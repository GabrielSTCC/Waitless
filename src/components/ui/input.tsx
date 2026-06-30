import * as React from "react";
import { surfaceInput } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-outline-variant bg-transparent px-3.5 py-1.5 text-base outline-none selection:bg-primary selection:text-on-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        surfaceInput,
        "placeholder:text-on-surface-variant/60",
        "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-[3px]",
        "aria-invalid:border-error aria-invalid:ring-error/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
