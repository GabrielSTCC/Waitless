# Waitless — Visão de Produto

## O que é

**Waitless** é um SaaS de fila de espera inteligente para estabelecimentos físicos (clínicas, restaurantes, salões, guichês). A recepção gerencia a fila em um dashboard admin; o cliente final recebe um link web via WhatsApp e acompanha posição e tempo estimado em tempo real — sem instalar app.

## Proposta de valor

| Para o estabelecimento | Para o cliente final |
|------------------------|----------------------|
| Fila digital com sync em tempo real | Acompanhamento instantâneo no celular |
| Mini-CRM com busca por WhatsApp/nome | Fricção zero — só abrir o link |
| Reentrada rápida de clientes recorrentes | Transparência de posição e espera |
| White-label com cores e logo do estabelecimento | Interface adaptada à marca do local |

## Dependência operacional: Firestore realtime (Admin)

O painel admin (`/admin/*`) depende de listeners Firestore nos canais **Listen/Write** para manter o Kanban sincronizado. Bloqueadores de anúncios (Brave Shields, uBlock Origin) podem interceptar essas requisições sem afetar o restante do site. Quando isso ocorre, o Waitless exibe um modal orientando o operador a desativar o bloqueio — **sem impactar** a jornada do cliente em `/q/[token]`, que permanece com fricção zero.

## Personas

- **Recepcionista / Staff:** opera a fila, busca clientes, adiciona à fila, inicia e finaliza atendimentos.
- **Dono do estabelecimento:** configura branding, tempo médio de atendimento, equipe.
- **Cliente final:** abre link no WhatsApp, vê posição e ETA em tempo real.

## Jornada do estabelecimento (MVP v0.1)

1. Cadastro do estabelecimento (`/admin/signup`) — cria Auth + company + member.
2. Login diário (`/admin/login`).
3. Busca rápida por WhatsApp ou nome na barra de pesquisa.
4. Cliente encontrado → um clique entra na fila; novo cliente → modal "Add Customer".
5. Kanban: colunas **Aguardando** e **Em Atendimento** atualizadas em tempo real.
6. Ações: **Iniciar** (waiting → in_service), **Finalizar** (in_service → completed).
7. Disparo de link WhatsApp: copiar link ou enviar via wa.me / API Business.

## Mini-CRM

Dados isolados por tenant em `companies/{companyId}/clients`:

- Nome, WhatsApp normalizado, contagem de visitas, última visita.
- Busca por prefixo de nome ou WhatsApp para reentrada instantânea na fila.

## Página Clientes e Analytics (v0.3)

- `/admin/customers` — listagem Mini-CRM com reentrada na fila.
- `/admin/analytics` — atendimentos do dia, tempo médio, fila atual.
- Multi-staff via convites em Configurações.

## Jornada do cliente web (v0.2)

1. Recebe link `waitless.app/q/{token}` via WhatsApp (copiado pela recepção).
2. Tela mobile-first com posição, ETA, alerta de proximidade e branding white-label.
3. Atualização automática via listener em `publicQueue/{token}`.
4. Sem login, sem instalação de app.

## Princípios inegociáveis

1. Fricção zero no link do cliente.
2. Identidade dinâmica acessível (white-label).
3. Tempo real nativo (Firestore listeners).
4. Agilidade operacional na recepção (Mini-CRM).
5. Documentação viva em `/docs`.
6. Multi-tenant com Security Rules rigorosas.
