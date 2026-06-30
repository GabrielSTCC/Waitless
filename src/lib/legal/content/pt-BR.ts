import type { LegalConfig } from "@/lib/legal/config";
import { formatControllerIdentification } from "@/lib/legal/config";
import type { LegalDocument } from "@/lib/legal/types";

export function getPrivacyDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Política de Privacidade",
    description: "Como o Waitless trata dados pessoais de estabelecimentos, equipe e clientes finais.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "controlador",
        title: "1. Controlador e contato",
        paragraphs: [
          `Esta Política de Privacidade descreve como ${config.legalName}, portador do CPF ${config.cpf}, doravante denominado "${config.controllerRole}", coleta, armazena e trata os dados pessoais dos usuários da plataforma ${config.productName.toUpperCase()}.`,
          `Endereço: ${config.address}.`,
          `Encarregado (DPO): ${config.dpoName} — ${config.lgpdEmail}.`,
          `Produto: ${config.productName} (${config.productionUrl}).`,
        ],
      },
      {
        id: "escopo",
        title: "2. Escopo e papéis",
        paragraphs: [
          `${config.legalName}, na qualidade de ${config.controllerRole} da plataforma Waitless, trata os dados dos estabelecimentos contratantes, equipes e dados técnicos de operação.`,
          "Cada estabelecimento contratante permanece controlador dos dados de seus clientes finais (nome, WhatsApp, histórico de fila). A plataforma processa esses dados conforme instruções do estabelecimento.",
          "Esta política cobre o site institucional, painel administrativo, fila pública do cliente e integrações opcionais (WhatsApp, e-mail).",
        ],
      },
      {
        id: "dados",
        title: "3. Dados pessoais tratados",
        list: [
          "Estabelecimento: razão social, CNPJ, nome, e-mail, credenciais de acesso, logo e configurações de marca.",
          "Equipe: e-mail, papel (Dono, Admin, Base), convites pendentes.",
          "Clientes finais: nome, WhatsApp, posição na fila, histórico de visitas e tempo de espera.",
          "Técnicos: IP, logs de acesso, cookies de sessão e preferências (idioma, tema, consentimento).",
        ],
        paragraphs: [],
      },
      {
        id: "google-signin",
        title: "3.1. Login com Google (OAuth)",
        paragraphs: [
          "Ao usar \"Entrar com Google\" no painel administrativo, recebemos do Google LLC os dados necessários para autenticação: nome, endereço de e-mail, identificador único da conta Google e foto de perfil (quando disponível).",
          "Finalidade: criar e manter sua sessão de acesso, identificar sua conta e vincular você ao estabelecimento ou convite correspondente.",
          "Base legal: execução de contrato ou de procedimentos preliminares (Art. 7º, V, LGPD) e legítimo interesse em segurança da conta (Art. 7º, IX).",
          "O Google trata esses dados conforme a política de privacidade do Google (https://policies.google.com/privacy). Você pode revogar o acesso do Waitless à sua conta Google nas configurações de segurança do Google.",
        ],
      },
      {
        id: "finalidades",
        title: "4. Finalidades e bases legais",
        list: [
          "Prestação do serviço de fila e Mini-CRM — execução de contrato (Art. 7º, V, LGPD).",
          "Autenticação, segurança e prevenção a fraudes — legítimo interesse (Art. 7º, IX).",
          "Comunicação operacional (links de fila, 2FA por e-mail) — execução de contrato.",
          "Cookies não essenciais — consentimento (Art. 7º, I), quando aplicável.",
          "Cumprimento de obrigações legais e resposta a titulares — obrigação legal (Art. 7º, II).",
        ],
        paragraphs: [],
      },
      {
        id: "terceiros",
        title: "5. Operadores e transferências",
        paragraphs: [
          `Compartilhamos dados com operadores necessários à operação: ${config.operators}.`,
          "Não vendemos dados pessoais. Transferências internacionais seguem cláusulas contratuais padrão dos provedores (DPA/SCC quando aplicável).",
        ],
      },
      {
        id: "retencao",
        title: "6. Retenção",
        list: [
          "Dados da fila e CRM: enquanto a conta do estabelecimento estiver ativa; exclusão sob solicitação ou encerramento.",
          "Logs de servidor: até 30 dias, salvo investigação de incidente.",
          "Cookies de preferência: até 12 meses ou revogação.",
          "Dados fiscais/contratuais: prazos legais aplicáveis.",
        ],
        paragraphs: [],
      },
      {
        id: "direitos",
        title: "7. Direitos do titular (Art. 18)",
        paragraphs: [
          `Você pode solicitar confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento pelo canal ${config.lgpdEmail} (assunto: "Solicitação LGPD") ou em ${config.productionUrl}/canal-lgpd.`,
          "Prazo de resposta: até 15 dias, prorrogável conforme a LGPD.",
        ],
      },
      {
        id: "seguranca",
        title: "8. Segurança",
        paragraphs: [
          "HTTPS em trânsito, criptografia em repouso nos serviços gerenciados (Firebase), controle de acesso por papéis (RBAC), autenticação em dois fatores opcional para administradores, regras de segurança Firestore/Storage e validação server-side em APIs sensíveis.",
        ],
      },
      {
        id: "alteracoes",
        title: "9. Alterações",
        paragraphs: [
          "Esta política pode ser atualizada. A data da última revisão consta no topo. Mudanças relevantes serão comunicadas por e-mail ou aviso no painel.",
        ],
      },
    ],
  };
}

