# UI review — 2026-10-28

A pass over every route (signed-in pages, auth/claim, admin, about, legal, and the
selector demo) to check visual and interaction consistency. Part 1 records what was
inconsistent and how this PR fixed it. Part 2 lists improvements that were
deliberately **not** made here, because each one changes behavior or needs a
product decision.

The shared building blocks introduced by this review are documented in
[architecture → UI primitives](./architecture.md). Build new screens on them instead
of re-typing Tailwind classes.

## Part 1 — Inconsistencies found and fixed

| Area                 | What was inconsistent                                                                                                  | Fix                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Inputs               | Three styles. Display-name and admin fields used 14px text, which makes iOS Safari zoom the page on focus.             | `inputClass` / `textareaClass` / `compactSelectClass`: one shape, 16px text, a visible focus ring.  |
| Buttons              | Five treatments: two black-pill sizes, `dark:bg-white` vs `dark:bg-zinc-50`, mixed `font-medium`/`font-semibold` CTAs. | `buttonClass(variant, size)`: `primary` / `solid` / `outline` / `danger` × `sm` / `md` / `lg`.      |
| Segmented controls   | The theme picker looked different from the stats/history period filters. "Past month" wrapped.                         | Shared `segmentClass`. The theme picker uses it with `aria-pressed`, and segments don't wrap.       |
| Feedback text        | Success text was `green-600` in some places and `emerald-600` in others. Most errors had no dark-mode color.           | `FormMessage`: errors use `role="alert"`, success uses `role="status"`, both with dark-mode colors. |
| Empty states         | Two radii and three paddings. Admin used a solid card instead of the dashed style.                                     | `EmptyState` everywhere.                                                                            |
| Stat tiles           | Three layouts: label above value, label below value, gradient value.                                                   | `StatTile` (value over label, optional `highlight` gradient for the home dashboard).                |
| "Who" cards          | Last durak / most durak / champion cards had different sizes and caption order on Home vs Group stats.                 | `HighlightCard`.                                                                                    |
| Badges               | Guest/owner/provider pills used three different neutral greys. Outcome colors were defined twice.                      | `Badge` / `badgeClass(tone)` with `neutral` / `durak` / `success` / `warning`.                      |
| Page chrome          | Gaps alternated between `gap-6` and `gap-8`. Section headings mixed muted `text-sm` and bold `text-lg`.                | `PageShell`, `PageHeader`, `Section`.                                                               |
| Back navigation      | Game detail and Player stats had a "← back" link, but Finish and Edit game didn't.                                     | `PageHeader back={…}` on Finish, Edit, and the selector demo.                                       |
| Selector-demo banner | A large violet banner sat above the Start/Finish forms, pushing the primary task down.                                 | A muted `SelectorDemoLink` below the form.                                                          |
| Account page         | Connect/Disconnect and Sign out were underlined text, not buttons.                                                     | Real buttons, plus a connected / not-connected caption.                                             |
| Header menu          | It closed only on an outside click.                                                                                    | It also closes on Escape.                                                                           |
| Game notes           | Line breaks were collapsed on the detail page.                                                                         | `whitespace-pre-line`.                                                                              |

## Part 2 — Suggested improvements (not in this PR)

Ordered by impact on the core loop: start a game → finish it → look at stats.

### 1. One-tap outcomes on Finish

**Problem.** Each player's result on Finish/Edit is a native `<select>`
(None / Durak / First out / Last out). That means two taps and a system picker per
player, on the most-used screen in the app.

**Suggestion.** Replace the `<select>` with a compact segmented control per row
(`– · Durak · 1st · Last`), or with tap-to-cycle chips. Keep enforcing "one durak, at
most one first/last out" through `outcomeCountError`. Selecting Durak on one player
could clear it from the others instead of showing an error.

**Files.** `src/app/games/[id]/finish/finish-game-form.tsx`,
`src/app/games/[id]/edit/edit-game-form.tsx`. The selector demo's `ResultPanel` is a
reference.

### 2. Themed confirm and undo for destructive actions

**Problem.** Discard game and Delete game use `window.confirm`. It is an unstyled
system dialog that looks out of place next to the aurora theme, and it can't
explain anything beyond one line of text.

**Suggestion.** Use an in-app bottom sheet with a `danger` button. Better still,
skip the confirm and show an "Undo" toast for a few seconds. Delete is already a
soft delete (the game is hidden from history and stats), so an undo is cheap to add.

**Files.** The same two forms, plus a small toast/sheet component in
`src/components/ui.tsx`.

### 3. Loading states

**Problem.** Home, Games, Stats and Player stats are dynamic server pages. After a
tap in the bottom nav, the old page stays on screen with no feedback until the new
one's data arrives.

**Suggestion.** Add `loading.tsx` skeletons built from the same primitives
(placeholder `StatTile`s and card rows with a pulse). Also consider a pending state
on the bottom-nav tab you just tapped.

### 4. Feedback after saving

**Problem.** Finish game redirects to Home, and Save changes on Edit redirects to
`/games`. Neither shows any confirmation.

**Suggestion.** Show a short toast ("Game saved · Alex was the durak 🤡"), using the
same toast as #2. It confirms the action, and it adds a moment of fun to the result.

### 5. Surface "My stats"

**Problem.** A player's own stats page is reachable only from the hamburger menu.

**Suggestion.** Pin a "You" row at the top of the Players list, or add a card to the
home dashboard showing your own durak rate, linking to `/stats/players/<me>`.

### 6. History pagination

**Problem.** `/games` caps at 100 games (`GAMES_LIMIT`) and says nothing when the cap
is reached.

**Suggestion.** Add a "Load more" button (keyset pagination on `started_at`). At
minimum, show a note when the cap is hit.

### 7. Friendlier error messages

**Problem.** The Games and Stats pages show the raw Supabase `error.message` to users
(for example, "Couldn't load stats: JWT expired").

**Suggestion.** Show a plain message with a "Try again" link, and log the raw error
on the server. An expired session should go back through `/login`.

### 8. Theme color follows the chosen theme

**Problem.** `viewport.themeColor` in `src/app/layout.tsx` keys off
`prefers-color-scheme`. If you pick Dark on a light-mode phone, the installed PWA's
status bar stays light.

**Suggestion.** Update `<meta name="theme-color">` from the `ThemeProvider` when the
resolved theme changes.

### 9. Accessibility of the segmented filters

**Problem.** `SegmentedToggle` marks its links `role="tab"` inside a `role="tablist"`,
but there are no tab panels, and selecting a segment navigates to a new URL.
Screen readers announce them as tabs that don't behave like tabs.

**Suggestion.** Drop the tab roles. Render a `<nav aria-label=…>` of links with
`aria-current="page"` on the active one.

### 10. Trim the footer for signed-in users

**Problem.** For signed-in users, the footer repeats "Logged in as <email>", which
the Account page already shows. It also sits in the scroll area just above the
bottom tab bar on every page.

**Suggestion.** Show only the Privacy · Data deletion links when signed in, or move
the footer onto About.

### 11. Retire the selector demo

`/games/selector-demo` is a throwaway playground. Once the chip grid is confirmed as
the final selector, delete the route, `SelectorDemoLink`, and `players.ts`.
