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
import type { CompanyBrand, CompanyLegal } from "@/lib/types";

export const runtime = "nodejs";

function parseCompanyUpdate(body: Record<string, unknown>): CompanyUpdateInput | undefined {
  const company = body.company;
  if (!company || typeof company !== "object") return undefined;

  const raw = company as Record<string, unknown>;
  const brandRaw = raw.brand;
  const legalRaw = raw.legal;

  let brand: CompanyBrand | undefined;
  if (brandRaw && typeof brandRaw === "object") {
    const b = brandRaw as Record<string, unknown>;
    brand = {
      accentColor: typeof b.accentColor === "string" ? b.accentColor : undefined,
      logoUrl: typeof b.logoUrl === "string" ? b.logoUrl : undefined,
      tagline: typeof b.tagline === "string" ? b.tagline : undefined,
    };
  }

  let legal: CompanyLegal | undefined;
  if (legalRaw && typeof legalRaw === "object") {
    const l = legalRaw as Record<string, unknown>;
    legal = {
      cnpj: typeof l.cnpj === "string" ? l.cnpj : undefined,
      legalName: typeof l.legalName === "string" ? l.legalName : undefined,
    };
  }

  return {
    name: typeof raw.name === "string" ? raw.name : undefined,
    avgServiceTimeMin:
      typeof raw.avgServiceTimeMin === "number" ? raw.avgServiceTimeMin : undefined,
    toleranceEnabled:
      typeof raw.toleranceEnabled === "boolean" ? raw.toleranceEnabled : undefined,
    toleranceMin: typeof raw.toleranceMin === "number" ? raw.toleranceMin : undefined,
    defaultLocale: raw.defaultLocale === "en" ? "en" : raw.defaultLocale === "pt-BR" ? "pt-BR" : undefined,
    contactWhatsapp:
      typeof raw.contactWhatsapp === "string" ? raw.contactWhatsapp : undefined,
    brand,
    legal,
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
    if (error instanceof CompanyAccessError) {
      const status =
        error.code === "not_found" ? 404 : error.code === "not_member" ? 403 : 403;
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
}
