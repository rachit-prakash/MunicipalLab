# Design System (Minimal CRM Dashboard)

This document captures the core tokens, component patterns, and usage guidelines for the minimal, professional dashboard look. Keep UI calm, accessible, and fast to parse.

## Foundations

- Font: Inter with system fallbacks (set in `app/layout.tsx`)
- Spacing: 8px scale (4/8/12/16/24/32)
- Radius: `--radius: 0.5rem` (8px), use `rounded-[var(--radius)]`
- Borders: `border border-border`; Shadows: prefer `shadow-sm` only
- Focus: rely on `outline-ring` (already configured globally)

## Color Tokens (Light/Dark)

- Core
  - `--background`, `--foreground`
  - `--card`, `--card-foreground`
  - `--popover`, `--popover-foreground`
  - `--primary`, `--primary-foreground` (single accent: Indigo)
  - `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`
  - `--border`, `--ring`, `--input`

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
  - Variants: `primary`, `secondary` (outline), `ghost`, `destructive`
  - Sizes: `sm`, `md`, `lg`
  - Always tokenized colors and `rounded-[var(--radius)]`

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
  - Header: tokenized, no gradients; user dropdown; optional Help/Docs
  - Sidebar: no logo; clear active state; accessible collapse button

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
  - Use one accent color consistently
  - Use `rounded-[var(--radius)]` for all radii

- Don’t
  - Reintroduce gradients or brand logos
  - Mix gray color scales directly; use tokens
  - Add heavy shadows or borders

## Files Touched

- Tokens: `app/globals.css`
- Base layout: `app/layout.tsx`
- Header/Sidebar: `components/layout/header.tsx`, `components/layout/sidebar.tsx`
- UI components: `components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, `input.tsx`
- Pages: `app/dashboard/page.tsx`, `app/threads/page.tsx`, `app/gmail/page.tsx`
- Data table: `components/threads/threads-table.tsx`

This is a living document—update it as patterns evolve. 



