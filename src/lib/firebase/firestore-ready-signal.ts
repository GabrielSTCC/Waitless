let firestoreClientReady = false;

export function setFirestoreClientReadySignal(ready: boolean): void {
  firestoreClientReady = ready;
}

export function isFirestoreClientReadySignal(): boolean {
  return firestoreClientReady;
}
