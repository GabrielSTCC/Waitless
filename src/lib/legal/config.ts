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

function env(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value || fallback;
}

export function formatControllerIdentification(config: LegalConfig): string {
  return `${config.legalName}, CPF ${config.cpf}, ${config.address}`;
}

export function getLegalConfig(): LegalConfig {
  return {
    productName: "Waitless",
    systemType: "SaaS B2B — fila de espera inteligente com Mini-CRM",
    stack: "Next.js 16 · React 19 · Firebase (Auth, Firestore, Storage) · Vercel",
    productionUrl: getPublicAppBaseUrl() || "https://www.waitless.solutions",
    legalName: env("NEXT_PUBLIC_LEGAL_RAZAO_SOCIAL", "Controlador Waitless"),
    cpf: env("NEXT_PUBLIC_LEGAL_CPF", "000.000.000-00"),
    controllerRole: env("NEXT_PUBLIC_LEGAL_CONTROLLER_ROLE", "Controlador/Operador"),
    cnpj: env("NEXT_PUBLIC_LEGAL_CNPJ", ""),
    address: env("NEXT_PUBLIC_LEGAL_ADDRESS", "Endereço não configurado"),
    lgpdEmail: env("NEXT_PUBLIC_LEGAL_EMAIL_LGPD", "seu-email@exemplo.com"),
    supportEmail: env(
      "NEXT_PUBLIC_SUPPORT_EMAIL",
      env("NEXT_PUBLIC_LEGAL_EMAIL_LGPD", "seu-email@exemplo.com"),
    ),
    dpoName: env("NEXT_PUBLIC_LEGAL_DPO_NAME", "Encarregado Waitless"),
    operators:
      "Vercel (hospedagem), Google Firebase (auth, banco, storage), Resend (e-mail 2FA), Meta/WhatsApp Business API (opcional)",
    policyUpdatedAt: "12/06/2026",
    auditDate: "12/06/2026",
    technicalLead: env("NEXT_PUBLIC_LEGAL_TECH_LEAD", "Responsável técnico Waitless"),
  };
}
