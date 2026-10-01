import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadMemberAccess, CompanyAccessError } from "@/lib/company/company-access-server";
import {
  updateCompanyServer,
  type CompanyUpdateInput,
} from "@/lib/company/update-company-server";
import {
  applyTeamChangesServer,
  type TeamRoleUpdate,
} from "@/lib/company/update-team-server";
import {
  CompanyNameTakenError,
  InvalidCompanyNameError,
} from "@/lib/utils/company-slug";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { normalizeBusinessHours } from "@/lib/appointments/hours";
import { parseServiceMode } from "@/lib/appointments/parse-company";
import type { CompanyBrand, CompanyLegal } from "@/lib/types";

export const runtime = "nodejs";

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseBrand(brandRaw: unknown): CompanyBrand | undefined {
  if (!brandRaw || typeof brandRaw !== "object") return undefined;
  const brand = brandRaw as Record<string, unknown>;
  return {
    accentColor: optionalString(brand.accentColor),
    logoUrl: optionalString(brand.logoUrl),
    tagline: optionalString(brand.tagline),
  };
}

function parseLegal(legalRaw: unknown): CompanyLegal | undefined {
  if (!legalRaw || typeof legalRaw !== "object") return undefined;
  const legal = legalRaw as Record<string, unknown>;
  return {
    cnpj: optionalString(legal.cnpj),
    legalName: optionalString(legal.legalName),
  };
}

function parseOptionalServiceMode(value: unknown) {
  if (value !== "single" && value !== "per_professional" && value !== "pool") return undefined;
  return parseServiceMode(value);
}

function parseOptionalLocale(value: unknown): CompanyUpdateInput["defaultLocale"] {
  if (value === "en" || value === "pt-BR") return value;
  return undefined;
}

function parseCompanyUpdate(body: Record<string, unknown>): CompanyUpdateInput | undefined {
  const company = body.company;
  if (!company || typeof company !== "object") return undefined;

  const raw = company as Record<string, unknown>;

  return {
    name: optionalString(raw.name),
    avgServiceTimeMin: optionalNumber(raw.avgServiceTimeMin),
    toleranceEnabled: optionalBoolean(raw.toleranceEnabled),
    toleranceMin: optionalNumber(raw.toleranceMin),
    defaultLocale: parseOptionalLocale(raw.defaultLocale),
    contactWhatsapp: optionalString(raw.contactWhatsapp),
    appointmentsEnabled: optionalBoolean(raw.appointmentsEnabled),
    serviceMode: parseOptionalServiceMode(raw.serviceMode),
    reminderLeadMin: optionalNumber(raw.reminderLeadMin),
    businessHours: raw.businessHours ? normalizeBusinessHours(raw.businessHours) : undefined,
    arrivalConfirmRequired: optionalBoolean(raw.arrivalConfirmRequired),
    arrivalConfirmOpenMin: optionalNumber(raw.arrivalConfirmOpenMin),
    arrivalConfirmDeadlineMin: optionalNumber(raw.arrivalConfirmDeadlineMin),
    autoJoinLeadMin: optionalNumber(raw.autoJoinLeadMin),
    minBookAheadMin: optionalNumber(raw.minBookAheadMin),
    maxBookAheadDays: optionalNumber(raw.maxBookAheadDays),
    slotBufferMin: optionalNumber(raw.slotBufferMin),
    brand: parseBrand(raw.brand),
    legal: parseLegal(raw.legal),
  };
}

function parseTeamChanges(body: Record<string, unknown>): {
  roleUpdates: TeamRoleUpdate[];
  removals: string[];
} {
  const team = body.team;
  if (!team || typeof team !== "object") {
    return { roleUpdates: [], removals: [] };
  }

  const raw = team as Record<string, unknown>;
  const roleUpdates = Array.isArray(raw.roleUpdates)
    ? raw.roleUpdates
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          userId: typeof item.userId === "string" ? item.userId : "",
          role: item.role === "admin" ? ("admin" as const) : ("base" as const),
        }))
        .filter((item) => item.userId.length > 0)
    : [];

  const removals = Array.isArray(raw.removals)
    ? raw.removals.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  return { roleUpdates, removals };
}

function settingsErrorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    const status = error.code === "not_found" ? 404 : 403;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  if (error instanceof CompanyNameTakenError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "company/name-already-in-use",
        slug: error.slug,
      },
      { status: 409 },
    );
  }

  if (error instanceof InvalidCompanyNameError) {
    return NextResponse.json(
      { error: error.message, code: "company/invalid-name" },
      { status: 400 },
    );
  }

  if (isCredentialError(error)) {
    return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
  }

  console.error("[company/settings]", error);
  return NextResponse.json(
    { error: "Não foi possível salvar as configurações." },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const companyUpdate = parseCompanyUpdate(body);
    const { roleUpdates, removals } = parseTeamChanges(body);

    if (!companyUpdate && roleUpdates.length === 0 && removals.length === 0) {
      return NextResponse.json({ error: "Nenhuma alteração informada." }, { status: 400 });
    }

    const db = getAdminDb();
    const member = await loadMemberAccess(db, authResult.uid);
    const companyId = member.companyId;

    if (companyUpdate) {
      await updateCompanyServer(db, authResult.uid, companyId, companyUpdate);
    }

    if (roleUpdates.length > 0 || removals.length > 0) {
      await applyTeamChangesServer(
        db,
        authResult.uid,
        companyId,
        roleUpdates,
        removals,
      );
    }

    return NextResponse.json({ ok: true, companyId });
  } catch (error) {
    return settingsErrorResponse(error);
  }
}
