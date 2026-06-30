"use client";

import { useSyncExternalStore } from "react";
import { isQueueLive, subscribeQueueLive } from "@/lib/firebase/queue-live-signal";

export function useQueueLive(): boolean {
  return useSyncExternalStore(subscribeQueueLive, isQueueLive, () => false);
}
