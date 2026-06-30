import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SettingsFeedbackProps {
  error?: string;
  success?: string;
}

export function SettingsFeedback({ error, success }: SettingsFeedbackProps) {
  if (!error && !success) return null;

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl border border-error/30 bg-error-container/50 px-4 py-3 text-sm text-error",
          )}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
