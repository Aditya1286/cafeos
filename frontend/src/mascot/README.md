# Caos, the mascot

A hamster in a top hat, holding a QR code. It appears on the landing, login and request-a-demo pages,
the customer's order tracker and (wired in by the café-identity work) a café's own menu, and reacts
to what the visitor does there. It is drawn in 3D (three.js) or, in *light* rendering, as a flat SVG.

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
- **Renderers: how it looks.** Two interchangeable implementations of `MascotEngine` (`renderer.ts`),
  so the brain, config, flow and bubble are the same whichever one draws:
  - *heavy*, `engine/` (three.js), described next;
  - *light*, `lite/createLiteEngine.ts`: one SVG (`lite/assets/hamster.svg`) whose brows, lids and
    mouth are posed per expression by CSS variables, with gestures, blinking and breathing as CSS
    animations (`lite/lite.css`). No animation loop in JS, and it never imports `engine/`, so it
    never downloads three.js (≈ 3.5 KB gzip, JS and CSS).
- **Engine (`engine/`): how the heavy one looks.** `model.ts` builds the hamster from primitives into a named rig
  (head, hat, brows, lids, eyes, paws, QR). `animator.ts` sums independent channels into that rig once
  per frame: expression, idle breathing, scroll lean, look-at, gestures and the entrance. Channels
  only add their own numbers, so nothing fights over a transform. `gestures.ts` holds the one-shot
  moves: pop, nod, tilt, lean, tipHat, wiggle and wave.
- **Shell (`PageMascot.tsx` → `MascotExperience.tsx`): wiring.** `PageMascot` is the only entry point.
  It waits until the page has loaded and the browser is idle, then lazily loads the experience, which
  lazily loads the chosen renderer. If the 3D engine fails (no WebGL, a chunk 404) or loses its WebGL
  context, the light renderer takes over; only if that fails too does the static logo show. A visitor
  can hide the mascot (stored locally), and it respects `prefers-reduced-motion` in both renderers.

## Vocabulary

| Thing | Values |
|---|---|
| Expression (the face, held) | `idle` `curious` `confident` `excited` `shy` |
| Gesture (a one-shot move) | `pop` `nod` `tilt` `lean` `tipHat` `wiggle` `wave` |
| Trigger kind (default priority) | `section` 1, `signal` 2, `peek` 3, `hover` 5, `focus` 6 |

A *reaction* is `{ expression?, gesture?, message?, priority?, cooldownMs? }`. A *message* is
`{ id, text, durationMs?, announce?, actions? }`; `actions` is a list of `{ id, label }` buttons
shown in the bubble (at most 2).

## `<PageMascot>` props

| Prop | What it does |
|---|---|
| `page` | Which config to use: `landing` `login` `order` `demo` `menu`. |
| `signal` | The page's own state, a key of the config's `signals` or of `reactions`. `null` clears it. |
| `rendering` | `'heavy'` (default, 3D) or `'light'` (flat SVG, never downloads three.js). Guest pages pass the café's `mascotRendering`. |
| `reactions` | Extra signals built from the page's data at runtime, `{ key: reaction }`. Replaces the previous set; a key that disappears stops working, and an active signal whose key disappeared is dropped. Config signals win over a reaction with the same key. |
| `dress` | A café theme's look: `{ band, bubbleBg, bubbleFg, bubbleBorder }` (theme tokens `mascotBand`, `bubble*`). Tints the hat band in both renderers and sets the bubble's `--m-bubble-*` colours; action buttons use the same pair, swapped. |
| `onAction` | `(id) => void`, called when a bubble action is tapped; the bubble then closes. Only the action buttons and the hide button take taps: the rest of the mascot never blocks the page. |

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

**Speak from the page's data** (a café's welcome, category tips). Build `{ key: reaction }` from the
data, pass it as `reactions`, and set `signal` to the key that should speak now. Give a message
`actions: [{ id: 'add-usual', label: 'Add' }]` for a tap target, and handle it in `onAction`. The
menu page (`MENU_CONFIG`) works only this way: it docks in a corner on every viewport and has no
sections, targets, peeks or signals of its own.

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

`tests/mascotBrain.test.ts` covers the brain's layering, cooldowns, signals and runtime reactions.
`tests/mascotBubbleAction.test.tsx` (jsdom) covers the bubble's actions, the renderer choice, the
heavy→light fallback and the theme dressing, with stub renderers.
`tests/mascotEngineLogic.test.ts` covers:
- flow geometry
- peek placement
- gesture maths
- which pages may import the mascot, and that three.js stays in `engine/` (the light renderer never
  imports it, and is itself only loaded by a dynamic import)
- that every selector a config names exists in that page's markup

`validateConfig` also runs in dev on every mount and warns in the console.
