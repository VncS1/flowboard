---
name: Flowboard
description: Real-time collaborative kanban for small teams.
colors:
  primary: "oklch(0.55 0.19 288)"
  primary-hover: "oklch(0.48 0.19 288)"
  on-primary: "oklch(1 0 0)"
  bg: "oklch(1 0 0)"
  surface: "oklch(0.97 0.006 288)"
  ink: "oklch(0.19 0.02 288)"
  muted: "oklch(0.46 0.015 288)"
  border: "oklch(0.9 0.006 288)"
  danger: "oklch(0.55 0.22 25)"
  bg-dark: "oklch(0.09 0 0)"
  surface-dark: "oklch(0.14 0.006 288)"
  ink-dark: "oklch(0.94 0.004 288)"
  muted-dark: "oklch(0.62 0.01 288)"
  border-dark: "oklch(0.22 0.006 288)"
  primary-dark: "oklch(0.6 0.18 288)"
  primary-hover-dark: "oklch(0.67 0.18 288)"
  danger-dark: "oklch(0.72 0.19 25)"
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Flowboard

## Overview

**Creative North Star: "The Control Room"**

Flowboard should feel like a control room, not a scrapbook: a dense, quiet surface
where every card is exactly where it should be, and the one thing that isn't quiet is
the signal that something just changed. Pure white surface, near-black text, a single
deep indigo/violet doing all of the brand's talking — on primary actions, focus rings,
and the pulse that marks a card another teammate just moved. Everything else stays out
of the way. A dark variant of the same room (near-black surface, the same indigo,
still exactly one accent) follows `prefers-color-scheme` automatically — same control
room, lights down.

This system explicitly rejects Jira's cluttered, over-configured chrome and the
generic SaaS-cream dashboard look (gradient hero-metric tiles, tiny uppercase
eyebrows, identical card grids, glassmorphism). It leans toward Linear's density and
restraint instead: neutral by default, loud only where state actually changed.

**Key Characteristics:**
- Pure white / near-black surface pair in light mode, near-black / dark-slate in dark
  mode — no cream, no beige, no default warm tint in either.
- One brand color (deep indigo/violet), used sparingly and always on purpose.
- Flat by default; structure comes from spacing, type weight, and thin borders — not
  drop shadows or nested cards.
- Single sans family (Geist) across every text role — no font pairing.
- Dark mode is a first-class, automatic variant, not an afterthought bolted on later.

## Colors

Restrained strategy: tinted neutrals plus one accent, never more than ~10% of any
screen carrying the brand color. Every neutral and the accent has a dark-mode
counterpart already implemented in `globals.css` via `prefers-color-scheme: dark` —
no manual theme toggle, the room just goes dark with the system.

### Primary
- **Control Indigo** (`oklch(0.55 0.19 288)`, dark: `oklch(0.6 0.18 288)`): primary
  buttons, active/selected states, focus rings, links, and the live-update pulse on a
  card that just changed via WebSocket. Always paired with white text when filled
  (`on-primary`), since its lightness sits in the mid-luminance band where dark text
  reads muddy.

### Neutral
- **Paper** (`oklch(1 0 0)`, dark: near-black `oklch(0.09 0 0)`): page background. Pure
  white in light mode, no chroma, no warm tint — and the true near-black anchor in dark
  mode, not a dark-gray compromise.
- **Slate Surface** (`oklch(0.97 0.006 288)`, dark: `oklch(0.14 0.006 288)`): column
  backgrounds, elevated panels — bg pulled toward ink by a hair, same hue family as
  primary in both modes.
- **Near-Black Ink** (`oklch(0.19 0.02 288)`, dark: near-white `oklch(0.94 0.004 288)`):
  body text, headings. ~14:1 contrast against Paper in either mode.
- **Muted Ink** (`oklch(0.46 0.015 288)`, dark: `oklch(0.62 0.01 288)`): secondary
  text — timestamps, card metadata, column counts. Tuned per-mode to stay ≥4.5:1
  against Paper (passes AA at any size).
- **Hairline Border** (`oklch(0.9 0.006 288)`, dark: `oklch(0.22 0.006 288)`):
  dividers, card/column outlines, input borders at rest.

### Status
- **Ember Red** (`oklch(0.55 0.22 25)`, dark: `oklch(0.72 0.19 25)`): the one status
  color in the system, reserved for `role="alert"` form/auth error text (invalid
  credentials, failed board/card creation). Never used decoratively — it exists purely
  to mark "this action did not succeed."

### Named Rules
**The One Voice Rule.** Control Indigo is the only saturated *brand* color in the
system; Ember Red is the sole exception, and only for error state, never for anything
else. Status/priority differentiation beyond error state (a later-phase concern) is
carried by label text and icons, not a rainbow of pill colors.

## Typography

**Body Font:** Geist (with `ui-sans-serif, system-ui, sans-serif` fallback), loaded via
`next/font` and exposed as the `--font-geist-sans` custom property.

**Character:** One geometric-technical sans across every role. Hierarchy comes from
weight and size, never from switching families — keeps the surface quiet and
consistent with the "one voice" color rule.

### Hierarchy
- **Headline** (600, 1.25rem, 1.3 line-height): board name, page-level heading.
- **Title** (500, 1rem, 1.4 line-height): column headers, card titles.
- **Body** (400, 0.9375rem, 1.5 line-height, ≤70ch): card descriptions, form fields,
  general copy.
