import type { LegalConfig } from "@/lib/legal/config";
import { formatControllerIdentification } from "@/lib/legal/config";
import type { LegalDocument } from "@/lib/legal/types";

export function getPrivacyDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Privacy Policy",
    description: "How Waitless processes personal data of businesses, staff, and end customers.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "controlador",
        title: "1. Controller and contact",
        paragraphs: [
          `This Privacy Policy describes how ${config.legalName}, holder of CPF ${config.cpf}, hereinafter referred to as "${config.controllerRole === "Controlador/Operador" ? "Controller/Operator" : config.controllerRole}", collects, stores and processes the personal data of users of the ${config.productName.toUpperCase()} platform.`,
          `Address: ${config.address}.`,
          `Data Protection Officer (DPO): ${config.dpoName} — ${config.lgpdEmail}.`,
          `Product: ${config.productName} (${config.productionUrl}).`,
        ],
      },
      {
        id: "escopo",
        title: "2. Scope and roles",
        paragraphs: [
          `${config.legalName}, as ${config.controllerRole === "Controlador/Operador" ? "Controller/Operator" : config.controllerRole} of the Waitless platform, processes data of subscribing businesses, teams and technical operation data.`,
          "Each subscribing business remains controller of its end customers' data (name, WhatsApp, queue history). The platform processes that data under the business's instructions.",
          "This policy covers the marketing site, admin dashboard, public customer queue, and optional integrations (WhatsApp, email).",
        ],
      },
      {
        id: "dados",
        title: "3. Personal data processed",
        list: [
          "Business: legal name, CNPJ, name, email, access credentials, logo and brand settings.",
          "Team: email, role (Owner, Admin, Base), pending invites.",
          "End customers: name, WhatsApp, queue position, visit history and wait time.",
          "Technical: IP, access logs, session cookies and preferences (language, theme, consent).",
        ],
        paragraphs: [],
      },
      {
        id: "google-signin",
        title: "3.1. Sign in with Google (OAuth)",
        paragraphs: [
          "When you use \"Sign in with Google\" in the admin dashboard, we receive from Google LLC the data required for authentication: name, email address, unique Google account identifier and profile photo (when available).",
          "Purpose: create and maintain your access session, identify your account and link you to the corresponding business or invite.",
          "Legal basis: contract performance or pre-contractual steps (LGPD Art. 7, V) and legitimate interest in account security (Art. 7, IX).",
          "Google processes this data under Google's Privacy Policy (https://policies.google.com/privacy). You can revoke Waitless access to your Google account in Google's security settings.",
        ],
      },
      {
        id: "finalidades",
        title: "4. Purposes and legal bases",
        list: [
          "Queue and Mini-CRM service — contract performance (LGPD Art. 7, V).",
          "Authentication, security and fraud prevention — legitimate interest (Art. 7, IX).",
          "Operational communication (queue links, email 2FA) — contract performance.",
          "Non-essential cookies — consent (Art. 7, I), when applicable.",
          "Legal compliance and data subject requests — legal obligation (Art. 7, II).",
        ],
        paragraphs: [],
      },
      {
        id: "terceiros",
        title: "5. Processors and transfers",
        paragraphs: [
          `We share data with operators required for operation: ${config.operators}.`,
          "We do not sell personal data. International transfers follow standard contractual clauses of providers (DPA/SCC when applicable).",
        ],
      },
      {
        id: "retencao",
        title: "6. Retention",
        list: [
          "Queue and CRM data: while the business account is active; deletion on request or account closure.",
          "Server logs: up to 30 days, unless incident investigation requires longer.",
          "Preference cookies: up to 12 months or until revoked.",
          "Tax/contractual data: applicable legal periods.",
        ],
        paragraphs: [],
      },
      {
        id: "direitos",
        title: "7. Data subject rights (Art. 18)",
        paragraphs: [
          `You may request confirmation, access, correction, anonymization, portability, deletion, sharing information and consent withdrawal via ${config.lgpdEmail} (subject: "LGPD Request") or at ${config.productionUrl}/canal-lgpd.`,
          "Response time: up to 15 days, extendable under LGPD.",
        ],
      },
      {
        id: "seguranca",
        title: "8. Security",
        paragraphs: [
          "HTTPS in transit, encryption at rest on managed services (Firebase), role-based access (RBAC), optional two-factor authentication for administrators, Firestore/Storage security rules and server-side validation on sensitive APIs.",
        ],
      },
      {
        id: "alteracoes",
        title: "9. Changes",
        paragraphs: [
          "This policy may be updated. The last revision date is shown at the top. Material changes will be communicated by email or in-dashboard notice.",
        ],
      },
    ],
  };
}

