export class ClientAlreadyInQueueError extends Error {
  constructor(clientName: string) {
    super(`${clientName} já está na fila de espera.`);
    this.name = "ClientAlreadyInQueueError";
  }
}
