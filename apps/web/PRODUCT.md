# Product

## Register

product

## Users

Small teams (2-10 people) collaborating on shared task boards in real time. A user is
mid-task, often with the board open alongside other work tools, moving cards between
columns while a teammate does the same on the same board at the same moment. The
interface must make state changes — a card someone else just moved, a move that
conflicted with a concurrent one — legible immediately, without a refresh and without
ambiguity about whose change won. A secondary audience is a technical reviewer
(recruiter/engineer) evaluating the real-time correctness and UI craft of this
portfolio project.

## Product Purpose

A real-time collaborative kanban board: boards → columns → cards, synced live across
every connected client, with optimistic-concurrency-safe card moves (no last-write-wins
on a card two people touch at once). Success looks like: a user creates a board,
organizes cards across columns, and sees a teammate's move appear live — and if two
people move the same card at once, the loser gets a clear conflict signal and
authoritative state, never silent data loss.

## Brand Personality

Focused, minimal, fast. Confidence through density and typographic hierarchy, not
decoration. The interface should get out of the way of the work — not a playful tool,
not a corporate-SaaS dashboard.

## Anti-references

Not Jira (cluttered, over-configured, heavy chrome, modal-per-action). Not generic
SaaS-cream dashboards (gradient hero-metric tiles, tiny uppercase eyebrows, identical
card grids, glassmorphism). Reference lane: Linear — dense, fast, neutral palette
carried by a single deliberate accent, strong type hierarchy, no ornamental chrome.

## Design Principles

- Density over decoration: hierarchy comes from type weight/size and spacing, not
  borders, shadows, or gradients on every surface.
- State changes must be instantly legible: a live update from another user, a version
  conflict on a card move, must read as unmistakable without being noisy.
- One accent color, used deliberately (primary actions, live-update/connection
  indicators) — never sprinkled decoratively across the UI.
- Keyboard and screen-reader parity with mouse/drag interaction — load-bearing ahead of
  Phase 6's drag-and-drop, where a pointer-only interaction would exclude a whole class
  of users.

## Accessibility & Inclusion

WCAG 2.1 AA: body text ≥4.5:1 contrast, large text ≥3:1, visible focus states, full
keyboard operability, `prefers-reduced-motion` alternatives for any live-update or
transition animation.
