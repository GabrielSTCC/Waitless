# Procedimento — Direitos do Titular (Art. 18 LGPD)

Versão: 1.1 · 12/06/2026  
Canal: e-mail configurado em `NEXT_PUBLIC_LEGAL_EMAIL_LGPD` · Assunto: **Solicitação LGPD**  
Página pública: `/canal-lgpd`

## 1. Escopo

Este procedimento atende solicitações de titulares sobre dados tratados pela plataforma Waitless como **controladora** (dados de estabelecimentos e equipe) ou **operadora** (dados de clientes finais dos estabelecimentos).

## 2. Tipos de solicitação

- Confirmação e acesso
- Correção
- Anonimização, bloqueio ou eliminação
- Portabilidade
- Informação sobre compartilhamento
- Revogação de consentimento (cookies, marketing)

## 3. Fluxo interno

1. **Recebimento** — E-mail ou formulário via `/canal-lgpd`; registrar data e protocolo interno.
2. **Identificação** — Confirmar identidade (e-mail da conta, documento quando necessário).
3. **Classificação** — Controladora direta vs. encaminhar ao estabelecimento (clientes finais).
4. **Execução** — Prazo alvo: **15 dias** (prorrogável +15 com justificativa).
5. **Resposta** — E-mail formal com resultado; manter registro no ROPA/incident log se aplicável.

## 4. Ações técnicas por tipo

| Pedido | Ação Waitless |
|--------|---------------|
| Acesso | Exportar dados Firestore/Auth do titular ou tenant |
| Correção | Atualizar via painel ou suporte |
| Eliminação conta | Fluxo `/admin/account` → exclusão (Cloud Function) |
| Cookies | Revogar via banner; limpar localStorage de preferências |
| Portabilidade | Export JSON/CSV de clientes e configurações |

## 5. Encaminhamento (clientes finais)

Se o titular for cliente de um estabelecimento usuário do Waitless:

1. Informar que o **estabelecimento é controlador**.
2. Encaminhar solicitação ao e-mail cadastrado do Dono, se autorizado pelo titular.
3. Auxiliar o estabelecimento na exportação/exclusão via ferramentas do painel.

## 6. Recusa fundamentada

Registrar motivo legal (ex.: dado necessário para cumprimento de obrigação legal, exercício de direito em processo).

## 7. Contato de emergência (incidentes)

Encarregado (DPO): definido via `NEXT_PUBLIC_LEGAL_DPO_NAME` e `NEXT_PUBLIC_LEGAL_EMAIL_LGPD` em produção.
Ver também: `docs/AUDITORIA_LGPD.md` § Plano de incidentes.
