import { User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface QueueProgressDotsProps {
  peopleAhead: number;
  accentColor?: string;
  variant?: "light" | "brand" | "glass" | "deep";
}

/**
 * Trilho: [pessoas à frente...] → [você] → [balcão]
 * O preenchimento vai da entrada até a sua posição na fila.
 */
export function QueueProgressDots({
  peopleAhead,
  accentColor,
  variant = "deep",
}: QueueProgressDotsProps) {
  const accent = accentColor ?? "var(--color-primary)";
  const onDeep = variant === "deep" || variant === "glass" || variant === "brand";

  // Marcadores: cada pessoa à frente + você + balcão
  const youIndex = peopleAhead;
  const counterIndex = peopleAhead + 1;
  const markerCount = counterIndex + 1;

  const progressPercent =
    peopleAhead === 0 ? 88 : Math.round((youIndex / counterIndex) * 100);

  const trackBg = onDeep ? "bg-white/25" : "bg-outline-variant";
  const fillColor = onDeep ? "#ffffff" : accent;

  return (
    <div className="relative mt-6 px-1">
      <div className={cn("h-[3px] w-full overflow-hidden rounded-full", trackBg)}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%`, backgroundColor: fillColor }}
        />
      </div>

      <div className="absolute inset-x-1 top-1/2 flex -translate-y-1/2 justify-between">
        {Array.from({ length: markerCount }).map((_, i) => {
          const isYou = i === youIndex;
          const isCounter = i === counterIndex;

          if (isCounter) {
            return (
              <div
                key={i}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border-2",
                  onDeep ? "border-white/50 bg-transparent" : "border-outline bg-surface-container",
                )}
                title="Balcão"
              />
            );
          }

          if (isYou) {
            return (
              <div
                key={i}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  onDeep ? "bg-white" : "bg-primary",
                )}
                style={
                  onDeep
                    ? { boxShadow: "0 0 0 3px rgba(255, 255, 255, 0.45)" }
                    : { boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 25%, white)` }
                }
                title="Você"
              >
                <User
                  className={cn("h-2.5 w-2.5", onDeep ? "text-[#1e3050]" : "text-on-primary")}
                  strokeWidth={2.5}
                />
              </div>
            );
          }

          // Pessoa à frente
          return (
            <div
              key={i}
              className={cn(
                "flex h-3.5 w-3.5 items-center justify-center rounded-full",
                onDeep ? "bg-white/55" : "bg-outline-variant",
              )}
              title={`Pessoa ${i + 1} à frente`}
            >
              <User
                className={cn("h-2 w-2", onDeep ? "text-white/80" : "text-on-surface-variant")}
                strokeWidth={2.5}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
