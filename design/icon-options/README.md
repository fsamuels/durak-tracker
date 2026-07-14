# PWA icon exploration — the fool / clown theme

Six candidate replacements for the current card-fan/spade mark (`public/icon.svg`).
"Durak" means fool, so all six lean into a friendly (non-creepy) clown/jester, while
keeping the app's existing dark-navy background, gold accents, and warm red so the
icon still feels like the same product.

All artwork stays inside the maskable safe zone (central ~80% circle), so each SVG
can be rendered as both `any` and `maskable` icons without recomposition.

| Option | File | Concept |
| --- | --- | --- |
| A | `option-a-classic-clown.svg` | Emoji-style clown face: greasepaint eyes, side tufts, big smile |
| B | `option-b-jester-hat.svg` | Three-point jester cap with bells; nose + grin peek out below the brim |
| C | `option-c-clown-card.svg` | Current two-card fan, with the fool on the front card instead of the spade |
| D | `option-d-red-nose.svg` | Ultra-minimal: one glossy clown nose in a tiny cap, gold bowtie |
| E | `option-e-jester-face.svg` | Fresh-faced fool in a two-point hat, no face paint (most "durak", least "circus") |
| F | `option-f-spade-mascot.svg` | The existing spade as a mascot: face, red nose, tiny jester cap |

Once a direction is picked: refine the chosen SVG, replace `public/icon.svg`,
re-render `public/icons/*.png` (192/512/1024 `any`, 192/512 `maskable`,
`apple-touch-icon`), regenerate `src/app/favicon.ico`, and bump the service-worker
cache so installed clients pick up the new artwork.
