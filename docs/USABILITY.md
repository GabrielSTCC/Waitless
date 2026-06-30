# Waitless — Usabilidade e Acessibilidade

## Paleta default (v0.2)

Design system **Waitless** — tema claro padrão, escuro opcional:

- Background claro: `#F8F9FA`
- Navy: `#0A1B3F` — texto e estrutura
- Primary (laranja): `#FF6600` sobre `#FFFFFF` (on-primary)
- Texto secundário: `#4A5D7A` / `#9AA8BE`

Tema escuro: fundo navy `#0A1B3F`, surfaces em camadas, accent laranja mantido.

## Requisitos white-label (v0.2)

Em `/admin/settings`, o dono pode configurar:

1. Cor de destaque (`brand.accentColor`)
2. Tagline exibida na tela do cliente
3. URL da logo (opcional)

Ao salvar cor de destaque:

1. Validar contraste mínimo **4.5:1** entre accent e texto branco (`on-primary`)
2. Rejeitar cor se contraste insuficiente
3. Fallback para `#FF6600` se não configurado
4. Aplicar na tela `/q/[token]` via CSS variable `--color-primary`

## Mobile-first (cliente web)

- Touch targets mínimo 44×44px.
- Tipografia escalável; posição na fila legível a 2m de distância.
- Sem dependência de hover.
- Bottom nav com item ativo em cor de destaque.

## Admin dashboard

- Focus visible em inputs e botões (`ring-primary`).
- Labels em ícones de ação (`aria-label`).
- Sidebar acessível via teclado no mobile drawer.
- Toggle tema claro/escuro em Configurações.

## Modal de bloqueador de anúncios (Admin)

Decisão consciente de **bloqueio total** (modo `strict`, hard block) até o operador resolver a conexão Firestore:

- `role="alertdialog"`, `aria-modal="true"`, `aria-live="assertive"`.
- Título e descrição vinculados via `aria-labelledby` / `aria-describedby`.
- `document.body.style.overflow = hidden` enquanto o modal está aberto.
- **Sem** fechar por clique no overlay ou botão X — evita operação com fila “morta” sem perceber.
- Renderizado via **portal** em `document.body` (`createPortal`) para escapar de stacking contexts do layout admin.
- `pointer-events-auto` no overlay e no card; `z-[9999]`.
- Botões com estados disabled durante verificação (`Verificando conexão...`).

## Banner de bloqueador (Admin, soft advisory)

Barra **não bloqueante** (`role="status"`, `aria-live="polite"`), sticky no topo (`z-[9998]`):

- Permite continuar usando o painel (modo degradado / polling).
- Botão **Dispensar** acessível por teclado; estado em `sessionStorage`.
- Link para Central de Ajuda (`/admin/help`).
- Variante urgente (fundo error-container) quando transporte Firestore confirmadamente bloqueado em modo `advisory`.

## Motion

- Animações respeitam `prefers-reduced-motion` (fase 2).
- v0.2: animações Framer Motion leves em cards e badge Ao Vivo.
