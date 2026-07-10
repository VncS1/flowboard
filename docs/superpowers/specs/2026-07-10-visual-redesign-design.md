# Phase 14 — Visual Redesign Design Spec

## Goal

Replace Flowboard's current neutral, purely functional UI with a clean, modern,
intuitive visual language in the "Stripe/Vercel" family — confident typography,
a restrained accent-color system, soft ambient depth — without changing any
functional behavior established in Phases 3–13. Also closes a scope gap: the
member list/invite UI (backend-only since Phase 11) gets built for the first
time, directly in the new visual language, so Phase 11's feature is complete
end-to-end.

This supersedes the roadmap's original Phase 14 framing ("bold colors,
gradients, shadows — modern/vibrant, not minimal"): after seeing three mockups
in that direction, the user found them generic and asked for "moderno, bonito,
clean e intuitivo" instead, closer to Stripe/Vercel. Direction and rationale
below reflect that pivot.

## Visual direction: "Stripe soft gradient"

Chosen over a "Vercel mono + single accent" alternative (also mocked) because
it reads as more polished/"bonito" via ambient depth, while staying just as
clean. Concretely:

- Near-white/near-black neutral base (unchanged in spirit from today's
  `--color-bg`/`--color-surface`/`--color-ink` scale), not a loud colored
  background.
- A single accent hue pairing already anchored in the current `--color-primary`
  (violet, oklch hue ≈288) plus one new endpoint hue (magenta/pink, ≈340) used
  together only to form two-stop gradients — never as flat fills.
- Gradients appear in exactly three places: the primary button treatment, a
  very low-opacity radial "ambient glow" in page backgrounds (light mode
  only), and small accent dots/indicators. Everything else (card surfaces,
  borders, body text) stays neutral.
- Elevation via soft, diffused, low-opacity shadows (not hard "sticker"
  shadows, not blur-heavy glows) — a hairline border plus a subtle shadow on
  hover/drag, not shadow-at-rest on every element.
- Typography: existing `--font-sans` (Geist) kept; increase weight contrast
  between headings (semibold/bold, tight tracking) and body text (regular).

## Design tokens (`apps/web/src/app/globals.css`)

Add to the existing `:root` / dark-mode block / `@theme inline` pattern
(additive — no existing token is removed or renamed):

```
--color-accent-2: oklch(0.62 0.20 340);       /* light */
--color-accent-2: oklch(0.68 0.19 340);       /* dark */

--shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 8px 20px rgba(79,70,229,0.06);
--shadow-card-hover: 0 4px 10px rgba(0,0,0,0.06), 0 12px 28px rgba(79,70,229,0.10);
```

Dark mode does not reuse the light-mode shadow values (shadows barely read on
a near-black surface). Instead, dark-mode elevation is primarily a border
color shift on hover (`--color-border` → a lighter step) with a much
lower-opacity shadow for depth. Exact dark-mode shadow rgba values are an
implementation detail to eyeball against the real dark background during
Phase 14 implementation — the intent (border-led elevation, not shadow-led)
is the fixed requirement.

The ambient background gradient is not a token — it's applied directly as a
`background` on the page shell in light mode only (a near-black dark-mode
background already reads as "deep"/high-contrast on its own; layering a
low-opacity color glow on top would muddy contrast rather than add depth, so
dark mode relies on the border-led elevation described below instead):

```css
background:
  radial-gradient(ellipse 480px 300px at 10% -10%, oklch(0.55 0.19 288 / 0.08), transparent 60%),
  radial-gradient(ellipse 420px 260px at 100% 0%, oklch(0.62 0.20 340 / 0.06), transparent 60%),
  var(--color-bg);
```

Primary gradient button treatment:

```css
background: linear-gradient(90deg, var(--color-primary), var(--color-accent-2));
```

## Component-by-component treatment

**Header/nav** (`Header.tsx`)
- "Flowboard" wordmark gets the two-stop gradient applied as text (existing
  Boards/board-name breadcrumb layout is unchanged).
- Replace the plain `{user.name}` text with a small circular avatar (initials,
  gradient-filled background, white text) next to the name.
- Sign-out becomes an icon button (door/exit glyph) with `aria-label="Sign
  out"` instead of the text button — same handler, same disabled-while-signing-
  out behavior, same test assertions targeted by role/label instead of text.

**Board list** (`BoardsList.tsx`, `CreateBoardForm.tsx`)
- Replace the divided `<ul>` rows with a responsive grid of board cards:
  rounded surface, hairline border, `--shadow-card` → `--shadow-card-hover` on
  hover, column count shown as a small pill badge instead of plain text.
- `CreateBoardForm` becomes a visually distinct card at the top of the grid
  (same fields/validation/error behavior, new container styling only).

