export type TerminalVisitStatus = "completed" | "cancelled" | "expired";

export interface ClientVisit {
  visitId: string;
  entryId: string;
  status: TerminalVisitStatus;
  occurredAt: Date;
  companyId: string;
  clientId: string;
}

export interface ClientVisitRecord {
  visitId: string;
  status: TerminalVisitStatus;
  occurredAt: string;
}

export interface AppendClientVisitParams {
  companyId: string;
  clientId: string;
  entryId: string;
  status: TerminalVisitStatus;
  occurredAt?: Date;
}
