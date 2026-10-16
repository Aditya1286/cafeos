# Caos, the mascot

A 3D hamster in a top hat, holding a QR code. It appears on four pages (landing, login, request-a-demo
and the customer's order tracker) and reacts to what the visitor does there.

## Mental model

Three layers that never reach into each other. Each one does one job, and they communicate only
through the types in `types.ts`.

```
  page markup                 config.ts                        what you see
  data-mascot-* hooks  ──►    "when X happens, do Y"
                                    │
  scroll / hover / focus ──► sections.ts, interactions.ts ──► brain.ts ──► engine/ (three.js)
  the page's own state  ──►        (signal prop)               WHAT        HOW it looks
                                                                 │
                              flow.ts ◄───────────────────────────┘
                              WHERE it is (path, dock, slot, peeking from a card)
```

- **Config (`config.ts`): what it reacts to.** One `MascotConfig` per page, pure data. It covers
  sections, hover/focus targets, cards to peek from, page signals, and how the mascot moves (`flow`,
  plus `phoneFlow` for phones). To change what the mascot says or does, you edit this file and
  nothing else.
- **Brain (`brain.ts`): what it is doing.** A pure state machine with no DOM, React or three.js. It
  keeps one *layer* per trigger kind (section < signal < peek < hover < focus). The layer with the
  highest priority owns the expression and the speech bubble. When that layer ends, the one
  underneath takes over again, with what's left of its message. Cooldowns stop the same line from
  repeating.
- **Flow (`flow.ts`): where it is.** It moves the host element and nothing else:
  - *path*: glides an S-curve down the viewport as you scroll (or as you move through a form's steps)
  - *dock*: rests small in a corner, made for phones
  - *slot*: lives in a reserved spot in the page and covers nothing
  - *static*: one corner (reduced motion)
  - *peek*: pops up from behind a card's top edge, but only where it won't cover text
- **Engine (`engine/`): how it looks.** `model.ts` builds the hamster from primitives into a named rig
  (head, hat, brows, lids, eyes, paws, QR). `animator.ts` sums independent channels into that rig once
  per frame: expression, idle breathing, scroll lean, look-at, gestures and the entrance. Channels
  only add their own numbers, so nothing fights over a transform. `gestures.ts` holds the one-shot
  moves: pop, nod, tilt, lean, tipHat, wiggle and wave.
- **Shell (`PageMascot.tsx` → `MascotExperience.tsx`): wiring.** `PageMascot` is the only entry point.
  It waits until the page has loaded and the browser is idle, then lazily loads the experience, which
  lazily loads three.js. Any failure (no WebGL, a chunk 404) falls back to the static logo. A visitor
  can hide the mascot (stored locally), and it respects `prefers-reduced-motion`.

## Vocabulary

| Thing | Values |
|---|---|
| Expression (the face, held) | `idle` `curious` `confident` `excited` `shy` |
| Gesture (a one-shot move) | `pop` `nod` `tilt` `lean` `tipHat` `wiggle` `wave` |
| Trigger kind (default priority) | `section` 1, `signal` 2, `peek` 3, `hover` 5, `focus` 6 |

A *reaction* is `{ expression?, gesture?, message?, priority?, cooldownMs? }`.

## Recipes

**Change a line or a reaction.** Edit the page's config in `config.ts`.

**React to a new element.** Put `data-mascot-field="…"` (or any attribute) on it and add a `targets`
entry with that selector and a `hover` and/or `focus` reaction.

**React to the page's own state** (an order's status, a form's result). Add `signals: { key: reaction }`
to the config, then render `<PageMascot page="…" signal={key or null} />`. Give it a priority above 6
if it should win over field focus.

**Pop up from a card.** Put `data-mascot-peek="id"` on the card. The card needs `relative z-10` and an
opaque background, because it is what hides the mascot's lower half. Then add a `peeks` entry. Use
`minViewportWidth` / `maxViewportWidth` for spots that only work at some sizes.

**Move differently on phones.** Add `phoneFlow` (merged over `flow` at ≤767px). The landing page
docks: `{ mode: 'dock' }`. The request-demo page uses a slot: `{ mode: 'slot', slot: '[data-mascot-slot="demo"]' }`.

**Add a page.**
1. Add its id to `PageId` in `types.ts`.
2. Write its `MascotConfig` and register it in `MASCOT_CONFIGS`.
3. Put the `data-mascot-*` hooks in the markup.
4. Render `<PageMascot page="id" />`.
5. Add the page to the route-scoping test in `tests/mascotEngineLogic.test.ts`, which keeps
   three.js off every other route.

## Tests

`tests/mascotBrain.test.ts` covers the brain's layering, cooldowns and signals.
`tests/mascotEngineLogic.test.ts` covers:
- flow geometry
- peek placement
- gesture maths
- which pages may import the mascot
- that every selector a config names exists in that page's markup

`validateConfig` also runs in dev on every mount and warns in the console.
