# GTM fase 1 — primeiros clientes (salões / barbearias)

Playbook operacional do Waitless. Instagram é só cartão de visita; o canal principal é **WhatsApp + visita + indicação**.

**Site:** [waitless.solutions](https://www.waitless.solutions)  
**Oferta piloto:** 14 dias + setup assistido por você. Depois: Essencial R$79/mês ou Pro R$139/mês (preço de lista — não baixar; use cupom / override em `/platform` se precisar).  
**Infra do piloto:** [PILOTO_E_ESCALA.md](./PILOTO_E_ESCALA.md)

---

## Pitch (uma frase)

> O Waitless é a fila no celular: seu cliente vê a posição sem ficar parado, e sua equipe para de responder “quanto tempo ainda?” o dia inteiro.

### Proposta de valor (usar na conversa)

| Benefício | Como falar |
|-----------|------------|
| Sem app | Link no WhatsApp; abre no celular |
| Controle na recepção | Painel Kanban ao vivo + Mini-CRM |
| Menos bagunça no pico | Ordem clara; Pro tem tolerância e realocação de vaga |
| Marca do salão | Logo e cor na tela do cliente |

### Para quem vender primeiro

1. **Salões e barbearias com walk-in** (melhor fit)
2. Clínicas / consultórios com recepção sobrecarregada
3. Restaurantes com fila — só se houver hostess engajada

---

## Checklist 7 dias (P0)

Faça na ordem. Marque ao concluir.

### Dia 1 — cobrança e suporte

- [ ] Decidir: Stripe/Asaas **live** validado (`npm run verify:stripe` / `verify:asaas`) **ou** override em `/platform` + PIX/transferência manual no piloto
- [ ] Combinar canal de suporte: chat `/admin/help` ↔ `/platform/support` **ou** WhatsApp do Gabriel (resposta &lt; 24h)
- [ ] Smoke rápido em produção: signup → fila → `/q/{token}` ao vivo

### Dia 2 — lista de 30 leads

- [ ] Preencher [leads-template.csv](./gtm/leads-template.csv) com 30 salões/barbearias (Russas + região)
- [ ] Priorizar: tem WhatsApp Business, movimento no sábado, walk-in
- [ ] Fonte: Google Maps (“barbearia Russas”, “salão de beleza …”)

### Dias 3–5 — outreach

- [ ] Enviar **10 mensagens/dia útil** (modelos abaixo)
- [ ] Meta da semana: **15 conversas → 5 demos → 2–3 pilotos**
- [ ] Agendar demos com horário escrito (data + WhatsApp)

### Dias 6–7 — fechar 1º piloto

- [ ] Rodar demo de 10–15 min (roteiro abaixo)
- [ ] Setup assistido no mesmo dia (checklist onboarding)
- [ ] Pedir permissão para depoimento após 1 semana
- [ ] Abrir [Google Search Console](https://search.google.com/search-console) em `waitless.solutions` e anotar 3 queries das landings

---

## Mensagens WhatsApp (copiar e adaptar)

Substitua `[Nome]` e `[Estabelecimento]`.

### 1) Primeiro contato (frio / Maps)

```
Oi [Nome], tudo bem? Sou o Gabriel, do Waitless (fila digital pro salão/barbearia).

Vi o [Estabelecimento] e queria mostrar em 15 min como o cliente acompanha a posição no celular — sem app — e a recepção para de responder “quanto falta?” o dia todo.

Topa amanhã ou outro horário esta semana? Posso ir aí ou por videochamada.
Site: https://www.waitless.solutions
```

### 2) Indicação (quente)

```
Oi [Nome]! O [Quem indicou] falou que vocês pegam fila no pico.

Criei o Waitless pra isso: cliente vê a vez no WhatsApp, vocês controlam no painel. Pilotamos 14 dias com setup feito por mim (sem custo no teste).

Posso te mostrar em 15 min no celular de vocês?
```

### 3) Follow-up (48h sem resposta)

```
Oi [Nome], só reforçando: 15 min pra ver a fila no celular funcionando de verdade. Se não for prioridade agora, sem problema — me avisa e eu não incomodo.
```

### 4) Após demo — fechar piloto

```
[Nome], combinado o piloto de 14 dias no [Estabelecimento].

Amanhã às [horário] a gente cria a conta juntos (20 min). Me manda o e-mail do dono que eu preparo tudo.
Suporte no período: [seu WhatsApp].
```

### 5) Pedido de indicação (depois do 1º pagante ou piloto feliz)

```
[Nome], se conhecer outro salão/barbearia com fila no pico, me indica — o indicado ganha setup assistido e você [1 mês grátis no Essencial / benefício combinado].
```

---

## Roteiro da 1ª conversa / demo (10–15 min)

1. **Dor (1 min)** — “No pico, quantas vezes a recepção ouve ‘qual é minha vez?’?”
2. **Demo no celular deles (5 min)** — criar conta teste ou usar demo → adicionar cliente na fila → abrir `/q/{token}` → mostrar posição atualizando.
3. **Gap (2 min)** — “Sem totem, sem pager, sem app. Depois do teste: a partir de R$79/mês. O setup eu faço com você.”
4. **CTA único (1 min)** — “Começamos o piloto de 14 dias amanhã? Preciso do nome do salão, e-mail do dono e 20 minutos juntos.”
5. **Objeção preço** — trial 14 dias; Essencial cobre a maioria; Pro só se quiser tolerância/vaga.
6. **Objeção “equipe não usa sistema”** — 3 cliques: buscar cliente → entrar na fila → WhatsApp.
7. **Fechar por escrito** — data/hora do setup + WhatsApp de suporte.

Landings úteis na conversa:

- Salões: https://www.waitless.solutions/fila-de-espera-salao
- Planos: https://www.waitless.solutions/planos

---

## Onboarding assistido (1 página)

Usar **no mesmo dia** da demo, com o dono ao lado (presencial ou call).

### Antes (você)

- [ ] Decidir plano do piloto: trial / override `/platform` / checkout
- [ ] App Check e domínio OK ([PILOTO_E_ESCALA.md](./PILOTO_E_ESCALA.md))

### Com o dono (20 min)

1. [ ] Conta em `/admin/signup` (e-mail do dono)
2. [ ] Completar onboarding (nome do estabelecimento, tempo médio)
3. [ ] (Opcional) Logo + cor em Configurações
4. [ ] Recomendar 2FA em `/admin/security`
5. [ ] Liberar plano (checkout **ou** override em `/platform`)
6. [ ] Combinar suporte (chat ou WhatsApp)
7. [ ] Smoke: cadastrar cliente → fila → abrir link no celular do dono → ver ao vivo
8. [ ] Enviar 1º cliente real no próximo dia de movimento
9. [ ] Agendar follow-up em 7 dias (dúvidas + pedido de depoimento)

### Depois (você)

- [ ] Anotar estabelecimento na lista de leads (status = piloto)
- [ ] Em 7 dias: pedir frase + permissão para case na landing

---

## LinkedIn (paralelo, 3×/semana)

Perfil: Gabriel = founder Waitless; link no destaque para waitless.solutions.

Ideias de post (1 ideia por post):

1. Problema: “quanto falta?” na recepção
2. Print da tela do cliente (sem dados reais sensíveis)
3. “Como configurei um salão em 20 minutos”

Mensagem de conexão: curta, mesma lógica do WhatsApp 1 — pedir 15 min, não pitch longo.

---

## Parcerias e indicação (após 1 piloto vivo)

- 1 fornecedor de cosméticos / produtos de barbearia
- 1 contador com carteira de clínicas/salões
- Associação comercial local

Oferta para parceiro: eles abrem a porta; você faz a demo. Para cliente: indique outro → 1 mês Essencial (só depois do 1º pagante).

---

## O que NÃO priorizar agora

- Mais criativos Instagram/TikTok (já em [gtm/roteiros](./gtm/roteiros/README.md))
- Anúncios pagos sem funil demo → piloto → pagamento
- SEO nacional amplo (landings de nicho já existem; Search Console primeiro)

---

## P1 rápido (2–4 semanas, depois do 1º piloto)

1. Case na landing (print + frase do dono)
2. `SENTRY_DSN` na Vercel ([PILOTO_E_ESCALA.md](./PILOTO_E_ESCALA.md))
3. 20 contatos LinkedIn/semana
4. 1 parceria ativa
