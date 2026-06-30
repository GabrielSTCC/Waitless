# Feature Specification: Abas na Tela do Cliente (Filas / Histórico / Perfil)

**Feature Branch**: `001-client-tabs`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Abas na tela do cliente (Filas / Histórico / Perfil) — item do roadmap"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acompanhar fila ativa na aba Filas (Priority: P1)

Como cliente final que abriu o link da fila no celular, quero ver na aba **Filas**
minha posição, tempo estimado e alertas de proximidade em tempo real, para saber
quando serei atendido sem precisar perguntar na recepção.

**Why this priority**: É o fluxo central do produto; sem esta aba funcional, o
cliente perde o valor principal do Waitless.

**Independent Test**: Abrir `/q/{token}` com entrada ativa em `waiting` ou
`in_service` e validar que posição, ETA, tolerância, oferta de vaga e
desmarcação continuam acessíveis na aba Filas.

**Acceptance Scenarios**:

1. **Given** um link válido com status `waiting`, **When** o cliente abre a
   tela e permanece na aba Filas, **Then** vê posição, ETA, branding do
   estabelecimento e atualização ao vivo sem recarregar a página.
2. **Given** posição de exibição ≤ 2, **When** a fila avança, **Then** um
   alerta de proximidade visível é exibido na aba Filas.
3. **Given** status `in_service`, **When** o cliente consulta a aba Filas,
   **Then** vê indicação clara de que é a sua vez.
4. **Given** uma oferta de vaga pendente, **When** o cliente está na aba Filas,
   **Then** o modal de oferta continua aparecendo independentemente da aba
   selecionada.

---

### User Story 2 - Consultar histórico de visitas na aba Histórico (Priority: P2)

Como cliente recorrente do estabelecimento, quero ver na aba **Histórico** minhas
visitas anteriores naquele local (data, resultado do atendimento), para lembrar
quando fui atendido ou se desmarquei/expirei, sem criar conta.

**Why this priority**: Reforça transparência e confiança para clientes que
retornam; complementa o Mini-CRM do estabelecimento do lado do cliente.

**Independent Test**: Cliente com pelo menos duas visitas encerradas no mesmo
estabelecimento abre link válido, navega à aba Histórico e vê lista ordenada
das visitas passadas com status legível.

**Acceptance Scenarios**:

1. **Given** um cliente com visitas anteriores `completed`, `cancelled` ou
   `expired` no estabelecimento, **When** abre link válido e vai à aba
   Histórico, **Then** vê até 10 visitas mais recentes com data e status em
   linguagem clara (ex.: "Atendido", "Desmarcou", "Não compareceu").
2. **Given** um cliente sem visitas anteriores, **When** abre a aba Histórico,
   **Then** vê estado vazio amigável explicando que o histórico aparecerá após
   a primeira visita concluída.
3. **Given** visita ativa em andamento, **When** o cliente consulta Histórico,
   **Then** a visita ativa NÃO aparece duplicada no histórico (permanece só
   na aba Filas até encerrar).

---

### User Story 3 - Ver e ajustar preferências na aba Perfil (Priority: P3)

Como cliente na fila, quero ver na aba **Perfil** meu nome, contato parcialmente
mascarado e preferências básicas (idioma), para confirmar que estou na fila
certa e usar o app no meu idioma, ainda sem login.

**Why this priority**: Reduz erros de identidade ("não sou eu") e melhora
acessibilidade via idioma; menor urgência que fila ao vivo e histórico.

**Independent Test**: Abrir link válido, ir à aba Perfil, ver nome e WhatsApp
mascarado; alterar idioma e confirmar que textos da interface atualizam.

**Acceptance Scenarios**:

1. **Given** link válido com nome "Maria Silva" e WhatsApp cadastrado, **When**
   o cliente abre Perfil, **Then** vê nome completo e WhatsApp mascarado (ex.:
   `(**) *****-1234`).
2. **Given** idioma padrão pt-BR, **When** o cliente seleciona English no
   Perfil, **Then** labels das três abas e conteúdos traduzíveis passam a
   exibir em inglês durante a sessão.
3. **Given** link inválido ou expirado, **When** o cliente tenta acessar
   Perfil, **Then** vê a mesma mensagem de link inválido (abas ocultas ou
   desabilitadas).

---

### Edge Cases

- Cliente troca de aba durante countdown de tolerância: countdown MUST
  permanecer visível ou acessível na aba Filas ao retornar, sem perder sync.
