# Waitless

SaaS de fila de espera inteligente com Mini-CRM e sincronização em tempo real.

**Demo:** [waitless.solutions](https://www.waitless.solutions)

## Sobre o projeto

Waitless permite que estabelecimentos gerenciem filas de atendimento com um painel Kanban em tempo real, enquanto clientes acompanham posição e ETA via link público — sem login.

Principais funcionalidades:

- Painel admin multi-tenant com papéis (Dono, Admin, Base)
- Fila em tempo real (Firebase Firestore listeners)
- Mini-CRM com busca por WhatsApp/nome
- Link público `/q/{token}` para o cliente
- White-label (logo, cores, tagline)
- Analytics, convites de equipe, i18n (pt-BR/en)
- Assinaturas (Stripe / PIX via Asaas)
- Conformidade LGPD (políticas, canal do titular, cookies)

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Estilo | Tailwind CSS v4, Framer Motion |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| Hosting | Vercel |

## Estrutura

```
src/
├── app/          # App Router (admin, cliente /q, APIs)
├── components/   # UI e componentes de domínio
└── lib/          # Firebase, permissões, billing, i18n

docs/             # Arquitetura, produto, UX, LGPD
firestore.rules   # Regras multi-tenant + App Check
```

Documentação detalhada:

- [PRODUCT.md](./docs/PRODUCT.md) — visão e jornadas
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — stack e modelo de dados
- [UX.md](./docs/UX.md) — fluxos de interface

## Setup local

```bash
npm install
cp .env.example .env.local
# Preencha as variáveis Firebase e demais credenciais
npm run dev
```

1. Habilite **E-mail/senha** e **Google** no Firebase Console (Authentication).
2. Configure a service account: `npm run setup:service-account`
3. Crie um estabelecimento em `/admin/signup`
4. Deploy de rules: `npx firebase-tools deploy --only firestore:rules,firestore:indexes`

Consulte [`.env.example`](./.env.example) para a lista completa de variáveis.

## Segurança

- Multi-tenant com Firestore Security Rules e custom claims
- Firebase App Check (reCAPTCHA Enterprise) em produção
- RBAC centralizado em `src/lib/permissions.ts`
- APIs server-side com Firebase Admin SDK
- 2FA por e-mail para contas admin
- LGPD: políticas públicas, banner de cookies, canal do titular

Reporte vulnerabilidades conforme [SECURITY.md](./SECURITY.md).

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run test:rules` | Testes das Firestore Rules |
| `npm run setup:service-account` | Configura Firebase Admin local |
| `npm run setup:stripe-prices` | Cria preços Stripe (modo test) |

## Licença

MIT — veja [LICENSE](./LICENSE).