export function getTermsDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Termos de Uso",
    description: "Condições de uso da plataforma Waitless.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "partes",
        title: "1. Partes e aceite",
        paragraphs: [
          `Estes Termos regem o uso de ${config.productName}, oferecido por ${formatControllerIdentification(config)}.`,
          "Ao criar conta ou utilizar o serviço, você declara ter lido e aceito estes Termos e a Política de Privacidade.",
        ],
      },
      {
        id: "servico",
        title: "2. Descrição do serviço",
        paragraphs: [
          "O Waitless permite gerenciar filas de espera em tempo real, cadastrar clientes (Mini-CRM), enviar links de acompanhamento e personalizar a experiência com marca do estabelecimento.",
          "Funcionalidades podem evoluir; recursos beta ou opcionais podem ter disponibilidade limitada.",
        ],
      },
      {
        id: "conta",
        title: "3. Conta e responsabilidades",
        list: [
          "O usuário Dono é responsável pelos dados tratados sobre seus clientes finais e pela conformidade LGPD do estabelecimento.",
          "Credenciais são pessoais e intransferíveis; notifique-nos em caso de uso não autorizado.",
          "É proibido uso para fins ilícitos, spam, coleta abusiva de dados ou tentativa de acesso não autorizado.",
        ],
        paragraphs: [],
      },
      {
        id: "propriedade",
        title: "4. Propriedade intelectual",
        paragraphs: [
          "A plataforma, código, marca Waitless e documentação são de titularidade do controlador. O estabelecimento mantém direitos sobre seus dados, logo e conteúdo enviado.",
        ],
      },
      {
        id: "disponibilidade",
        title: "5. Disponibilidade e limitação",
        paragraphs: [
          "Empregamos esforços razoáveis para manter o serviço disponível, sem garantia de uptime ininterrupto. Manutenções programadas serão comunicadas quando possível.",
          "Na extensão permitida pela lei, não nos responsabilizamos por lucros cessantes ou danos indiretos decorrentes de indisponibilidade ou uso indevido por terceiros.",
        ],
      },
      {
        id: "cdc",
        title: "6. Relação de consumo (CDC)",
        paragraphs: [
          `Fornecedor identificado: ${formatControllerIdentification(config)}. Contato: ${config.lgpdEmail}.`,
          "Estabelecimentos enquadrados como consumidores finais do SaaS têm direitos previstos no Código de Defesa do Consumidor, incluindo informação clara sobre o serviço contratado.",
        ],
      },
      {
        id: "foro",
        title: "7. Foro",
        paragraphs: [
          "Fica eleito o foro da comarca da sede do controlador, salvo disposição legal imperativa em favor do consumidor.",
        ],
      },
    ],
  };
}