- Cliente perde conexão ao vivo: indicador de conexão MUST ser visível em todas
  as abas ou persistente no topo da shell.
- Link expirado após visita concluída: Histórico MUST continuar acessível
  enquanto a sessão do link permitir leitura do estado terminal; após cleanup
  do link, mostrar orientação para solicitar novo link à recepção.
- Estabelecimento com branding escuro/claro: abas MUST manter contraste WCAG
  4.5:1 com cor de destaque configurada.
- `prefers-reduced-motion`: transições entre abas MUST respeitar preferência
  do sistema (sem animações obrigatórias).
- Cliente tenta acessar histórico de outro cliente: sistema MUST expor apenas
  visitas vinculadas à identidade do link atual (mesmo cliente no mesmo
  estabelecimento).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela pública do cliente MUST apresentar navegação por abas fixas
  **Filas**, **Histórico** e **Perfil**, acessível por toque em dispositivos
  móveis e por teclado em desktop.
- **FR-002**: A aba **Filas** MUST consolidar o conteúdo atual de acompanhamento
  da fila (posição, ETA, alerta de proximidade, tolerância, desmarcação, estados
  terminais e oferta de vaga) sem regressão funcional.
- **FR-003**: A aba **Histórico** MUST listar as visitas anteriores do cliente
  no estabelecimento atual, ordenadas da mais recente para a mais antiga,
  limitadas às 10 mais recentes.
- **FR-004**: Cada item de histórico MUST exibir data/hora da visita e status
  final legível (`completed`, `cancelled`, `expired`).
- **FR-005**: A aba **Perfil** MUST exibir nome do cliente, WhatsApp parcialmente
  mascarado e nome do estabelecimento, somente leitura.
- **FR-006**: O cliente MUST poder alternar idioma (pt-BR / en) na aba Perfil;
  a preferência MUST persistir durante a sessão do navegador.
- **FR-007**: A experiência MUST permanecer **sem login, sem instalação de app**
  e mobile-first, conforme constitution do projeto.
- **FR-008**: Modais críticos (oferta de vaga, confirmação de desmarcação)
  MUST aparecer sobre qualquer aba ativa.
- **FR-009**: O rodapé de privacidade e links legais MUST permanecer visível
  em todas as abas.
- **FR-010**: Dados exibidos MUST ser restritos ao cliente e estabelecimento
  associados ao link/token atual; nenhum dado de outros clientes MUST ser
  exposto.

### Key Entities

- **Client Session**: Sessão anônima derivada do link `/q/{token}`; identifica
  cliente e estabelecimento sem autenticação formal.
- **Active Queue Visit**: Entrada ativa na fila (`waiting` ou `in_service`)
  exibida na aba Filas.
- **Past Visit Record**: Visita encerrada com status final, data e referência
  ao estabelecimento; escopo do histórico.
- **Client Profile View**: Representação somente leitura de nome, contato
  mascarado e preferências de idioma do cliente na sessão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% dos clientes em teste de usabilidade encontram posição na
  fila em menos de 5 segundos após abrir o link (aba Filas padrão).
- **SC-002**: 100% dos fluxos existentes de fila (proximidade, tolerância,
  desmarcação, oferta de vaga) continuam funcionais após introdução das abas.
- **SC-003**: Clientes recorrentes visualizam histórico de visitas anteriores
  em no máximo 2 toques a partir da aba Filas.
- **SC-004**: Troca de idioma no Perfil reflete em 100% dos textos traduzíveis
  da interface do cliente na mesma sessão.
- **SC-005**: Nenhum dado de terceiros é exibido em testes de isolamento com
  tokens de clientes distintos no mesmo estabelecimento.

## Assumptions

- O roadmap original ("Abas Filas / Histórico / Perfil") refere-se à tela
  pública `/q/{token}`, não a um app instalável.
- "Filas" no singular/plural cobre a fila ativa do estabelecimento; múltiplas
  filas simultâneas por cliente no mesmo tenant permanecem proibidas (regra
  anti-duplicata existente).
- Histórico inclui apenas visitas no estabelecimento do link atual, não
  cross-tenant.
- Nome e WhatsApp no Perfil são somente leitura; alterações continuam sendo
  feitas pela recepção.
- Preferência de idioma na sessão complementa (não substitui) o locale
  definido pelo estabelecimento em `publicQueue.locale` como padrão inicial.
- Visitas ativas não aparecem no Histórico até atingirem estado terminal.
