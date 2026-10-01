export type MemberRole = "owner" | "admin" | "base";

/** @deprecated Legado — mapeado para "base" em runtime */
export type LegacyMemberRole = "staff";

export type QueueStatus = "waiting" | "in_service" | "completed" | "passed";

export type QueueSource = "walk_in" | "appointment";

export type ServiceMode = "single" | "per_professional" | "pool";

export type WeekdayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface BusinessHoursDay {
  closed: boolean;
  start: string;
  end: string;
}

export type BusinessHours = Record<WeekdayKey, BusinessHoursDay>;

export type CalendarExceptionType = "closed" | "hours_override";

export interface CalendarException {
  id: string;
  date: string;
  type: CalendarExceptionType;
  start?: string;
  end?: string;
  note?: string;
}

export type AppointmentStatus =
  | "requested"
  | "rejected"
  | "confirmed"
  | "arrival_confirmed"
  | "in_service"
  | "completed"
  | "skipped"
  | "cancelled";

/** Estados exclusivos do link público */
export type PublicQueueStatus = QueueStatus | "expired" | "cancelled";

export type VacancyReason =
  | "tolerance_expired"
  | "no_show"
  | "manual"
  | "client_cancelled";

export type SpotOfferStatus = "pending" | "accepted" | "declined";

export interface SpotOffer {
  vacancyId: string;
  status: SpotOfferStatus;
  expiresAt?: Date;
}

export interface QueueVacancyCurrentOffer {
  entryId: string;
  publicToken: string;
  clientName: string;
  offeredAt: Date;
  expiresAt?: Date;
}

export interface QueueVacancy {
  active: boolean;
  createdAt: Date;
  reason: VacancyReason;
  removedEntryId?: string;
  declinedEntryIds: string[];
  currentOffer?: QueueVacancyCurrentOffer;
  filledEntryId?: string;
  closedAt?: Date;
}

import type { Locale } from "@/lib/i18n/types";

export type { Locale };

export type TwoFactorMethod = "email";

export interface MemberSecurity {
  twoFactorEnabled?: boolean;
  twoFactorMethod?: TwoFactorMethod;
  twoFactorPending?: boolean;
  requireTwoFactorOnNextLogin?: boolean;
  lastTwoFactorVerifiedAt?: Date;
}