export function getCookiesDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Política de Cookies",
    description: "Como utilizamos cookies e tecnologias similares no Waitless.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "intro",
        title: "1. O que são cookies",
        paragraphs: [
          "Cookies e armazenamento local (localStorage) são usados para manter sessão, preferências e, com seu consentimento, funcionalidades adicionais. Tratamentos que identificam ou permitem identificar você são dados pessoais sob a LGPD.",
        ],
      },
      {
        id: "categorias",
        title: "2. Categorias utilizadas",
        list: [
          "Necessários: autenticação Firebase, segurança, balanceamento — não exigem consentimento.",
          "Funcionais: idioma, tema, escala de texto, preferência de movimento — consentimento recomendado.",
          "Analíticos: métricas de uso agregado (ex.: Vercel Analytics) — apenas com consentimento; atualmente desativados por padrão.",
          "Marketing: Google Ads (gtag) para medição de campanhas na página /comprar — apenas com consentimento.",
        ],
        paragraphs: [],
      },
      {
        id: "lista",
        title: "3. Tecnologias atuais",
        list: [
          "Cookies de sessão Firebase Auth — necessários — sessão de login.",
          "waitless-cookie-consent (localStorage) — necessários — registro da sua escolha de cookies.",
          "waitless-locale / waitless-motion-pref / waitless-text-scale — funcionais — preferências de interface.",
          "next-themes — funcionais — tema claro/escuro.",
          "Google Ads (gtag.js) — marketing — medição de conversões de campanha em /comprar, com consentimento.",
        ],
        paragraphs: [
          "Fontes tipográficas (Inter, Poppins) são servidas localmente via Next.js, sem CDN externo de Google Fonts.",
        ],
      },
      {
        id: "gerenciar",
        title: "4. Como gerenciar",
        paragraphs: [
          "Use o banner de cookies ou reabra as preferências pelo link no rodapé. Você pode aceitar, rejeitar ou personalizar categorias opcionais.",
          "Revogar consentimento não afeta cookies estritamente necessários ao funcionamento do login.",
          `Dúvidas: ${config.lgpdEmail}.`,
        ],
      },
    ],
  };
}

export function getContactDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Contato e Suporte",
    description: "Canais oficiais de contato do Waitless.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "suporte",
        title: "1. Suporte ao cliente",
        paragraphs: [
          `Para dúvidas sobre o produto, planos, faturamento ou uso da plataforma, envie e-mail para ${config.supportEmail}.`,
          "Horário de atendimento: dias úteis, das 9h às 18h (horário de Brasília). Responderemos o mais breve possível.",
        ],
      },
      {
        id: "lgpd",
        title: "2. Privacidade e LGPD",
        paragraphs: [
          `Para solicitações sobre dados pessoais, use ${config.lgpdEmail} (assunto: "Solicitação LGPD") ou acesse ${config.productionUrl}/canal-lgpd.`,
        ],
      },
      {
        id: "legal",
        title: "3. Identificação",
        paragraphs: [
          `${formatControllerIdentification(config)}.`,
          `Encarregado (DPO): ${config.dpoName} — ${config.lgpdEmail}.`,
        ],
      },
    ],
  };
}

export function getLgpdChannelDocument(config: LegalConfig): LegalDocument {
  return {
    title: "Canal LGPD — Direitos do Titular",
    description: "Como exercer seus direitos previstos no Art. 18 da LGPD.",
    lastUpdated: config.policyUpdatedAt,
    sections: [
      {
        id: "direitos",
        title: "1. Seus direitos",
        list: [
          "Confirmação da existência de tratamento.",
          "Acesso aos dados pessoais.",
          "Correção de dados incompletos, inexatos ou desatualizados.",
          "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.",
          "Portabilidade a outro fornecedor.",
          "Eliminação dos dados tratados com consentimento.",
          "Informação sobre compartilhamento.",
          "Revogação do consentimento.",
        ],
        paragraphs: [],
      },
      {
        id: "como",
        title: "2. Como solicitar",
        paragraphs: [
          `Envie e-mail para ${config.lgpdEmail} com assunto "Solicitação LGPD".`,
          "Informe: nome completo, e-mail da conta (se houver), descrição do pedido e documento de identificação quando necessário para confirmação.",
          "Clientes finais de estabelecimentos devem, preferencialmente, contatar diretamente o estabelecimento (controlador). Encaminharemos solicitações recebidas ao controlador adequado.",
        ],
      },
      {
        id: "prazo",
        title: "3. Prazos",
        paragraphs: [
          "Responderemos em até 15 dias, prorrogáveis por mais 15 dias mediante justificativa, conforme Art. 18, §4º da LGPD.",
        ],
      },
      {
        id: "dpo",
        title: "4. Encarregado (DPO)",
        paragraphs: [
          `${config.dpoName} — ${config.lgpdEmail}.`,
          "O encarregado orienta funcionários, atende titulares e interage com a ANPD quando necessário.",
        ],
      },
    ],
  };
}
