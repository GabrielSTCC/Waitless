# Auditoria Jurídica e Conformidade LGPD — Waitless

Template aplicado: v1.0 (maio/2026) · Auditoria realizada em **12/06/2026**

## Ficha do projeto

| Campo | Valor |
|-------|-------|
| Nome do produto | Waitless |
| Tipo de sistema | SaaS B2B — fila de espera inteligente com Mini-CRM |
| Stack | Next.js 16 · React 19 · Firebase (Auth, Firestore, Storage) · Vercel |
| URL de produção | https://www.waitless.solutions |
| Controlador/Operador | Definido via `NEXT_PUBLIC_LEGAL_*` em produção |
| CNPJ (plataforma) | N/A — operação por pessoa física |
| Endereço | Definido via `NEXT_PUBLIC_LEGAL_ADDRESS` em produção |
| E-mail LGPD / suporte | Definido via `NEXT_PUBLIC_LEGAL_EMAIL_LGPD` em produção |
| Encarregado (DPO) | Definido via `NEXT_PUBLIC_LEGAL_DPO_NAME` em produção |
| Operadores | Vercel, Google Firebase, Resend, Meta/WhatsApp (opcional) |
| Responsável técnico | Definido via `NEXT_PUBLIC_LEGAL_TECH_LEAD` em produção |

---

## 1. Veredito executivo

| Área | Status | Risco |
|------|--------|-------|
| Política de Privacidade | ☑ OK | Baixo |
| Termos de Uso | ☑ OK | Baixo |
| Política de Cookies + banner | ☑ OK | Baixo |
| Identificação do controlador (CPF/nome/endereço) | ☑ OK | Baixo |
| Canal do Encarregado (DPO) | ☑ OK | Baixo |
| Base legal e direitos do titular | ☑ OK | Baixo |
| Dados sensíveis | ☑ N/A | — (sem saúde/biometria) |
| Cookies/terceiros sem transparência | ☑ OK | Baixo |
| Autenticação e autorização (RBAC) | ☑ OK | Baixo |
| Criptografia e segurança de API | ☑ Parcial | Médio — headers OK; CSP completo pendente |

**Conclusão:** O produto Waitless **está em conformidade parcial** para operação comercial plena.

**Bloqueadores identificados:**
1. Aceitar DPAs nos painéis Vercel, Firebase/Google Cloud e Resend (Fase B — governança).
2. Treinamento da equipe e teste formal de backup/restore.

---

## 2. Marco legal aplicável

- **LGPD** (Lei 13.709/2018): Art. 6º, 7º, 8º, 9º, 18º, 41º, 46–49º — aplicável integralmente.
- **ANPD**: cookies de preferência e sessão = tratamento; banner implementado com opt-in para categorias opcionais.
- **CDC**: identificação do fornecedor no rodapé e Termos de Uso.
- **Setor específico:** ☑ Delivery / fila — nome, telefone (WhatsApp), histórico de visitas (dados pessoais, não sensíveis).

---

## 3. Segurança da aplicação (AppSec)

| OWASP | Situação Waitless |
|-------|-------------------|
| Injeção | Firestore SDK parametrizado; validação Zod em APIs (`/api/*`) |
| XSS | React escape padrão; sem `dangerouslySetInnerHTML` em fluxos críticos |
| Autenticação | Firebase Auth; 2FA por e-mail (Resend); cookies HttpOnly via Firebase |
| IDOR / RBAC | `permissions.ts` + Firestore rules por tenant; rotas owner/admin |
| Configuração | Headers de segurança em `next.config.ts`; `.env` gitignored |
| Validação | Cliente (UX) + servidor + rules Firestore |

---

## 4. Autenticação e autorização

| Perfil | Escopo |
|--------|--------|
| Dono | Conta, equipe, exclusão, todos os recursos |
| Admin | Fila, clientes, analytics, configurações |
| Base | Fila, clientes, cadastro |

- MFA (2FA): disponível em `/admin/security` — **recomendado** para Dono e Admin (P2).
- RBAC: implementado em `src/lib/permissions.ts` e Firestore rules.

---

## 5. Proteção de dados

- **Trânsito:** HTTPS (Vercel TLS 1.2+); HSTS configurado.
- **Repouso:** Firebase/Google Cloud encryption at rest.
- **PII:** nome, WhatsApp, e-mail (equipe), CNPJ/razão social (estabelecimento).
- **Retenção:** documentada na Política de Privacidade; logs ~30 dias.
- **Art. 18:** canal em `/canal-lgpd` e e-mail LGPD.

---

## 6. Cookies e terceiros

| Categoria | Status |
|-----------|--------|
| Necessários | Firebase Auth, consentimento |
| Funcionais | locale, tema, acessibilidade — com consentimento no banner |
| Analíticos | Não ativos (Vercel Analytics não instalado) |
| Marketing | Não utilizados |

Fontes: Inter/Poppins via `next/font` (self-host, sem CDN Google Fonts).

---

## 7. Documentação legal publicada

| Rota | Status |
|------|--------|
| `/privacidade` | ☑ |
| `/termos` | ☑ |
| `/cookies` | ☑ |
| `/canal-lgpd` | ☑ |
| Rodapé (CNPJ, DPO, links) | ☑ Parcial |

---

## 8. Checklist por fase

### Fase A — Site / MVP ☑ (com ressalvas)

- [x] Política de Privacidade publicada
- [x] Termos de Uso publicados
- [x] Política de Cookies + banner funcional
- [x] CNPJ e razão social no rodapé *(CPF do controlador PF — OK)*
- [x] DPO nomeado e e-mail publicado
- [x] Terceiros analíticos/marketing desativados
- [x] HTTPS em produção

### Fase B — Governança (pendente operacional)

- [x] ROPA documentado (`docs/ROPA.md`)
- [x] Procedimento Art. 18 (`docs/LGPD_ART18_PROCEDURE.md`)
- [ ] DPAs aceitos nos provedores
- [ ] Treinamento da equipe
- [ ] Plano de incidentes divulgado internamente

### Fase C — Transacional

- [x] RBAC por perfil
- [~] MFA em perfis críticos *(disponível, não obrigatório)*
- [ ] Backup/restore testados formalmente
- [ ] RIPD simplificado *(baixo risco atual — fila/CRM sem dados sensíveis)*

---

## 9. Matriz de prioridade

| Prioridade | Ação |
|------------|------|
| **P0** | Configurar env vars legais em produção (Vercel) |
| **P1** | DPAs, treinamento, teste de restore |
| **P2** | MFA obrigatório para Dono; CSP refinado |

---

## 10. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.1 | 12/06/2026 | Identificação legal via env vars (`NEXT_PUBLIC_LEGAL_*`) |
| 1.0 | 12/06/2026 | Auditoria inicial Waitless pós-implementação Fase A |

*Documento operacional. Não substitui assessoria jurídica especializada.*
