# Checklist: ativar CSP em enforcement

Execute **antes** de definir `CSP_REPORT_ONLY=false` na Vercel.

## Fluxos a validar

- [ ] Login e-mail/senha em `/admin/auth`
- [ ] Login Google (popup) em `/admin/auth`
- [ ] Fila em tempo real (listener Firestore) em `/admin`
- [ ] App Check / reCAPTCHA em produção
- [ ] Página `/comprar` com Google Ads (após consentimento marketing)
- [ ] Upload de logo em `/admin/settings`
- [ ] Link público `/q/{token}` (cliente)

## DevTools

- [ ] Abrir Console → filtrar por `Content-Security-Policy`
- [ ] Zero violações que quebrariam funcionalidade após enforcement

## Ativação

1. Vercel → Project → Settings → Environment Variables
2. Adicionar ou editar: `CSP_REPORT_ONLY` = `false` (Production)
3. Redeploy
4. Confirmar header `Content-Security-Policy` (sem `-Report-Only`) em https://www.waitless.solutions
