---
name: Obsidian Queue
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#c8c5ca'
  on-secondary: '#303033'
  secondary-container: '#47464a'
  on-secondary-container: '#b6b4b8'
  tertiary: '#c6c6cf'
  on-tertiary: '#2f3037'
  tertiary-container: '#909099'
  on-tertiary-container: '#282930'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#e4e1e6'
  secondary-fixed-dim: '#c8c5ca'
  on-secondary-fixed: '#1b1b1e'
  on-secondary-fixed-variant: '#47464a'
  tertiary-fixed: '#e2e1eb'
  tertiary-fixed-dim: '#c6c6cf'
  on-tertiary-fixed: '#1a1b22'
  on-tertiary-fixed-variant: '#45464e'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The design system is engineered for high-performance SaaS environments, specifically focusing on a "Smart Waiting Queue" dashboard. The brand personality is authoritative, precise, and technologically advanced. It aims to evoke a sense of calm control amidst high-traffic data streams.

The visual style is **Corporate Modern with a "Dark Lab" aesthetic**. It utilizes a deep, monochromatic foundation to reduce eye strain during long monitoring sessions, punctuated by a single, high-energy accent to draw attention to critical actions and real-time status changes. The aesthetic is clean and disciplined, prioritizing information density without sacrificing legibility or airiness.

## Colors

The palette is anchored in a "Deep Zinc" spectrum to provide maximum depth and professional sobriety. 

- **Primary (Vibrant Violet):** Used exclusively for primary actions, active states, and critical "live" indicators. 
- **Neutral/Background:** `bg-zinc-950` serves as the base application canvas, with `bg-zinc-900` used for elevated surface containers like cards and sidebars.
- **Borders:** `border-zinc-800` provides subtle, low-contrast definition between interface regions.
- **Text:** High-contrast `zinc-100` for primary content, `zinc-400` for secondary metadata, and `zinc-500` for disabled or placeholder states.

## Typography

This design system uses **Inter** for all roles to maintain a systematic, utilitarian feel that excels in data-heavy environments. 

- **Headlines:** Use tighter letter spacing and semi-bold weights to create a strong visual anchor for page sections.
- **Labels:** Small caps or uppercase transformations are used for table headers and section overlines to differentiate them from interactive body text.
- **Numerical Data:** For queue counts and wait times, ensure the use of tabular lining figures (if available in the font) to maintain vertical alignment in lists.

## Layout & Spacing

The layout follows a **Fluid-Fixed Hybrid** model. The sidebar remains fixed at 280px on desktop, while the main content area utilizes a fluid 12-column grid.

- **Mobile First:** On mobile devices, the 12-column grid collapses to a single column with 16px side margins. 
- **Spacing Rhythm:** An 8px linear scale governs all padding and margins to ensure mathematical harmony.
- **Responsive Behavior:** Cards and data tables transition to stacked list views or horizontal scroll containers on screens smaller than 768px. Large display metrics (queue size, wait time) scale down by 20% on mobile to maintain hierarchy without overflowing.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** rather than traditional drop shadows. This preserves the "premium dark" feel without introducing visual fuzziness.

- **Level 0 (Floor):** `bg-zinc-950` - The base canvas.
- **Level 1 (Cards/Sidebar):** `bg-zinc-900` with a 1px solid border of `zinc-800`.
- **Level 2 (Popovers/Modals):** `bg-zinc-900` with a slightly lighter border `zinc-700` and a very soft, large-radius black shadow (0 20px 25px -5px rgba(0,0,0,0.5)).
- **Interactive States:** On hover, cards may transition their border color to `zinc-700` to indicate interactivity.

## Shapes

The shape language balances precision with approachability. 

- **Primary Radius:** A consistent `0.5rem` (8px) is used for standard components like input fields and small buttons.
- **Large Radius:** Containers, cards, and modal windows use `1rem` (16px) to soften the overall dashboard appearance.
- **Pill Shapes:** Used exclusively for status "Chips" (e.g., Active, Waiting, Completed) to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons are solid `violet-500` with `white` text. Secondary buttons are `zinc-800` backgrounds with `zinc-100` text. Ghost buttons use no background and `zinc-400` text.
- **Input Fields:** Dark backgrounds (`zinc-950`) with `zinc-800` borders. The border glows `violet-500/50` on focus.
- **Chips/Badges:** Small, pill-shaped indicators. For status, use low-opacity backgrounds (e.g., `success-green` at 10% opacity) with full-saturation text.
- **Cards:** The workhorse of the dashboard. Use `bg-zinc-900` with `rounded-xl` corners and `zinc-800` borders. Header sections within cards should have a bottom border of `zinc-800`.
- **Data Tables:** Row-based with `zinc-800` dividers. Hover states should highlight the entire row with a subtle `bg-zinc-800/40`.
- **Queue Progress Bar:** Thin 4px tracks in `zinc-800` with a `violet-500` fill to indicate current capacity or wait progress.