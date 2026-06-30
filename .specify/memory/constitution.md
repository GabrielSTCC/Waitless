<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: N/A (initial ratification)
- Added sections: Core Principles (5), Stack & Technical Constraints, Development Workflow & Quality Gates, Governance
- Removed sections: none
- Templates: plan-template.md ✅ updated | spec-template.md ✅ (no change needed) | tasks-template.md ✅ updated | specify-rules.mdc ✅ updated
- Follow-up TODOs: none
-->

# Waitless Constitution

## Core Principles

### I. Multi-Tenant & Real-Time First

Toda feature MUST respeitar isolamento por tenant (`companyId`) e usar Firestore
como fonte de verdade em tempo real.

- Dados de staff MUST ser escopados via `members/{uid}.companyId`; regras
  Firestore/Storage MUST ser atualizadas quando novas coleções ou campos forem
  introduzidos.
- Posição na fila, contadores e anti-duplicata MUST usar transações Firestore
  (padrão `meta/queue` + `activeWaiting/{clientId}`).
- Listeners MUST ser minimizados: no máximo 2 queries admin + 1 listener cliente
  por sessão, salvo justificativa documentada no plano.
- Sync de `publicQueue/{token}` MUST manter dados denormalizados consistentes
  com a fila interna.

**Rationale:** O produto depende de fila ao vivo confiável; falhas de tenant ou
consistência quebram a proposta de valor central.

### II. Zero-Friction Client Experience

A jornada do cliente final (`/q/{token}`) MUST permanecer sem login, sem app e
mobile-first.

- Link público MUST funcionar para usuário anônimo com leitura apenas em
  `publicQueue/{token}`.
- UI pública MUST respeitar branding white-label, i18n (pt-BR/en via
  `publicQueue.locale`) e `prefers-reduced-motion`.
- Cores de destaque MUST atender contraste WCAG 4.5:1 quando aplicadas como
  cor primária de texto ou ação.
- Ações do cliente (desmarcar, aceitar vaga, WhatsApp) MUST ter confirmação
  clara e feedback de estado terminal (`completed`, `expired`, `cancelled`).

**Rationale:** O cliente abre um link no WhatsApp; qualquer fricção extra
reduz adoção e aumenta abandono na fila.

### III. Documentation as Source of Truth

`/docs` é a fonte canônica de produto, arquitetura, UX e conformidade.

- Mudanças funcionais MUST atualizar `docs/REQUIREMENTS.md` com novo ID (RF-xxx)
  ou revisão do requisito existente, mais entrada no Histórico de Versão.
- Decisões de arquitetura MUST alinhar-se a `docs/ARCHITECTURE.md`; desvios
  MUST ser registrados no plano da feature com justificativa.
- Features novas via Spec Kit MUST viver em `specs/[###-feature]/` até
  implementação; após merge, requisitos estáveis migram para `/docs`.
- Comentários no código MUST explicar apenas lógica de negócio não óbvia —
  não duplicar o que já está documentado.

**Rationale:** Waitless já opera com documentação viva; specs efêmeras sem
sincronização geram drift entre código e expectativa de produto.

### IV. Security, Privacy & LGPD by Design

Segurança e privacidade são requisitos, não opcionais.

- PII (nome, WhatsApp, e-mail, CNPJ) MUST ser tratada conforme
  `docs/AUDITORIA_LGPD.md`; novos fluxos MUST avaliar base legal e minimização.
- Operações sensíveis (2FA, exclusão de conta, upload, Admin SDK) MUST usar
  rotas server-side; credenciais MUST ficar fora do git (`.env.local`,
  `secrets/`).
- Permissões MUST centralizar-se em `src/lib/permissions.ts` com regras
  Firestore/Storage e UI alinhadas (Dono / Admin / Base).
- Auth MUST seguir `password-policy.ts`; 2FA por e-mail quando habilitado MUST
  bloquear o painel até verificação.
- Dados legais e páginas `/privacidade`, `/termos`, `/cookies`, `/canal-lgpd`
  MUST permanecer acessíveis e bilíngues quando alterações afetarem tratamento
  de dados.

**Rationale:** SaaS multi-tenant com dados de clientes finais exige conformidade
LGPD e defesa em profundidade desde o desenho.

### V. Simplicity & Minimal Diff

Preferir a solução mais simples que atende ao requisito; evitar over-engineering.

- Escopo de PR/feature MUST ser mínimo e focado; não refatorar código não
  relacionado.
- Novas dependências MUST ser justificadas no plano; reutilizar padrões
  existentes (hooks, componentes Settings, i18n, Firestore helpers).
- Next.js 16 App Router: MUST consultar `node_modules/next/dist/docs/` antes
  de APIs novas ou alterações estruturais (breaking changes vs. training data).
- YAGNI: não implementar cenários especulativos; tratar edge cases documentados
  em spec/plano.

**Rationale:** Codebase maduro com convenções estabelecidas; diffs grandes
aumentam risco de regressão e dificultam review.

## Stack & Technical Constraints

| Camada | Tecnologia aprovada |
|--------|---------------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilo | Tailwind CSS v4, tokens Waitless, `docs/DESIGN_SYSTEM.md` |
| Backend | Firebase Firestore, Firebase Auth, Cloud Functions |
| Hosting | Vercel (app) + Firebase (rules, functions, storage) |

Restrições adicionais:

- Projeto Firebase: `waitless-queue-saas`; multi-tenant via `companies/{id}`.
- Scripts de automação: PowerShell em Windows (`.specify/scripts/powershell/`).
- i18n obrigatório em superfícies admin e cliente (namespaces existentes).
- Testes: incluir quando a spec/plano exigir; não adicionar testes triviais.

## Development Workflow & Quality Gates

1. **Constitution → Spec → Clarify (opcional) → Plan → Tasks → Implement**
   — fluxo Spec Kit para features novas ou mudanças materiais.
2. **Constitution Check** no `plan.md` MUST passar antes de Phase 0 e ser
   revalidado após Phase 1.
3. **Review checklist** por feature:
   - [ ] Tenant isolation e Security Rules revisadas
   - [ ] Impacto em `/q/{token}` e listeners avaliado
   - [ ] i18n pt-BR/en e a11y (motion, contraste) considerados
   - [ ] `docs/REQUIREMENTS.md` atualizado se comportamento mudou
   - [ ] Sem secrets ou PII exposta em logs/commits
4. **Complexity Tracking**: violações aos princípios MUST ser listadas no plano
   com alternativa mais simples rejeitada e motivo.

## Governance

Esta constitution supersede práticas ad hoc e MUST ser consultada em todo
`/speckit-plan`, `/speckit-tasks` e `/speckit-implement`.

**Emenda:** alterações via `/speckit-constitution` ou PR dedicado; versionamento
semântico (MAJOR = remoção/redefinição de princípio; MINOR = novo princípio ou
expansão material; PATCH = clarificação).

**Compliance:** planos MUST incluir seção Constitution Check; implementações
MUST resolver violações ou documentá-las em Complexity Tracking.

**Runtime guidance:** `AGENTS.md`, `README.md`, `/docs/*` e `.cursor/rules/`
complementam esta constitution; em conflito, princípios de segurança e LGPD
prevalecem.

**Version**: 1.0.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-19