- **Label** (500, 0.75rem, 0.02em tracking): card metadata, counts, timestamps. Used
  for small functional labels only — never as a section eyebrow.

### Named Rules
**The No-Eyebrow Rule.** Label styling never sits above a heading as a tracked
all-caps kicker. It labels a specific small fact (a count, a status), not a section.

## Elevation

Flat by default, in both modes. Depth is conveyed through the Paper/Slate Surface pair
and hairline borders, not shadows — a card at rest never carries a drop shadow. The
single exception is transient overlay content (a dropdown menu, a modal), which gets a
tight, purposeful shadow because it's genuinely floating above the page.

### Shadow Vocabulary
- **overlay** (`box-shadow: 0 8px 24px oklch(0.19 0.02 288 / 0.12)`): dropdowns,
  modals, popovers only.

### Named Rules
**The Flat-At-Rest Rule.** Shadows appear only on content that is actually floating
above the page (menus, modals). Boards, columns, and cards at rest are always flat, in
light or dark mode.

## Components

### Buttons
- **Shape:** 8px radius (`rounded.md`).
- **Primary:** Control Indigo fill, white text, `8px 16px` padding, 8px radius — used
  for the single most important action on a form (`Sign in`, `Create account`,
  `Create board`).
- **Ghost:** transparent background, Near-Black Ink text, Hairline Border, `8px 12px`
  padding — used for secondary, low-emphasis actions (`Add card` on each column).
- **Hover / Focus:** primary hover darkens fill (`primary-hover` token); focus-visible
  gets a 2px Control Indigo ring offset 2px from the border, never a color change
  alone.
- **Disabled:** `opacity: 0.5` while a submit is in flight (`Signing in…`,
  `Creating…`, `Adding…`) — every async form button has a distinct pending label, never
  a bare disabled state with no explanation.

### Cards / Containers
- **Corner Style:** 8px radius on kanban cards, 6px on smaller chips.
- **Background:** Paper for the page, Slate Surface for columns, Paper for cards
  sitting on top of a column (so the card reads as a distinct plane via a hairline
  border, not a shadow).
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px Hairline Border on cards and columns.
- **Internal Padding:** 16px (`spacing.md`) card padding, 8px gap between stacked
  cards.

### Inputs / Fields
- **Style:** 1px Hairline Border, Paper background, 8px radius, `8px 12px` padding.
- **Focus:** border shifts to Control Indigo plus the same 2px focus ring used on
  buttons — one consistent focus treatment system-wide.
- **Labels:** every input has a real `<label>`, visually present on auth/board-creation
  forms; visually hidden (`sr-only`, never `display: none`) only where the placeholder
  already states the field's purpose unambiguously (the per-column "new card" input).
- **Errors:** a `role="alert"` line in Ember Red directly below the field group, never
  a raw API error string.

### Navigation

`Header.tsx` renders on every authenticated page (`/boards`, `/boards/[id]`),
satisfying PRODUCT.md's "Persistent wayfinding" principle.
- **Style:** flat top bar, Slate Surface background (the second-neutral-layer
  toolbar treatment from the Colors section, distinct from the Paper page
  background in both light and dark mode), Hairline Border bottom edge only, no
  shadow.
- **Content:** a `Boards` link back to the board list; the current board's name
  as a `/`-separated breadcrumb segment when on a board page (`GET /auth/me`
  supplies the signed-in user server-side); the signed-in user's name; a `Sign
  out` ghost-style text button (transparent at rest, Control Indigo text plus
  Slate-toward-Paper background on hover, never a filled pill) that calls
  `POST /auth/logout` and redirects to `/login`.
- **Not a duplicate heading:** the breadcrumb board-name segment is plain text,
  not an `<h1>` — `BoardDetail` keeps ownership of the page's single `<h1>` so
  the component's heading contract holds whether or not it's rendered under
  `Header`.

## Do's and Don'ts

### Do:
- **Do** keep the page background pure white (`oklch(1 0 0)`) in light mode and true
  near-black (`oklch(0.09 0 0)`) in dark mode — zero chroma, no warm or cream tint in
  either.
- **Do** use Control Indigo as the only saturated brand color on any given screen;
  Ember Red is the only other color with meaning, and it means "error," nothing else.
- **Do** separate cards/columns with hairline borders and surface-tint changes, not
  drop shadows.
- **Do** give every interactive element the same 2px focus ring — keyboard parity is
  a stated design principle, not an afterthought.
- **Do** provide a `prefers-reduced-motion` alternative for every transition, per
  PRODUCT.md's accessibility requirement (WCAG 2.1 AA) — already wired globally in
  `globals.css`.
- **Do** give every authenticated screen a way to see who's signed in and sign out —
  see the Navigation gap above.

### Don't:
- **Don't** build a Jira-style cluttered, modal-per-action chrome.
- **Don't** default to a generic SaaS-cream dashboard look — no gradient hero-metric
  tiles, no tracked uppercase eyebrows above every section, no identical repeating
  card grids, no glassmorphism.
- **Don't** pair Geist with a second display font "for contrast" — one family, weight
  does the work.
- **Don't** put a shadow AND a border on the same card or button as decoration — pick
  one signal for elevation, not both.
- **Don't** round cards or panels above 12-16px — full-pill radius is reserved for
  tags/badges only.
- **Don't** ship an authenticated screen with no header/account context — a bare
  content area forces the user to guess where they are or how to sign out.