export interface TrustedDevice {
  id: string;
  label: string;
  fingerprintHash: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface Member {
  companyId: string;
  email: string;
  role: MemberRole;
  security?: MemberSecurity;
}

export interface CompanyMember extends Member {
  userId: string;
}

export interface CompanyBrand {
  accentColor?: string;
  logoUrl?: string;
  tagline?: string;
}

export interface CompanyLegal {
  /** 14 dígitos, sem formatação */
  cnpj?: string;
  /** Razão social */
  legalName?: string;
}

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type PlatformControlStatus = "active" | "suspended" | "paused";

export interface PlatformControl {
  status: PlatformControlStatus;
  reason?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export type PlatformAuditAction =
  | "company.suspend"
  | "company.pause"
  | "company.reactivate"
  | "company.delete"
  | "company.sync_stripe"
  | "company.change_plan"
  | "platform.login_success"
  | "platform.login_failed"
  | "platform.otp_failed"
  | "platform.access_denied";

export interface PlatformAuditEntry {
  id: string;
  action: PlatformAuditAction;
  targetCompanyId?: string;
  targetCompanyName?: string;
  actorUid: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface PlatformCompanySummary {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail?: string;
  createdAt: Date;
  subscription?: CompanySubscription;
  platformControl?: PlatformControl;
  clientCount: number;
  memberCount: number;
  queueWaiting: number;
  billingMarket?: BillingMarket;
}

export interface PlatformStats {
  totalCompanies: number;
  activeSubscriptions: number;
  pastDueCount: number;
  suspendedCount: number;
  pausedCount: number;
  totalClients: number;
  newCompaniesLast30Days: number;
  queueWaitingNow: number;
}

export type BillingInterval = "week" | "month" | "year";
export type BillingMarket = "BR" | "US";
export type BillingCountry = "BR" | "US";

export type PaymentProvider = "stripe" | "asaas";

export type BillingTransactionStatus =
  | "paid"
  | "pending"
  | "failed"
  | "refunded"
  | "canceled";

export interface BillingTransaction {
  id: string;
  provider: PaymentProvider;
  externalId: string;
  companyId: string;
  companyName: string;
  amountMinor: number;
  currency: "BRL" | "USD";
  status: BillingTransactionStatus;
  rawStatus: string;
  billingType: string;
  planId?: string;
  description?: string;
  occurredAt: Date;
  updatedAt: Date;
}

export interface BillingTransactionSummary {
  paidRevenueMinor: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  filteredTotal: number;
}

export interface CompanySubscription {
  status: SubscriptionStatus;
  planId?: string;
  billingInterval?: BillingInterval;
  billingMarket?: BillingMarket;
  paymentProvider?: PaymentProvider;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  avgServiceTimeMin: number;
  toleranceEnabled: boolean;
  toleranceMin: number;
  defaultLocale: Locale;
  billingCountry?: BillingCountry;
  billingMarket?: BillingMarket;
  subscription?: CompanySubscription;
  brand?: CompanyBrand;
  legal?: CompanyLegal;
  /** WhatsApp de contato da empresa (só dígitos) — avisos de desmarcação */
  contactWhatsapp?: string;
  appointmentsEnabled?: boolean;
  serviceMode?: ServiceMode;
  /** Minutos antes do horário em que o painel libera o envio do link */
  reminderLeadMin?: number;
  businessHours?: BusinessHours;
  /** Cliente precisa confirmar presença no dia (senão auto-entra na fila) */
  arrivalConfirmRequired?: boolean;
  /** Minutos antes do horário em que a confirmação do cliente abre (padrão 120) */
  arrivalConfirmOpenMin?: number;
  /** Minutos antes do horário em que o prazo de confirmar fecha (0 = até o horário) */
  arrivalConfirmDeadlineMin?: number;
  /** Se confirmação desligada: minutos antes do horário para auto-entrar na fila */
  autoJoinLeadMin?: number;
  /** Antecedência mínima para marcar (minutos) */
  minBookAheadMin?: number;
  /** Máximo de dias à frente para marcar */
  maxBookAheadDays?: number;
  /** Buffer entre slots (minutos) */
  slotBufferMin?: number;
  platformControl?: PlatformControl;
  createdAt: Date;
}

export interface Professional {
  id: string;
  name: string;
  active: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  professionalId?: string;
  professionalName?: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  publicToken: string;
  queueEntryId?: string;
  confirmedArrivalAt?: Date;
  createdAt: Date;
}

export interface PublicQueueSnapshot {
  token: string;
  companyId: string;
  entryId: string;
  status: PublicQueueStatus;
  position: number;
  estimatedWaitMin: number;
  companyName: string;
  companyTagline?: string;
  avgServiceTimeMin: number;
  toleranceEnabled?: boolean;
  toleranceMin?: number;
  toleranceExpiresAt?: Date;
  brandAccent?: string;
  brandLogoUrl?: string;
  locale?: Locale;
  clientName?: string;
  companyContactWhatsapp?: string;
  clientId?: string;
  spotOffer?: SpotOffer;
  updatedAt?: Date;
  queueKind?: QueueSource;
  appointmentStatus?: AppointmentStatus;
  scheduledAt?: Date;
  servingNames?: string[];
  professionalName?: string;
  passed?: boolean;
  arrivalConfirmRequired?: boolean;
  arrivalConfirmOpenMin?: number;
  arrivalConfirmDeadlineMin?: number;
  autoJoinLeadMin?: number;
}

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  normalizedWhatsapp: string;
  normalizedName: string;
  visitCount: number;
  createdAt: Date;
  lastVisitAt: Date;
}

export interface QueueEntry {
  id: string;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  status: QueueStatus;
  position: number;
  ticketNumber: number;
  publicToken?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  location?: string;
  estimatedWaitMin?: number;
  turnStartedAt?: Date;
  toleranceExpiresAt?: Date;
  spotOfferStatus?: SpotOfferStatus;
  source?: QueueSource;
  appointmentId?: string;
  professionalId?: string;
  scheduledAt?: Date;
}
