<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: Flowboard
description: Real-time collaborative kanban for small teams.
colors:
  primary: "oklch(0.55 0.19 288)"
  bg: "oklch(1 0 0)"
  surface: "oklch(0.97 0.006 288)"
  ink: "oklch(0.19 0.02 288)"
  muted: "oklch(0.46 0.015 288)"
  border: "oklch(0.90 0.006 288)"
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
---

# Design System: Flowboard

## Overview

**Creative North Star: "The Control Room"**

Flowboard should feel like a control room, not a scrapbook: a dense, quiet surface
where every card is exactly where it should be, and the one thing that isn't quiet is
the signal that something just changed. Pure white surface, near-black text, a single
deep indigo/violet doing all of the brand's talking — on primary actions, focus rings,
and the pulse that marks a card another teammate just moved. Everything else stays out
of the way.

This system explicitly rejects Jira's cluttered, over-configured chrome and the
generic SaaS-cream dashboard look (gradient hero-metric tiles, tiny uppercase
eyebrows, identical card grids, glassmorphism). It leans toward Linear's density and
restraint instead: neutral by default, loud only where state actually changed.

**Key Characteristics:**
- Pure white / near-black surface pair — no cream, no beige, no default warm tint.
- One brand color (deep indigo/violet), used sparingly and always on purpose.
- Flat by default; structure comes from spacing, type weight, and thin borders — not
  drop shadows or nested cards.
- Single sans family (Geist) across every text role — no font pairing.

## Colors

Restrained strategy: tinted neutrals plus one accent, never more than ~10% of any
screen carrying the brand color.

### Primary
- **Control Indigo** (`oklch(0.55 0.19 288)`): primary buttons, active/selected states,
  focus rings, links, and the live-update pulse on a card that just changed via
  WebSocket. Always paired with white text when filled (`ink-on-fill`), since its
  lightness sits in the mid-luminance band where dark text reads muddy.

### Neutral
- **Paper** (`oklch(1 0 0)`): page background. Pure white — no chroma, no warm tint.
- **Slate Surface** (`oklch(0.97 0.006 288)`): column backgrounds, elevated panels —
  bg pulled toward ink by a hair, same hue family as primary.
- **Near-Black Ink** (`oklch(0.19 0.02 288)`): body text, headings. ~14:1 contrast
  against Paper.
- **Muted Ink** (`oklch(0.46 0.015 288)`): secondary text — timestamps, card
  metadata, column counts. ~4.7:1 against Paper (passes AA at any size).
- **Hairline Border** (`oklch(0.90 0.006 288)`): dividers, card/column outlines,
  input borders at rest.

### Named Rules
**The One Voice Rule.** Control Indigo is the only saturated color in the system. It
never shares a screen with a second accent hue — status/priority differentiation (a
later-phase concern) is carried by label text and icons, not a rainbow of pill colors.

## Typography

**Body Font:** Geist (with `ui-sans-serif, system-ui, sans-serif` fallback)

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

Flat by default. Depth is conveyed through the Paper/Slate Surface pair and hairline
borders, not shadows — a card at rest never carries a drop shadow. The single
exception is transient overlay content (a dropdown menu, a modal), which gets a
tight, purposeful shadow because it's genuinely floating above the page.

### Shadow Vocabulary
- **overlay** (`box-shadow: 0 8px 24px oklch(0.19 0.02 288 / 0.12)`): dropdowns,
  modals, popovers only.

### Named Rules
**The Flat-At-Rest Rule.** Shadows appear only on content that is actually floating
above the page (menus, modals). Boards, columns, and cards at rest are always flat.

## Components

### Buttons
- **Shape:** 8px radius (`rounded.md`).
- **Primary:** Control Indigo fill, white text, `12px 20px` padding, 8px radius.
- **Hover / Focus:** primary hover darkens fill by ~10% lightness; focus-visible gets
  a 2px Control Indigo ring offset 2px from the border, never a color change alone.
- **Ghost:** transparent background, Near-Black Ink text, Hairline Border on hover.

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
- **Style:** 1px Hairline Border, Paper background, 8px radius.
- **Focus:** border shifts to Control Indigo plus the same 2px focus ring used on
  buttons — one consistent focus treatment system-wide.

### Navigation
- **Style:** flat top bar, Paper background, Hairline Border bottom edge only (no
  shadow). Active link uses Control Indigo text, not a filled pill.

## Do's and Don'ts

### Do:
- **Do** keep the page background pure white (`oklch(1 0 0)`) with zero chroma — no
  warm or cream tint.
- **Do** use Control Indigo as the only saturated color on any given screen.
- **Do** separate cards/columns with hairline borders and surface-tint changes, not
  drop shadows.
- **Do** give every interactive element the same 2px focus ring — keyboard parity is
  a stated design principle, not an afterthought.
- **Do** provide a `prefers-reduced-motion` alternative for every transition, per
  PRODUCT.md's accessibility requirement (WCAG 2.1 AA).

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