export function getTermsDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Terms of Use",
    description: "Conditions for using the Waitless platform.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "partes",
        title: "1. Parties and acceptance",
        paragraphs: [
          `These Terms govern use of ${config.productName}, provided by ${formatControllerIdentification(config)}.`,
          "By creating an account or using the service, you declare that you have read and accepted these Terms and the Privacy Policy.",
        ],
      },
      {
        id: "servico",
        title: "2. Service description",
        paragraphs: [
          "Waitless enables real-time queue management, customer registration (Mini-CRM), tracking link delivery and branded customer experience.",
          "Features may evolve; beta or optional features may have limited availability.",
        ],
      },
      {
        id: "conta",
        title: "3. Account and responsibilities",
        list: [
          "The Owner user is responsible for data processed about end customers and for the business's LGPD compliance.",
          "Credentials are personal and non-transferable; notify us of unauthorized use.",
          "Unlawful use, spam, abusive data collection or unauthorized access attempts are prohibited.",
        ],
        paragraphs: [],
      },
      {
        id: "propriedade",
        title: "4. Intellectual property",
        paragraphs: [
          "The platform, code, Waitless brand and documentation belong to the controller. The business retains rights to its data, logo and uploaded content.",
        ],
      },
      {
        id: "disponibilidade",
        title: "5. Availability and limitation",
        paragraphs: [
          "We use reasonable efforts to keep the service available, without guarantee of uninterrupted uptime. Scheduled maintenance will be communicated when possible.",
          "To the extent permitted by law, we are not liable for lost profits or indirect damages from unavailability or misuse by third parties.",
        ],
      },
      {
        id: "cdc",
        title: "6. Consumer relations (Brazilian CDC)",
        paragraphs: [
          `Provider identification: ${formatControllerIdentification(config)}. Contact: ${config.lgpdEmail}.`,
          "Businesses qualifying as end consumers of the SaaS have rights under the Brazilian Consumer Defense Code, including clear information about the contracted service.",
        ],
      },
      {
        id: "foro",
        title: "7. Jurisdiction",
        paragraphs: [
          "The courts of the controller's headquarters are elected, except mandatory consumer protection rules.",
        ],
      },
    ],
  };
}

export function getCookiesDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Cookie Policy",
    description: "How we use cookies and similar technologies on Waitless.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "intro",
        title: "1. What are cookies",
        paragraphs: [
          "Cookies and local storage are used to maintain session, preferences and, with your consent, additional features. Processing that identifies or allows identifying you is personal data under LGPD.",
        ],
      },
      {
        id: "categorias",
        title: "2. Categories we use",
        list: [
          "Necessary: Firebase authentication, security, load balancing — no consent required.",
          "Functional: language, theme, text scale, motion preference — consent recommended.",
          "Analytics: aggregated usage metrics (e.g. Vercel Analytics) — consent only; currently disabled by default.",
          "Marketing: Google Ads (gtag) for campaign measurement on /comprar — consent only.",
        ],
        paragraphs: [],
      },
      {
        id: "lista",
        title: "3. Current technologies",
        list: [
          "Firebase Auth session cookies — necessary — login session.",
          "waitless-cookie-consent (localStorage) — necessary — your cookie choice record.",
          "waitless-locale / waitless-motion-pref / waitless-text-scale — functional — interface preferences.",
          "next-themes — functional — light/dark theme.",
          "Google Ads (gtag.js) — marketing — campaign conversion measurement on /comprar, with consent.",
        ],
        paragraphs: [
          "Typography (Inter, Poppins) is served locally via Next.js, without external Google Fonts CDN.",
        ],
      },
      {
        id: "gerenciar",
        title: "4. How to manage",
        paragraphs: [
          "Use the cookie banner or reopen preferences from the footer link. You can accept, reject or customize optional categories.",
          "Revoking consent does not affect cookies strictly necessary for login.",
          `Questions: ${config.lgpdEmail}.`,
        ],
      },
    ],
  };
}

export function getContactDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Contact and Support",
    description: "Official Waitless contact channels.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "suporte",
        title: "1. Customer support",
        paragraphs: [
          `For questions about the product, plans, billing or platform usage, email ${config.supportEmail}.`,
          "Business hours: weekdays, 9am–6pm (Brasília time). We will respond as soon as possible.",
        ],
      },
      {
        id: "lgpd",
        title: "2. Privacy and LGPD",
        paragraphs: [
          `For personal data requests, use ${config.lgpdEmail} (subject: "LGPD Request") or visit ${config.productionUrl}/canal-lgpd.`,
        ],
      },
      {
        id: "legal",
        title: "3. Identification",
        paragraphs: [
          `${formatControllerIdentification(config)}.`,
          `Data Protection Officer: ${config.dpoName} — ${config.lgpdEmail}.`,
        ],
      },
    ],
  };
}

export function getLgpdChannelDocument(config: LegalConfig): LegalDocument {
  return {
    title: "LGPD Channel — Data Subject Rights",
    description: "How to exercise your rights under LGPD Art. 18.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "direitos",
        title: "1. Your rights",
        list: [
          "Confirmation of processing.",
          "Access to personal data.",
          "Correction of incomplete, inaccurate or outdated data.",
          "Anonymization, blocking or deletion of unnecessary or non-compliant data.",
          "Portability to another provider.",
          "Deletion of consent-based data.",
          "Information about sharing.",
          "Consent withdrawal.",
        ],
        paragraphs: [],
      },
      {
        id: "como",
        title: "2. How to request",
        paragraphs: [
          `Email ${config.lgpdEmail} with subject "LGPD Request" / "Solicitação LGPD".`,
          "Include: full name, account email (if any), request description and ID document when needed for verification.",
          "End customers of businesses should preferably contact the business (controller) directly. We will forward requests to the appropriate controller.",
        ],
      },
      {
        id: "prazo",
        title: "3. Timelines",
        paragraphs: [
          "We will respond within 15 days, extendable by 15 days with justification, under LGPD Art. 18, §4.",
        ],
      },
      {
        id: "dpo",
        title: "4. Data Protection Officer",
        paragraphs: [
          `${config.dpoName} — ${config.lgpdEmail}.`,
          "The DPO guides staff, assists data subjects and interacts with ANPD when required.",
        ],
      },
    ],
  };
}
