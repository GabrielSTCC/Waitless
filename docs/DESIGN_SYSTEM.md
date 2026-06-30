# Waitless — Design System

## Referência de marca

Tokens extraídos do mockup de identidade visual Waitless (Navy + Laranja).

## Cores da marca

| Token | Valor | Uso |
|-------|-------|-----|
| `brand-navy` | `#0A1B3F` | Texto, estrutura, fundo escuro |
| `brand-orange` | `#FF6600` | CTA, destaque, nav ativa |
| `brand-off-white` | `#F8F9FA` | Fundo tema claro |

## Tema claro (padrão)

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | `#F8F9FA` | Canvas |
| `surface-container` | `#FFFFFF` | Cards, sidebar |
| `on-surface` | `#0A1B3F` | Texto primário |
| `on-surface-variant` | `#4A5D7A` | Metadata |
| `primary` | `#FF6600` | Ações, badge live |
| `on-primary` | `#FFFFFF` | Texto em botão primary |
| `outline-variant` | `#D1D9E6` | Bordas |
| `error-container` | `#FEE2E2` | Alerta "sua vez" |

## Tema escuro (opção)

Ativado via `data-theme="dark"` (next-themes). Accent laranja permanece; surfaces usam navy em camadas (`#122952`, `#1A3058`).

## Tipografia

- **Corpo:** Inter (Google Fonts) — `--font-inter`
- **Títulos:** Poppins (Google Fonts) — `--font-heading`
- **Headlines:** 32px/600 desktop, 24px mobile
- **Body:** 14–16px/400
- **Labels:** 12px/500 uppercase tracking

## Logo

- Logo escura: `public/logo-photoroom.png` — login e fundos claros (`Logo` padrão)
- Logo clara: `public/logo-clara-photoroom.png` — gerada via `npm run process:logo-clara` a partir de `Modelo/LogoClara-Photoroom.png` (remove só fundo cinza fantasma, preserva branco/laranja); menu lateral navy (`Logo tone="light"`, `unoptimized`)
- Componente: `src/components/brand/Logo.tsx` — variantes `full` (auth) e `compact` (sidebar)

## Elevação / Superfícies 3D

Tokens em `globals.css` (light: tint navy; dark: preto com alpha maior). API em `src/lib/ui/surface.ts`.

| Token CSS | Classe utilitária | Uso |
|-----------|-------------------|-----|
| `--elevation-card` | `shadow-surface-card` | Cards, seções, colunas da fila |
| `--elevation-card-hover` | `shadow-surface-card-hover` | Hover em cards interativos |
| `--elevation-raised` | `shadow-surface-raised` | Botões primary, opção ativa em segment control |
| `--elevation-inset` | `shadow-surface-inset` | Track de `SegmentControl` (aspecto entalhado) |
| `--elevation-input` | `shadow-surface-input` | Inputs, search bar |
| `--elevation-dropdown` | `shadow-surface-dropdown` | Dropdowns, tooltips, resultados de busca |
| `--elevation-modal` | `shadow-surface-modal` | Modais, card de auth |
| `--elevation-sidebar` | `shadow-surface-sidebar` | Sombra lateral do menu navy |

Componente `SegmentControl` (`src/components/ui/SegmentControl.tsx`) — seletores de tema, idioma, texto e motion.

## Componentes

| Componente | Variante |
|------------|----------|
| Button Primary | `bg-primary shadow-surface-raised text-on-primary rounded-lg hover:brightness-95` |
| Button Secondary | `bg-surface-container shadow-surface-card border border-outline-variant` |
| Input | `bg-surface-container border-outline-variant shadow-surface-input focus:shadow-surface-raised` |
| Card | `surfaceCard` — `rounded-2xl border bg-surface-container shadow-surface-card` |
| Badge/Chip | `rounded-full font-label-md` |
| Progress bar | 4px track `surface-container-highest`, fill `primary` |

## Layout

- Sidebar admin: 220px fixa
- Grid kanban: 1 col mobile, 2 cols desktop
- Cliente web: mobile-first, max-width 512px, bottom nav fixa
- Spacing: escala 4px base (8px rhythm)

## Motion (Framer Motion)

- Cards: `layout`, `initial={{ opacity: 0, y: 8 }}`, `AnimatePresence`
- Live badge: pulse no indicador
- Hover cards: `whileHover={{ scale: 1.01 }}` sutil

## Ícones

Lucide React (admin e cliente).

## White-label (v0.2)

Cor de destaque do estabelecimento sobrescreve `--color-primary` na tela `/q/[token]`. Validação WCAG 4.5:1 ao salvar em Settings.
