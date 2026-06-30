import type { QueueEntry } from "@/lib/types";

export interface QueueRankInfo {
  displayPosition: number;
  isFirst: boolean;
}

export function computeQueueRanks(entries: QueueEntry[]): Map<string, QueueRankInfo> {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const map = new Map<string, QueueRankInfo>();

  sorted.forEach((entry, index) => {
    map.set(entry.id, {
      displayPosition: index + 1,
      isFirst: index === 0,
    });
  });

  return map;
}