**Board detail** (`BoardDetail.tsx`)
- Columns: replace the current flat block styling with a card-like surface,
  header row gets a small color-dot indicator (not a full-width color band).
- Cards (`CardItem`): idle state stays quiet (no visible Edit/Delete); on
  hover *or* keyboard focus-within, the Edit/Delete icon buttons fade in.
  Existing test coverage that queries `getByRole("button", { name: /edit/i
  })`/`/delete/i` etc. keeps working since the buttons still exist in the DOM
  (CSS-only visibility change) — no test rewrite needed for that part, only
  additions for the icon swap (see below) and hover/focus visibility if we
  choose to assert it.
- Board name rename/delete controls (`BoardNameControls`/
  `DeleteBoardControls`) move from inline text buttons into a small icon
  toolbar next to the `<h1>`, owner-only visibility unchanged.
- Drag state: dragged card keeps `opacity-50` behavior (already implemented)
  plus a slightly larger `--shadow-card-hover`-style shadow while dragging, for
  a clearer "lifted" affordance.

**Member UI (new)** — closes the Phase 11 frontend gap
- A `MemberList` client component, rendered in `BoardDetail` near the heading:
  an avatar stack (overlapping circles, initials, one color per member drawn
  from a small fixed palette keyed off user id) for the owner + all members.
- An "Invite" affordance (owner-only, matching the `isOwner` gating already
  used for rename/delete): click opens an inline form (email input + submit),
  same visual family as the rename/delete inline forms already established in
  Phase 13 (`boardActions`-style result handling: ok/error, clear error
  messages).
- A remove-member control (owner-only, hidden for the owner's own avatar) on
  each non-owner avatar, with the same inline-confirm pattern used for card/
  board delete.
- Backend routes already exist and are already wired to `board:sync`
  broadcast (Phase 11/12): `POST /boards/:id/members`, `DELETE
  /boards/:id/members/:userId`. This is frontend-only work: new
  `boardActions.ts` functions (`inviteMember`, `removeMember`) following the
  exact `postJson`/`deleteRequest` helper pattern already in that file, plus
  wiring `board:sync`'s implicit member-list change... **caveat**: today's
  `board:sync` payload (`board`, `columns`, `cards`) does not include the
  member list at all. Live update of the avatar stack when another client
  invites/removes a member is **out of scope** for Phase 14 — the member list
  loads once from `GET /boards/:id` (needs that endpoint to start including
  members; currently it does not) and updates optimistically for the acting
  client's own invite/remove actions, refreshed on next page load otherwise.
  Real-time member-list sync is a follow-up (would need a shared-type change
  to `BoardSyncMessage` in `packages/shared`, which is explicitly out of scope
  for a visual-redesign phase).
- `GET /boards/:id` needs to start returning `members` (id, name/email, role)
  for the detail page to render the avatar stack at all — this is a small,
  additive backend change (not a new route, just extending an existing
  response shape), done TDD-first as part of this phase since the frontend
  feature is meaningless without it.

**Icons**
- No icon library is installed. Add ~6 hand-rolled inline SVG icon components
  (pencil/edit, trash/delete, x/cancel, plus/add, door/sign-out, users/invite)
  under `apps/web/src/components/icons.tsx` — 24×24 viewBox, `currentColor`
  stroke, matching stroke-width across the set. No new npm dependency.

## Explicitly out of scope for Phase 14

- Real-time sync of the member list via WebSocket (see caveat above).
- Any change to `packages/shared` message schemas.
- Any change to backend business logic beyond the additive `members` field on
  `GET /boards/:id`.
- Accessibility audit beyond what's already required (keeping existing
  roles/labels intact, adding `aria-label`s to new icon-only buttons). A
  dedicated `a11y-audit` pass stays optional/future work per the existing
  Phase 10 note.

## Testing & verification plan

- Confirm the full gate is green *before* any change (baseline): `npm run
  build && npm run lint && npm run format:check && npm test && npx playwright
  test` (from repo root / `e2e`).
- All new/changed frontend behavior (icon-button swaps, `MemberList`,
  `boardActions.inviteMember`/`removeMember`) gets component/unit tests
  written test-first, per `test-driven-development`.
- The new `GET /boards/:id` `members` field gets an integration test
  (TDD, RED confirmed) in the existing `boards.test.ts`.
- Manual drag-and-drop check in the running app after the `CardItem`
  restructure (hover-reveal buttons), since that's exactly the kind of
  structural change near cards the roadmap calls out as a regression risk.
- Full gate green again *after* the redesign, same commands as baseline.

## Process

- Branch: `polish/redesign-v2` (per roadmap).
- Implementation planned via `writing-plans` after this spec is approved.
- `finishing-a-development-branch` to merge back once the full gate is green
  and the manual DnD/visual check is done.
