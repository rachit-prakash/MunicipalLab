# Design System (Legaside Brand)

This document captures the core tokens, component patterns, and usage guidelines for the Legaside brand aesthetic. The design maintains a warm, calm, and professional feel inspired by the landing page.

## Foundations

- Fonts:
  - **Figtree**: Primary sans-serif for body text and UI elements (set in `app/layout.tsx`)
  - **EB Garamond**: Display serif for headings and marketing content
- Spacing: 8px scale (4/8/12/16/24/32)
- Radius: `--radius: 0.5rem` (8px), use `rounded-[var(--radius)]`
- Borders: `border border-border`; Shadows: prefer `shadow-sm` only
- Focus: rely on `outline-ring` (already configured globally)

## Color Palette

The brand uses a warm, cream-based palette inspired by the landing page:

- **Background**: Soft cream (`#fffef0`) for a warm, inviting feel
- **Primary**: Deep green (`#034f46`) - the brand's signature color
- **Accent**: Warm cream tones for muted surfaces
- **Marketing CTA**: Pink gradient for high-impact call-to-action buttons

## Color Tokens (Light/Dark)

- Core

  - `--background`, `--foreground` (cream background, rich ink text)
  - `--card`, `--card-foreground` (white cards on cream)
  - `--popover`, `--popover-foreground`
  - `--primary`, `--primary-foreground` (deep green `#034f46` with white text)
  - `--muted`, `--muted-foreground` (warm cream tones, not cool grays)
  - `--accent`, `--accent-foreground` (soft cream accent)
  - `--border`, `--ring`, `--input` (warm borders, green focus ring)

- Semantic

  - `--success`, `--success-foreground`
  - `--warning`, `--warning-foreground`
  - `--info`, `--info-foreground`
  - `--destructive`, `--destructive-foreground`

- Sidebar

  - `--sidebar`, `--sidebar-foreground`
  - `--sidebar-primary`, `--sidebar-primary-foreground`
  - `--sidebar-accent`, `--sidebar-accent-foreground`
  - `--sidebar-border`, `--sidebar-ring`

- Charts (keep one accent + neutrals)
  - `--chart-1` (accent), `--chart-2..5` (neutrals)

Tailwind inline theme exposes these as utilities, e.g.:

- Background: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-success`, `bg-destructive`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, etc.
- Border: `border-border`

## Components

- Buttons (`components/ui/button.tsx`)

  - Variants: `primary` (deep green), `secondary` (outline), `ghost`, `destructive`, `marketing` (pink gradient CTA)
  - Sizes: `sm`, `md`, `lg`
  - Always tokenized colors and `rounded-[var(--radius)]`
  - Use `marketing` variant sparingly for high-impact CTAs only

- Badges (`components/ui/badge.tsx`)

  - Variants: `neutral`, `outline`, `success`, `warning`, `info`, `destructive`

- Cards (`components/ui/card.tsx`)

  - Use `bg-card text-card-foreground border border-border rounded-[var(--radius)] shadow-sm`

- Inputs (`components/ui/input.tsx`)

  - Tokenized border/background/placeholder; `focus-visible:outline-ring`

- Tables (`components/ui/table.tsx`)

  - Sticky header (`sticky top-0`), zebra striping (`even:bg-muted/20`), tokenized borders
  - Row hover: `hover:bg-muted/40`

- Breadcrumbs (`components/ui/breadcrumb.tsx`)
  - Place at the page level under the fixed header

## Patterns

- Navigation

  - Header: cream background with subtle green border; user dropdown; logo on mobile
  - Sidebar: includes logo; green active state with soft cream background; accessible collapse button

- KPIs & Cards

  - Big value, small label, optional delta in semantic color
  - Use calm hover (`hover:bg-muted/40`) instead of heavy shadows

- Tables

  - Sortable headers where it helps scanning; keep pagination simple
  - Align numbers right, text left; keep 56px row height

- Loading & Empty
  - Prefer `Skeleton` blocks for table/card placeholders
  - Keep copy short with a single primary CTA where applicable

## Accessibility

- Use semantic headings and landmarks
- Ensure keyboard focus order and visible `focus-visible` outlines
- Maintain WCAG AA contrast (4.5:1 for body text)

## Dos and Don’ts

- Do

  - Use token classes instead of hard-coded color utilities
  - Use deep green (`--primary`) as the primary accent color
  - Use Garamond (`.font-display`) for H1/H2 headings
  - Use Figtree for body text and UI elements
  - Use warm cream tones from tokens, not cool grays
  - Use `rounded-[var(--radius)]` for all radii
  - Use the `marketing` button variant for special CTAs

- Don’t
  - Mix gray color scales directly (use `--muted-foreground` instead)
  - Use indigo or blue colors (replaced with green)
  - Add heavy shadows or borders (keep it calm with `shadow-sm`)
  - Overuse the marketing gradient (reserve for key actions)

## Files Touched

- Tokens: `app/globals.css`
- Base layout: `app/layout.tsx`
- Header/Sidebar: `components/layout/header.tsx`, `components/layout/sidebar.tsx`
- UI components: `components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, `input.tsx`
- Pages: `app/dashboard/page.tsx`, `app/threads/page.tsx`, `app/gmail/page.tsx`
- Data table: `components/threads/threads-table.tsx`

This is a living document—update it as patterns evolve.
