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
  InvalidCompanyNameError,
  slugFromCompanyName,
  validateCompanySlug,
} from "@/lib/utils/company-slug";
import { syncPublicQueueBrandingServer } from "@/lib/company/sync-public-queue-branding-server";
import type { Company, CompanyBrand, CompanyLegal } from "@/lib/types";

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
    const trimmedName = data.name.trim();
    const slug = slugFromCompanyName(trimmedName);
    try {
      validateCompanySlug(slug);
    } catch (error) {
      if (error instanceof InvalidCompanyNameError) throw error;
      throw error;
    }
    if (slug !== companyId) {
      const conflict = await db.doc(`companies/${slug}`).get();
      if (conflict.exists) {
        throw new CompanyNameTakenError(slug);
      }
    }
  }

  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.avgServiceTimeMin !== undefined) {
    payload.avgServiceTimeMin = data.avgServiceTimeMin;
  }

  if (data.toleranceEnabled !== undefined || data.toleranceMin !== undefined) {
    const canTolerance = canUseToleranceFeatures(company);
    if (data.toleranceEnabled !== undefined) {
      payload.toleranceEnabled = canTolerance ? data.toleranceEnabled : false;
    }
    if (data.toleranceMin !== undefined) {
      payload.toleranceMin = canTolerance
        ? data.toleranceMin
        : company.toleranceMin;
    }
  }

  if (data.defaultLocale !== undefined) {
    payload.defaultLocale = data.defaultLocale === "en" ? "en" : "pt-BR";
  }

  if (data.contactWhatsapp !== undefined) {
    const digits = data.contactWhatsapp.replace(/\D/g, "");
    payload.contactWhatsapp = digits || FieldValue.delete();
  }

  if (data.brand !== undefined) {
    const canLogo = canUseWhiteLabelLevel(company, "logo");
    const canFull = canUseWhiteLabelLevel(company, "full");
    const brand: CompanyBrand = {
      accentColor: canLogo
        ? data.brand.accentColor ?? company.brand?.accentColor
        : company.brand?.accentColor,
      logoUrl: canLogo
        ? data.brand.logoUrl ?? company.brand?.logoUrl
        : company.brand?.logoUrl,
      tagline: canFull
        ? data.brand.tagline ?? company.brand?.tagline
        : company.brand?.tagline,
    };
    payload.brand = serializeBrand(brand);
  }

  if (data.legal !== undefined) {
    const serialized = serializeLegal(data.legal);
    payload.legal =
      Object.keys(serialized).length > 0 ? serialized : FieldValue.delete();
  }

  if (Object.keys(payload).length === 0) return;

  const shouldSyncPublicQueue = affectsClientVisibleFields(payload);

  await db.doc(`companies/${companyId}`).update(payload);

  if (!shouldSyncPublicQueue) return;

  const updatedSnap = await db.doc(`companies/${companyId}`).get();
  if (!updatedSnap.exists) return;

  const updatedCompany = mapCompanyFromAdminData(companyId, updatedSnap.data()!);
  await syncPublicQueueBrandingServer(db, companyId, updatedCompany);
}
