import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  canUseToleranceFeatures,
  canUseWhiteLabelLevel,
} from "@/lib/billing/plan-limits";
import { mapCompanyFromAdminData } from "@/lib/auth/session-server";
import {
  assertCanEditCompany,
  assertCompanyOwner,
  CompanyAccessError,
} from "@/lib/company/company-access-server";
import {
  CompanyNameTakenError,
  slugFromCompanyName,
  validateCompanySlug,
} from "@/lib/utils/company-slug";
import { syncPublicQueueBrandingServer } from "@/lib/company/sync-public-queue-branding-server";
import { normalizeBusinessHours } from "@/lib/appointments/hours";
import { parseServiceMode } from "@/lib/appointments/parse-company";
import type { BusinessHours, Company, CompanyBrand, CompanyLegal, ServiceMode } from "@/lib/types";

const CLIENT_VISIBLE_COMPANY_KEYS = new Set([
  "name",
  "avgServiceTimeMin",
  "toleranceEnabled",
  "toleranceMin",
  "defaultLocale",
  "contactWhatsapp",
  "brand",
]);

function affectsClientVisibleFields(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).some((key) => CLIENT_VISIBLE_COMPANY_KEYS.has(key));
}

export interface CompanyUpdateInput {
  name?: string;
  avgServiceTimeMin?: number;
  toleranceEnabled?: boolean;
  toleranceMin?: number;
  defaultLocale?: Company["defaultLocale"];
  contactWhatsapp?: string;
  brand?: CompanyBrand;
  legal?: CompanyLegal;
  appointmentsEnabled?: boolean;
  serviceMode?: ServiceMode;
  reminderLeadMin?: number;
  businessHours?: BusinessHours;
}

function serializeBrand(brand: CompanyBrand): Record<string, string> {
  const out: Record<string, string> = {};
  if (brand.accentColor !== undefined) out.accentColor = brand.accentColor;
  const logoUrl = brand.logoUrl?.trim();
  if (logoUrl) out.logoUrl = logoUrl;
  const tagline = brand.tagline?.trim();
  if (tagline) out.tagline = tagline;
  return out;
}

function serializeLegal(legal: CompanyLegal): Record<string, string> {
  const out: Record<string, string> = {};
  const cnpj = legal.cnpj?.replace(/\D/g, "");
  const legalName = legal.legalName?.trim();
  if (cnpj) out.cnpj = cnpj;
  if (legalName) out.legalName = legalName;
  return out;
}

async function assertRenameAvailable(
  db: Firestore,
  companyId: string,
  name: string,
): Promise<void> {
  const slug = slugFromCompanyName(name.trim());
  validateCompanySlug(slug);
  if (slug === companyId) return;
  const conflict = await db.doc(`companies/${slug}`).get();
  if (conflict.exists) throw new CompanyNameTakenError(slug);
}

function applyScheduleFields(payload: Record<string, unknown>, data: CompanyUpdateInput) {
  if (data.appointmentsEnabled !== undefined) {
    payload.appointmentsEnabled = data.appointmentsEnabled;
  }
  if (data.serviceMode !== undefined) {
    payload.serviceMode = parseServiceMode(data.serviceMode);
  }
  if (data.reminderLeadMin !== undefined) {
    payload.reminderLeadMin = Math.min(180, Math.max(5, Math.round(data.reminderLeadMin)));
  }
  if (data.businessHours !== undefined) {
    payload.businessHours = normalizeBusinessHours(data.businessHours);
  }
}

function applyToleranceFields(
  payload: Record<string, unknown>,
  data: CompanyUpdateInput,
  company: Company,
) {
  if (data.toleranceEnabled === undefined && data.toleranceMin === undefined) return;
  const canTolerance = canUseToleranceFeatures(company);
  if (data.toleranceEnabled !== undefined) {
    payload.toleranceEnabled = canTolerance ? data.toleranceEnabled : false;
  }
  if (data.toleranceMin !== undefined) {
    payload.toleranceMin = canTolerance ? data.toleranceMin : company.toleranceMin;
  }
}

function applyProfileFields(payload: Record<string, unknown>, data: CompanyUpdateInput) {
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.avgServiceTimeMin !== undefined) payload.avgServiceTimeMin = data.avgServiceTimeMin;
  if (data.defaultLocale !== undefined) {
    payload.defaultLocale = data.defaultLocale === "en" ? "en" : "pt-BR";
  }
  if (data.contactWhatsapp !== undefined) {
    const digits = data.contactWhatsapp.replace(/\D/g, "");
    payload.contactWhatsapp = digits || FieldValue.delete();
  }
}

function applyBrandField(
  payload: Record<string, unknown>,
  data: CompanyUpdateInput,
  company: Company,
) {
  if (data.brand === undefined) return;
  const canLogo = canUseWhiteLabelLevel(company, "logo");
  const canFull = canUseWhiteLabelLevel(company, "full");
  const brand: CompanyBrand = {
    accentColor: canLogo
      ? data.brand.accentColor ?? company.brand?.accentColor
      : company.brand?.accentColor,
    logoUrl: canLogo ? data.brand.logoUrl ?? company.brand?.logoUrl : company.brand?.logoUrl,
    tagline: canFull ? data.brand.tagline ?? company.brand?.tagline : company.brand?.tagline,
  };
  payload.brand = serializeBrand(brand);
}

function applyLegalField(payload: Record<string, unknown>, data: CompanyUpdateInput) {
  if (data.legal === undefined) return;
  const serialized = serializeLegal(data.legal);
  payload.legal = Object.keys(serialized).length > 0 ? serialized : FieldValue.delete();
}

export async function updateCompanyServer(
  db: Firestore,
  uid: string,
  companyId: string,
  data: CompanyUpdateInput,
): Promise<void> {
  await assertCanEditCompany(db, uid, companyId);

  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    throw new CompanyAccessError("not_found", "Estabelecimento não encontrado.");
  }

  const company = mapCompanyFromAdminData(companyId, companySnap.data()!);

  if (data.legal !== undefined) {
    await assertCompanyOwner(db, uid, companyId);
  }

  if (data.name !== undefined) {
    await assertRenameAvailable(db, companyId, data.name);
  }

  const payload: Record<string, unknown> = {};
  applyScheduleFields(payload, data);
  applyProfileFields(payload, data);
  applyToleranceFields(payload, data, company);
  applyBrandField(payload, data, company);
  applyLegalField(payload, data);

  if (Object.keys(payload).length === 0) return;

  const shouldSyncPublicQueue = affectsClientVisibleFields(payload);

  await db.doc(`companies/${companyId}`).update(payload);

  if (!shouldSyncPublicQueue) return;

  const updatedSnap = await db.doc(`companies/${companyId}`).get();
  if (!updatedSnap.exists) return;

  const updatedCompany = mapCompanyFromAdminData(companyId, updatedSnap.data()!);
  await syncPublicQueueBrandingServer(db, companyId, updatedCompany);
}
