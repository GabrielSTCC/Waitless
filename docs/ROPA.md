# ROPA — Registro de Operações de Tratamento (Waitless)

Última atualização: **12/06/2026**  
Controlador/Operador e Encarregado: definidos via variáveis `NEXT_PUBLIC_LEGAL_*` em produção (ver [`src/lib/legal/config.ts`](../src/lib/legal/config.ts)).

## Operações de tratamento

| Operação | Dados | Titulares | Finalidade | Base legal | Retenção | Operador |
|----------|-------|-----------|------------|------------|----------|----------|
| Site institucional | IP, logs, cookies | Visitantes | Operação, segurança, consentimento | Legítimo interesse / consentimento | Ver Política de Cookies | Vercel |
| Cadastro e auth admin | E-mail, senha (hash Firebase), Google ID | Dono, equipe | Conta e acesso ao painel | Execução de contrato | Conta ativa + obrigações legais | Firebase Auth |
| Dados da empresa | Razão social, CNPJ, logo, branding | Estabelecimento | Identificação controlador, white-label | Execução de contrato / obrigação legal | Conta ativa | Firebase Firestore/Storage |
| Mini-CRM / clientes | Nome, WhatsApp, histórico visitas | Clientes finais do estabelecimento | Fila e relacionamento | Controlador (estabelecimento) — operadora Waitless | Conta ativa; exclusão sob pedido | Firebase Firestore |
| Fila pública | Nome, posição, ETA, token | Clientes na fila | Acompanhamento em tempo real | Execução de contrato (estabelecimento) | Sessão da fila / conclusão atendimento | Firebase Firestore |
| Convites equipe | E-mail, papel | Convidados | Gestão de acesso | Execução de contrato | Até aceite ou revogação | Firebase Firestore |
| 2FA por e-mail | E-mail, código OTP | Admin com 2FA | Segurança da conta | Legítimo interesse | Minutos (OTP) | Resend |
| WhatsApp API (opcional) | Telefone, mensagens fila | Clientes | Notificação posição | Execução de contrato (estabelecimento) | Conforme Meta + estabelecimento | Meta |
| Exclusão de conta | Todos os dados do tenant | Estabelecimento | Direito de eliminação | Art. 18 LGPD | Imediato pós-confirmação | Firebase + Cloud Function |

## Transferências internacionais

Firebase (Google Cloud) e Vercel podem processar dados nos EUA. Cláusulas contratuais padrão (SCC) dos provedores aplicáveis via DPA.

## Medidas de segurança

HTTPS, RBAC, Firestore/Storage rules, 2FA opcional, validação server-side, headers de segurança, exclusão programada de tenant.

## Revisão

Revisar anualmente ou quando houver nova integração, coleta de dado sensível ou incidente de segurança.
