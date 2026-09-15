import { getPublicAppBaseUrl } from "@/lib/utils/app-url";

export interface LegalConfig {
  productName: string;
  systemType: string;
  stack: string;
  productionUrl: string;
  legalName: string;
  cpf: string;
  controllerRole: string;
  cnpj: string;
  address: string;
  lgpdEmail: string;
  supportEmail: string;
  dpoName: string;
  operators: string;
  policyUpdatedAt: string;
  auditDate: string;
  technicalLead: string;
}

/** Next só embute NEXT_PUBLIC_* no client com acesso estático (não process.env[key]). */
function publicEnv(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

export function formatControllerIdentification(config: LegalConfig): string {
  return `${config.legalName}, CPF ${config.cpf}, ${config.address}`;
}

export function getLegalConfig(): LegalConfig {
  const lgpdEmail = publicEnv(
    process.env.NEXT_PUBLIC_LEGAL_EMAIL_LGPD,
    "seu-email@exemplo.com",
  );

  return {
    productName: "Waitless",
    systemType: "SaaS B2B — fila de espera inteligente com Mini-CRM",
    stack: "Next.js 16 · React 19 · Firebase (Auth, Firestore, Storage) · Vercel",
    productionUrl: getPublicAppBaseUrl() || "https://www.waitless.solutions",
    legalName: publicEnv(
      process.env.NEXT_PUBLIC_LEGAL_RAZAO_SOCIAL,
      "Controlador Waitless",
    ),
    cpf: publicEnv(process.env.NEXT_PUBLIC_LEGAL_CPF, "000.000.000-00"),
    controllerRole: publicEnv(
      process.env.NEXT_PUBLIC_LEGAL_CONTROLLER_ROLE,
      "Controlador/Operador",
    ),
    cnpj: publicEnv(process.env.NEXT_PUBLIC_LEGAL_CNPJ, ""),
    address: publicEnv(
      process.env.NEXT_PUBLIC_LEGAL_ADDRESS,
      "Endereço não configurado",
    ),
    lgpdEmail,
    supportEmail: publicEnv(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, lgpdEmail),
    dpoName: publicEnv(
      process.env.NEXT_PUBLIC_LEGAL_DPO_NAME,
      "Encarregado Waitless",
    ),
    operators:
      "Vercel (hospedagem), Google Firebase (auth, banco, storage), Resend (e-mail 2FA), Meta/WhatsApp Business API (opcional)",
    policyUpdatedAt: "12/06/2026",
    auditDate: "12/06/2026",
    technicalLead: publicEnv(
      process.env.NEXT_PUBLIC_LEGAL_TECH_LEAD,
      "Responsável técnico Waitless",
    ),
  };
}
