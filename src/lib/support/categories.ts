export const SUPPORT_CATEGORIES = [
  "subscription",
  "payment",
  "analytics",
  "queue",
  "mini_crm",
  "team",
  "branding",
  "security",
  "account",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_OTHER: SupportCategory = "other";

export const SUPPORT_DESCRIPTION_MIN_LENGTH = 20;
export const SUPPORT_CUSTOM_CATEGORY_MIN_LENGTH = 3;

export function isSupportCategory(value: string): value is SupportCategory {
  return (SUPPORT_CATEGORIES as readonly string[]).includes(value);
}

const CATEGORY_LABELS_PT: Record<SupportCategory, string> = {
  subscription: "Assinatura / planos",
  payment: "Pagamento / faturamento",
  analytics: "Analytics",
  queue: "Fila de espera",
  mini_crm: "Mini-CRM / clientes",
  team: "Equipe / convites",
  branding: "Marca / logo",
  security: "Segurança / 2FA",
  account: "Conta / exclusão",
  other: "Outro",
};

const CATEGORY_LABELS_EN: Record<SupportCategory, string> = {
  subscription: "Subscription / plans",
  payment: "Payment / billing",
  analytics: "Analytics",
  queue: "Waiting queue",
  mini_crm: "Mini-CRM / customers",
  team: "Team / invites",
  branding: "Branding / logo",
  security: "Security / 2FA",
  account: "Account / deletion",
  other: "Other",
};

export function getSupportCategoryLabel(
  category: SupportCategory,
  locale: "pt-BR" | "en" = "pt-BR",
): string {
  return locale === "en" ? CATEGORY_LABELS_EN[category] : CATEGORY_LABELS_PT[category];
}

export interface SupportReportPayload {
  category: SupportCategory;
  customCategory?: string;
  description: string;
}

export interface SupportReportValidationResult {
  ok: true;
  data: SupportReportPayload;
}

export interface SupportReportValidationError {
  ok: false;
  error: string;
}

export function validateSupportReportBody(
  body: unknown,
): SupportReportValidationResult | SupportReportValidationError {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "INVALID_BODY" };
  }

  const { category, customCategory, description } = body as Record<string, unknown>;

  if (typeof category !== "string" || !isSupportCategory(category)) {
    return { ok: false, error: "INVALID_CATEGORY" };
  }

  const trimmedDescription =
    typeof description === "string" ? description.trim() : "";

  if (trimmedDescription.length < SUPPORT_DESCRIPTION_MIN_LENGTH) {
    return { ok: false, error: "INVALID_DESCRIPTION" };
  }

  let trimmedCustom: string | undefined;

  if (category === SUPPORT_CATEGORY_OTHER) {
    trimmedCustom =
      typeof customCategory === "string" ? customCategory.trim() : "";
    if (trimmedCustom.length < SUPPORT_CUSTOM_CATEGORY_MIN_LENGTH) {
      return { ok: false, error: "INVALID_CUSTOM_CATEGORY" };
    }
  }

  return {
    ok: true,
    data: {
      category,
      customCategory: trimmedCustom,
      description: trimmedDescription,
    },
  };
}
