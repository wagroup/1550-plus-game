# 1550+ Design System

Extracted from Figma node 300:2193 (landing page).

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#2A4DFF` | Primary blue — CTAs, accents, highlighted words |
| `--color-secondary` | `#010516` | Primary dark background |
| `--color-surface-light` | `#FEFEFF` | Light section background |
| `--color-text-body-dark` | `#1D1D1D` | Body text on light sections |
| `--color-text-secondary` | `#5D5D75` | Muted body text (feature lists on white) |
| `--color-border-input` | `#1C3568` | Form input borders |
| `--color-input-bg` | `rgba(5,11,26,0.9)` | Form input backgrounds |
| `--color-navbar-bg` | `rgba(42,77,255,0.25)` | Navbar glass background |
| `--color-card-blue-fill` | `rgba(42,77,255,0.1)` – `rgba(42,77,255,0.3)` | Testimonial/quote card fills |

**White opacity scale** (text/borders on dark bg): `1, 0.9, 0.85, 0.82, 0.8, 0.7, 0.6, 0.55, 0.45, 0.15, 0.1, 0.08, 0.06, 0.04`

**Button gradient**: `linear-gradient(168deg, #5B7CFF 0%, #2A4DFF 42%, #142F99 100%)`

**Gold accent graphics**: image-based gold/bronze icon assets (top-gold, push-gold, score-gold, goal-gold, foundation-gold, intensive-gold, review-gold) — decorative, not solid color tokens.

## Typography

| Token | Font | Usage |
|---|---|---|
| `--font-display` | `Norwester` (Regular) | All headings, uppercase, tight tracking (-2px to +1.7px depending on size) |
| `--font-body` | `Inter Tight` (Regular/Medium/Light) | Paragraph copy |
| `--font-ui` | `Inter` (Regular/Medium/Semi Bold) | Nav, buttons, labels, form fields |

**Type scale** (display/Norwester): `128px / 116px lh` (hero), `64px`, `48px / normal lh`, `40px`, `36px`, `32px`, `26px`, `24px`

**Type scale** (body/Inter Tight): `40px`, `36px`, `32px`, `24px`, `20px`, `16px`

**Type scale** (UI/Inter): `16px` (nav/buttons), `14px` (labels/footer), `11px` (eyebrow, tracking 2.42px, uppercase)

## Spacing Scale

`4, 8, 12, 16, 19, 20, 24, 28, 32, 40, 56, 60, 64, 80, 109, 115, 121, 140` (px)

## Radius Scale

| Token | Value |
|---|---|
| `--radius-sm` | 6px (login button) |
| `--radius-md` | 8px (navbar, inputs) |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px (cards, quote block, footer contact card) |
| `--radius-2xl` | 24px |
| `--radius-3xl` | 32px (stat cards) |
| `--radius-full` | 9999px (pill button, badges) |

## Elevation / Shadow

- **Primary button**: `0px 16px 36px 0px rgba(30,70,255,0.55), 0px 6px 14px 0px rgba(0,0,0,0.28)` + inset top highlight `inset 0px 1px 0px rgba(255,255,255,0.35)` + inset bottom `inset 0px -2px 0px rgba(0,0,0,0.18)`
- **Login button**: `inset 0px -4px 0px rgba(0,5,23,0.41)`
- **Dark glass card**: `0px 24px 64px -24px rgba(0,0,0,0.45)`
- **CTA panel**: `0px 24px 64px -28px rgba(0,0,0,0.55)`
- **Footer contact card**: `0px 24px 80px -28px rgba(0,0,0,0.65)`

## Effects

- **Backdrop blur**: `2px` (cards), `6px` (navbar, footer contact card)
- **Glass surfaces**: dark translucent fill + hairline white border (`rgba(255,255,255,0.08)`–`0.15`) + backdrop blur — recurring pattern for navbar, testimonial cards, CTA panel, footer contact form

## Core Components

### Button (primary, `Button`)
- Pill-ish rounded rect, gradient fill, uppercase Norwester label + trailing 27px arrow icon
- Diagonal gradient sheen overlay top-left, inset shadow for depth
- Fixed size ~217×61px in this file; treat as min-width, auto-height in implementation

### Button (login/secondary)
- Flat `#2A4DFF` fill, 6px radius, Inter Regular, inset bottom shadow only — no gradient

### Navbar
- Glass pill bar: blur(6px) + `rgba(42,77,255,0.25)` fill, 8px radius
- Logo left, nav links center (Inter Medium 16px), Sign up + Login button right

### Stat Card (dark)
- `#010516` fill, 32px radius, gradient-clipped number (white → primary blue, `text-shadow` drop), Norwester

### Feature List Card (light)
- White fill, 1px `#2A4DFF` border, 24–32px radius, checkmark-icon + `#5D5D75` Inter Tight rows

### Step Card ("How It Works")
- Illustrated background asset per step, numbered gold icon, Norwester heading, tight negative tracking

### Program Card (dark, path cards)
- Illustrated dark card with gold icon graphic overflowing top, Norwester title (primary blue), Inter Tight Medium description

### Testimonial Card
- Two variants: static profile card (glass, name/role/badge) and video card (thumbnail + "watch the story" pill badge)

### Quote Block
- `rgba(42,77,255,0.3)` fill, hairline border, 16px radius, large Norwester uppercase quote, small uppercase attribution

### Form Input / Textarea
- `rgba(5,11,26,0.9)` fill, `#1C3568` 1px border, 8px radius, `#9CA3AF` placeholder, Inter 14px

### Footer
- Dark bg, hairline top border, 4-column nav/info layout + glass contact form card

## Layout

- Content max-width container: `1440–1445px`
- Section horizontal padding: `109–204px` (wide desktop canvas — treat as fluid/clamped in responsive implementation)
- Recurring background: radial blue glow ellipses (decorative, low-opacity) behind major sections

## Notes for Implementation

- This file is a fixed 1440px desktop Figma frame — no responsive/breakpoint data exists in source. Breakpoints must be authored, not extracted.
- Norwester is a paid/custom font — confirm license and add fallback (e.g. a similar condensed display sans) in `font-display` stack.
- Gold decorative icons are raster/vector image assets, not icon-font glyphs — export from Figma or rebuild as SVG.
- Original node IDs preserved in `docs/figma-node-map.md` if traceability back to Figma is needed (available on request).