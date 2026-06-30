import type { LegalConfig } from "@/lib/legal/config";
import type { HelpDocument } from "@/lib/help/types";

export function getHelpDocument(config: LegalConfig): HelpDocument {
  return {
    title: "Central de Ajuda",
    description:
      "Guia do Waitless para operar a fila, gerenciar clientes e configurar seu estabelecimento.",
    categories: [
      {
        id: "getting-started",
        title: "Primeiros passos",
        description: "Comece a usar o Waitless em poucos minutos.",
        items: [
          {
            id: "what-is-waitless",
            question: "O que é o Waitless?",
            answer:
              "O Waitless é uma fila de espera inteligente para estabelecimentos físicos — clínicas, restaurantes, salões e similares. A recepção gerencia a fila no painel; o cliente final acompanha posição e tempo estimado pelo celular, via link enviado no WhatsApp, sem instalar app.",
          },
          {
            id: "onboarding",
            question: "Como começo depois de criar a conta?",
            answer:
              "Após o cadastro ou login com Google, complete o onboarding com o nome do estabelecimento. Em seguida, acesse a Fila no painel, adicione seu primeiro cliente e envie o link pelo WhatsApp. Configure marca, tempo médio e equipe em Configurações quando quiser.",
          },
          {
            id: "roles",
            question: "Quais são os papéis da equipe?",
            answer:
              "Dono — controle total, gestão de equipe, assinatura e exclusão do estabelecimento. Admin — fila, clientes, analytics e configurações operacionais. Base — fila, clientes e cadastro de novos clientes na fila. A sidebar exibe apenas as telas permitidas ao seu papel.",
          },
        ],
      },
      {
        id: "queue",
        title: "Operação da fila",
        description: "Dia a dia na recepção.",
        items: [
          {
            id: "add-customer",
            question: "Como adiciono um cliente à fila?",
            answer:
              "Use o botão \"Adicionar cliente\" na sidebar ou a busca rápida no topo da Fila. Informe nome e WhatsApp. O cliente entra na coluna Aguardando e recebe um link único para acompanhar a posição.",
          },
          {
            id: "kanban",
            question: "Como funciona o kanban Aguardando / Em Atendimento?",
            answer:
              "Aguardando lista quem está na fila por ordem de chegada. Ao clicar em Iniciar, o cliente vai para Em Atendimento. Ao Finalizar, o atendimento é registrado no histórico e o cliente vê \"Atendimento concluído\" na tela dele antes de sair.",
          },
          {
            id: "live-badge",
            question: "O que significa o badge Ao Vivo?",
            answer:
              "Indica que o painel está sincronizado em tempo real com o Firestore. Alterações na fila (iniciar, finalizar, desistências) aparecem instantaneamente para a recepção e para o cliente no link da fila.",
          },
          {
            id: "whatsapp-link",
            question: "Como envio o link da fila pelo WhatsApp?",
            answer:
              "No card do cliente em Aguardando, use o botão de WhatsApp. Abre uma conversa wa.me com mensagem pronta contendo o link da fila. Se a WhatsApp Business API estiver habilitada no plano Pro, também há envio automático via API.",
          },
          {
            id: "tolerance",
            question: "O que é tolerância?",
            answer:
              "Quando o cliente é o próximo da fila, inicia uma contagem regressiva (configurável em Configurações). Se não comparecer dentro desse prazo, ele pode ser removido automaticamente e a vaga liberada para realocação. Disponível apenas no plano Pro.",
          },
          {
            id: "spot-offer",
            question: "O que é realocação de vaga (Vaga aberta)?",
            answer:
              "Quando alguém desiste ou não comparece na tolerância, o Waitless oferece a vaga sequencialmente aos próximos da fila. O painel exibe \"Vaga aberta\" e o cliente recebe alerta no link para aceitar ou recusar. Recurso exclusivo do plano Pro.",
          },
        ],
      },
      {
        id: "client-experience",
        title: "Experiência do cliente",
        description: "O que acontece no link /q/{token}.",
        items: [
          {
            id: "client-screen",
            question: "O que o cliente vê no link da fila?",
            answer:
              "Posição na fila, tempo estimado de espera (ETA), nome do estabelecimento (e logo/cor nos planos pagos) e alertas quando estiver próximo da vez. Tudo atualiza em tempo real, sem login.",
          },
          {
            id: "no-app",
            question: "O cliente precisa instalar app ou criar conta?",
            answer:
              "Não. Basta abrir o link recebido no WhatsApp no navegador do celular. O link é único por entrada na fila.",
          },
          {
            id: "client-leave",
            question: "O cliente pode desmarcar da fila?",
            answer:
              "Sim. Na tela da fila há a opção \"Desmarcar da fila\". O cliente pode optar por avisar o estabelecimento via WhatsApp ao sair.",
          },
        ],
      },
      {
        id: "mini-crm",
        title: "Mini-CRM",
        description: "Histórico e reentrada de clientes.",
        items: [
          {
            id: "search",
            question: "Como busco um cliente?",
            answer:
              "Na Fila, use a barra de busca por nome ou WhatsApp (com debounce de 300 ms). Na página Clientes, veja todos os cadastros ordenados pela última visita.",
          },
          {
            id: "customers-page",
            question: "Para que serve a página Clientes?",
            answer:
              "Lista clientes já atendidos com nome, WhatsApp e número de visitas. Use \"Entrar na fila\" para recolocar alguém sem redigitar os dados.",
          },
          {
            id: "duplicate",
            question: "Posso colocar o mesmo cliente duas vezes na fila?",
            answer:
              "Não. O Waitless impede duplicatas — se o cliente já está Aguardando ou Em Atendimento, você verá um aviso ao tentar adicioná-lo novamente.",
          },
        ],
      },
      {
        id: "branding",
        title: "Marca e configurações",
        description: "White-label e parâmetros operacionais.",
        items: [
          {
            id: "white-label",
            question: "Como personalizo a tela do cliente?",
            answer:
              "Em Configurações → Marca: nome do estabelecimento, tagline, cor de destaque (validada para contraste WCAG) e logo por URL ou upload. A pré-visualização mostra como o cliente verá a fila.",
          },
          {
            id: "avg-time",
            question: "Como o tempo médio afeta o ETA?",
            answer:
              "O tempo médio de atendimento (em minutos) multiplicado pela posição na fila gera a estimativa exibida ao cliente. Ajuste conforme a operação real do seu negócio.",
          },
          {
            id: "whatsapp-api",
            question: "O que é a WhatsApp Business API?",
            answer:
              "Integração opcional no plano Pro para envio de mensagens pela API da Meta, além do link wa.me manual. Requer credenciais configuradas pelo operador da plataforma.",
          },
        ],
      },
      {
        id: "team",
        title: "Equipe",
        description: "Convites e permissões.",
        items: [
          {
            id: "invite",
            question: "Como convido membros da equipe?",
            answer:
              "Somente o Dono pode convidar em Configurações → Equipe. Informe o e-mail e escolha Admin ou Base. O convidado acessa o link /admin/invite/{id} para aceitar.",
          },
          {
            id: "permissions",
            question: "Quem acessa analytics, configurações e conta?",
            answer:
              "Analytics e Configurações: Dono e Admin. Conta (assinatura, CNPJ, exclusão): apenas Dono. Fila e Clientes: todos os papéis.",
          },
        ],
      },
      {
        id: "billing",
        title: "Planos e cobrança",
        description: "Limites e assinatura.",
        items: [
          {
            id: "plans",
            question: "Quais são os planos e limites?",
            answer:
              "Teste 14 dias — até 80 atendimentos/mês e 2 usuários (somente leitura após o teste sem assinatura). Essencial — até 600 atendimentos/mês, 5 usuários, logo/cor e analytics básico. Pro — atendimentos ilimitados (fair use 3.000/mês), usuários ilimitados, tolerância, realocação de vaga e analytics completo.",
          },
          {
            id: "subscription",
            question: "Onde gerencio minha assinatura?",
            answer:
              "O Dono acessa Conta no painel para ver plano atual, alterar assinatura via Stripe e gerenciar pagamento. Demais membros não veem esta tela.",
          },
          {
            id: "support-plans",
            question: "Qual a diferença de suporte entre planos?",
            answer:
              "Todos os planos usam o mesmo canal de suporte por e-mail. Detalhes de contato estão na seção Falar com suporte abaixo.",
          },
        ],
      },
      {
        id: "security",
        title: "Segurança e privacidade",
        description: "Conta, 2FA e LGPD.",
        items: [
          {
            id: "2fa",
            question: "Como ativo a verificação em duas etapas (2FA)?",
            answer:
              "Em Segurança, ative 2FA por e-mail. Nos próximos logins, um código OTP será enviado antes de acessar o painel. Você pode marcar aparelhos confiáveis para pular o código por 30 dias.",
          },
          {
            id: "password",
            question: "Posso usar senha e Google na mesma conta?",
            answer:
              "Sim. Em Segurança você vê os métodos de login ativos e pode definir ou alterar senha mesmo tendo entrado antes com Google.",
          },
          {
            id: "lgpd",
            question: "Como exercer direitos LGPD (acesso, exclusão, etc.)?",
            answer:
              `Solicitações sobre dados pessoais devem ser feitas pelo Canal LGPD em ${config.productionUrl}/canal-lgpd ou por e-mail para ${config.lgpdEmail} com assunto \"Solicitação LGPD\". Prazo de resposta: até 15 dias.`,
          },
        ],
      },
    ],
    contact: {
      title: "Falar com suporte",
      paragraphs: [
        `Use o botão abaixo para abrir o formulário de suporte. Incluímos automaticamente o nome do estabelecimento e a referência da conta — você também pode usar \"Copiar ref.\" na página Conta (Dono) se precisar informar o identificador em outro canal.`,
        "Para direitos do titular de dados (LGPD), use o Canal LGPD — não o e-mail de suporte operacional.",
      ],
      emailLabel: "Enviar e-mail ao suporte",
      lgpdLinkLabel: "Canal LGPD",
    },
  };
}
