let queueLive = false;
const listeners = new Set<() => void>();

export function setQueueLive(live: boolean): void {
  if (queueLive === live) return;
  queueLive = live;
  listeners.forEach((listener) => listener());
}

export function isQueueLive(): boolean {
  return queueLive;
}

export function subscribeQueueLive(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
