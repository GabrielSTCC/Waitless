# Política de Segurança

## Reportar uma vulnerabilidade

Se você encontrou uma vulnerabilidade de segurança no Waitless, reporte de forma responsável:

1. **Não** abra uma issue pública no GitHub para vulnerabilidades.
2. Envie um e-mail para o endereço de suporte publicado em [waitless.solutions/contato](https://www.waitless.solutions/contato) com o assunto **Security Report**.
3. Inclua descrição detalhada, passos para reproduzir e impacto estimado.

## Escopo

Estão no escopo:

- Aplicação web em `waitless.solutions` e APIs associadas
- Firestore/Storage rules e endpoints server-side deste repositório
- Fluxos de autenticação e autorização (admin e cliente)

Fora do escopo:

- Engenharia social, phishing ou testes contra contas de terceiros
- Ataques de negação de serviço (DoS/DDoS)
- Problemas em dependências já reportados publicamente sem PoC específico ao Waitless

## O que esperar

- Confirmação de recebimento em até **5 dias úteis**
- Atualização sobre o status da correção quando aplicável
- Crédito público opcional após a correção (mediante acordo)

## Boas práticas para pesquisadores

- Use apenas contas e dados que você controla
- Não acesse, modifique ou exclua dados de outros usuários
- Interrompa testes que possam afetar disponibilidade ou integridade de produção

## Medidas de segurança do projeto

- Firebase App Check em produção
- Firestore Security Rules multi-tenant
- Secrets via variáveis de ambiente (nunca commitados)
- 2FA por e-mail para contas administrativas
- Cabeçalhos HTTP: HSTS, CSP, COOP, Permissions-Policy (ver `security-headers.ts`)

### Content-Security-Policy

Por padrão a CSP roda em modo **report-only** (`Content-Security-Policy-Report-Only`), registrando violações sem bloquear. Após validar no browser, defina na Vercel:

```
CSP_REPORT_ONLY=false
```

Opcional: `CSP_REPORT_URI` para endpoint de coleta de relatórios.
