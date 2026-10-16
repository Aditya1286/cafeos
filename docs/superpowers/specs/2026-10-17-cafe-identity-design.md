# Café Identity: themes, a mascot that knows you, and a wait worth having

Status: design, awaiting approval · Date: 2026-10-17 · Area: customer-facing pages (menu, order tracker), owner settings, super admin, backend

## 1. Summary

Every café on Caos currently looks like Caos to its guests. This project gives each café its own identity that guests remember, built entirely around ordering, because that is when we have the guest's attention.

The design has four parts, plus two platform switches:

1. **Café themes.** A café picks a pre-built, Caos-approved *skin*: a theme plus one of its colour variants. The skin restyles everything a guest sees. The café can't tweak individual colours or fonts. We launch with three themes: **Warm Classic**, **Modern Minimal** and **Cozy Night**.
2. **The mascot as an ordering partner on the menu.** It welcomes a returning guest once, by name ("Welcome back, Asha! Kadak masala chai again?"). As the guest scrolls through categories, it quietly points at that category's real best seller.
3. **The order tracker as the café's stage.** While the order is cooking, the guest sees dishes that genuinely go with what they ordered, and the mascot asks one playful, one-tap question.
4. **The mascot's memory.** It remembers each guest's answers and usual order *per café*. The next welcome is built from them, so it is different every visit.
5. **Platform switches, owned by the Caos team:**
   - a **master switch** that turns all of the above off, so every café falls back to exactly today's experience
   - a **per-café switch**, so the team turns café identity on café by café
   - a **mascot rendering switch**: heavy (3D) or light (flat)

## 2. Why

The product owner's words:
- "converting cafes into something memorable"
- "we need to be sure from our end, that the cafe sticked to their mind. just by ordering, what can we do"
- "its their ordering partner, not an headache. plain and simple"

Our advantage is that every guest order on Caos already carries a **verified phone number** (OTP before placing an order). So, uniquely, we can recognise a returning guest and measure whether they came back. A café's own identity (how it looks and how it greets you) and *being remembered* are the two things a QR menu normally strips away. This project gives both back.

Most café owners don't have design taste ("most owners dont have taste tbh"). So identity has to come from **curated, pre-built skins**, not from customisation.

## 3. Goals, non-goals, anti-goals

### Goals
- **G1.** Each café presents a distinct, polished identity across every guest-facing surface it controls: the customer menu, the order tracker, and the mascot's look and voice.
- **G2.** A returning guest is recognised and greeted personally, once per visit, without any extra step on their part.
- **G3.** The wait for food becomes a moment for the café: relevant add-ons and a playful question.
- **G4.** The mascot's personal memory makes each return visit feel different and alive.
- **G5.** The Caos team can switch the whole feature off, and choose heavy or light mascot rendering, without code changes.
- **G6.** We can tell from data whether it works: return rate and engagement per café (see §11).
- **G7.** Adding a theme, a colour variant, a question or a line of mascot copy later is a small, local change (see §13).

### Non-goals (explicitly not in this project)
- Shareable bill / visit card (was idea 4).
- Visit stamp card or loyalty rewards (was idea 5, "will add later").
- Next-day WhatsApp nudges (was idea 6).
- Paid exclusive "signature themes" for one café. This is a future upsell; the design must not block it (see §13).
- Theming the owner/staff dashboard or super admin. These stay in the Caos look.
- Theming printed, PDF or e-bills. The tracker page is themed; the bill document is not, for now.
- AI-generated copy. Every mascot line comes from templates we write (§9.4).
- Owners viewing individual guests' answers.

### Anti-goals (would be a failure even if it "works")
- **The mascot is a headache.** It covers menu items or add buttons, blocks taps, repeats itself, needs dismissing more than once, or talks constantly.
- **A slower menu.** The guest menu must open as fast as today on a cheap phone on patchy data. The mascot must never delay the menu's first render or the first tap on "Add".
- **Ugly cafés.** An owner can produce a bad-looking menu through choices they make.
- **Creepy or leaky recognition.** Knowing someone's phone number reveals their name or habits. Memory crosses from one café to another. A guest on a shared phone can't make the greeting go away.
- **Made-up facts.** "Most ordered", "goes well with" or "7 in 10 add it" shown when the sales data doesn't say so. The codebase already enforces this rule for "Popular" tags (`backend/src/services/menuPopularity.service.ts`).
- **Fragile off-switch.** With the master switch off, anything differs from today's experience.

## 4. Decisions made by the product owner (not open for the builder to change)

| # | Decision |
|---|---|
| D1 | Café identity comes from **pre-built, Caos-approved themes**, applied like a skin. Owners do not edit colours, fonts or shapes. |
| D2 | Launch themes: **A · Warm Classic**, **C · Modern Minimal**, **D · Cozy Night**, as shown in the brainstorm mockups (§6.2). Street Bold is not in the launch set. |
| D3 | Themes are **shared**, not exclusive. Neighbouring cafés are told apart by a small set of **approved colour variants per theme**, plus their own name, logo, photo and dishes. |
| D4 | A **master boolean** turns the entire feature off. It is controlled by the Caos team. |
| D5 | A **boolean switch for heavy (3D) vs light (flat) mascot rendering**, controlled by the Caos team, plus work to make the heavy rendering faster. |
| D6 | The returning-guest welcome is a **small mascot popup, shown once**. |
| D7 | As the guest scrolls categories, the mascot's message **changes to that category's best items, generated dynamically**. |
| D8 | The order tracker shows **best recommendations** and/or **a personal question** to keep the guest engaged on that page. |
| D9 | The mascot **remembers answers** and uses them dynamically on later visits. |
| D10 | Ideas 4, 5 and 6 (shareable bill, stamp card, WhatsApp nudge) are **out**. |
| D11 | Code must be **modular, extensible and readable** (the owner's words). |
| D12 | **Recognition needs real proof.** Only a **fresh OTP completed on this device** earns a guest pass. A device that already holds a valid pass renews it without another SMS (§10.4). |
| D13 | **"Add" on a pairing adds items to the existing order** (a new "amend order" flow), not a second order (§9.1, §10.7). |
| D14 | **Two levels of switch:** the global master switch, plus a **per-café on/off** controlled by the Caos team in super admin. A café gets café identity only when both are on (§7). |
| D15 | **The production mascot (heavy or light) is decided by a stress test** against fixed limits on a cheap-phone profile (§8.5). |

## 5. The guest journey (what it should feel like)

Asha, a regular at "Chai Point" (theme Warm Classic, terracotta variant):

1. **She scans the table QR.** The menu opens instantly in cream and terracotta, with Chai Point's logo, its café photo as the cover, and "Kadak chai, made slow." under the name.
2. About a second after the menu is usable, the mascot pops up small in a corner, wearing a terracotta hat band, and says **"Welcome back, Asha! Kadak masala chai again?"** with a one-tap **Add** for her usual. It speaks once, then settles quietly. She never has to close anything.
3. **She scrolls to Snacks.** The mascot's line changes: **"Snacks? The peri peri fries are the most ordered here."** At Desserts, a new café with too little data, it says nothing.
4. **She orders.** The tracker page is in the same skin. The status is the hero. Under it, **"Goes well with your chai: Bun Maska"** with an **Add** button, and the mascot asks **"Chai mood today: kadak or meetha?"** She taps *kadak*, and the mascot replies **"Kadak it is. Strong choice."**
5. **Next week** she is greeted with something built from that answer and her usual order. The line is not the same as last time.

Ravi visits for the first time: the same skin, no welcome-back, plain category tips, and the same tracker experience. After his first verified order, he is "known" next time.

## 6. Part B: café themes

### 6.1 What a theme is
A theme is a **complete, versioned design package** that we author and approve. It defines:
- **surface tokens:** page background, card/surface, raised surface, borders, text (primary, muted), on-accent text
- **an accent palette** (the 11-step `brand-*` scale the app already uses, 50 to 950)
- **typography:** a display font and a body font (Google Fonts or self-hosted), weights and sizes for the menu's few text styles
- **shape:** corner radii for cards, chips, buttons and images, card border and shadow style
- **badge styles**, for "House special" and "Most ordered"
- **the cover treatment**: how the café photo is cropped and overlaid, and the fallback when there is no photo (a theme-designed gradient or pattern)
- **mascot dressing:** the hat band colour, and the speech bubble's background, text and border
- **one or more colour variants.** A variant swaps the accent palette (and, where the theme designer says so, a few surface tints), never fonts or shapes.

The owner chooses only **theme + variant**. Everything else follows.

### 6.2 Launch themes (from the approved mockups)

| Theme | Feel | Fonts (mockup) | Base | Accent (default variant) | For |
|---|---|---|---|---|---|
| **Warm Classic** | cream paper, terracotta, a serif with character | Fraunces (display), Inter (body) | `#fbf5ec` cream, ink `#3b2a1e` | terracotta `#b4532a` | chai houses, bakeries, family cafés |
| **Modern Minimal** | white space, one quiet accent, no decoration | Inter only (tight display tracking) | `#ffffff`, ink `#18181b` | sage green `#2f6b45` | specialty coffee, health cafés, premium spots |
| **Cozy Night** | dark espresso with a warm amber glow | Space Grotesk | `#1c1612`, text `#f3e9dc` | amber `#f59e0b` | late-night cafés, dessert bars, lounges |

Each launch theme ships with **3 colour variants**. The builder or designer chooses the exact variants within the theme's spirit, e.g. Warm Classic: terracotta, olive, plum. Every variant must pass the contrast rules in §12.

The brainstorm mockups (`.superpowers/brainstorm/*/content/cafe-looks.html`, local only, not committed) are the visual reference for A, C and D.

### 6.3 The default look
A built-in **"Caos" theme** reproduces today's customer menu and tracker exactly. It is used when:
- the master switch is off
- a café hasn't chosen a theme
- a café's stored theme or variant id is unknown (e.g. a theme was retired)

This is what makes the off-switch safe (anti-goal "fragile off-switch").

### 6.4 What the café provides (content, not design)
- **Name** and **logo** (`logoUrl` already exists on Business)
- **Café photo** for the cover (`coverImageUrl` already exists)
- **A tagline:** optional, one line, at most 80 characters. The settings screen offers a handful of suggested lines to pick from (my call: e.g. "Made fresh, served with love").
- **"House special"** marks on dishes: an owner toggle per product (new field). At most 3 per café, so the badge keeps meaning something (my call).
- Dish photos, already supported

The theme decides how each of these is shown. A missing logo or photo falls back to a theme-designed treatment, never a broken image.

### 6.5 Where the theme applies
- **Customer menu page** (`frontend/src/pages/CustomerMenuPage.tsx` and its organisms)
- **Order tracker page** (`frontend/src/pages/CustomerOrderTrackingPage.tsx`)
- the **mascot** on both: hat band and bubble
- **Not:** the checkout return page, the dashboard, super admin, the marketing site, printed bills. The checkout return page stays default for now (my call). It's transient and payment-critical.

### 6.6 Choosing a theme
- **Owner** (role OWNER only): in the dashboard Settings tab, a **Café look** card. It shows the three themes as phone-sized previews built from **their own** menu data (name, logo, photo, first categories and dishes), with variant swatches under each. Choosing saves immediately and shows a "Preview your menu" link. If the master switch is off, the card is hidden.
- **Super admin:** can set or clear any café's theme and variant from the existing business management screens (for onboarding calls).
- New cafés start on the default "Caos" look until a theme is chosen (my call: no auto-assigned theme).

## 7. Part A: platform switches

Two settings, owned by the Caos team, live in the backend config introduced earlier (`backend/src/config`: sectioned `config.<env>.json`, `config_template.json`, `types.ts`, validated at boot):

```json
"cafeIdentity": {
  "enabled": true,
  "mascotRendering": "heavy"
}
```

- **Per-café switch:** `Business.identity.enabled` (boolean, default `false`), set only by super admin, with `identity.enabledAt` recorded when it is turned on. **A café gets café identity only when the global switch and its own switch are both on.** That covers the theme, the owner's Café look card, the menu mascot, the welcome, tips, tracker extras, guest passes and memory. It works whether or not the café has picked a theme yet: guest features run on the default look until it does. One helper (`isIdentityOnFor(business)`) owns this check, and every service and the frontend's `identity.enabled` flag use it.
- `cafeIdentity.enabled` is the **master switch**. When `false`, it overrides every café's switch:
  - every café renders the default "Caos" look
  - the mascot does not appear on the menu
  - the tracker shows no pairings and no question
  - no guest tokens are issued and no memory is read or written
  - owner theme settings are hidden
  - the existing order-tracker mascot (status messages) **keeps working as today**
- `cafeIdentity.mascotRendering` is `"heavy"` (3D) or `"light"` (flat). It applies wherever the mascot appears for guests (menu and tracker). The landing, login and request-demo pages keep the 3D mascot regardless (my call: this switch is about guest pages on cheap phones).

Both are delivered to the frontend inside the existing public business payload (`GET /api/v1/public/c/:slug`) as part of an `identity` block (§10.3), so there is no extra request.

These are config-file values, so a change needs a restart or redeploy (my call: simplest, and it matches "that will be our thing"; a runtime super-admin toggle can come later without changing anything else).

## 8. Part C: the mascot on the menu

### 8.1 Behaviour
- **Arrival:** the mascot loads only **after the menu is interactive and the browser is idle** (existing `PageMascot` behaviour). On a phone it sits **docked small in the bottom-right corner** (the `dock` flow mode added for the landing page). It must never sit over the cart bar or the add buttons: the builder reserves its corner and adjusts the dock insets so it clears the menu's sticky bottom cart bar.
- **Returning-guest welcome (once per visit):** a small popup bubble from the mascot, e.g. "Welcome back, Asha! Kadak masala chai again?", with **one action: "Add"** for the usual dish (when there is one and it is currently available). It closes on its own after a few seconds, on tap outside, or on scroll. It is shown **once per café per browser session** (my call for "visit").
- **First-time or unrecognised guest:** a generic welcome from the café the first time in a session ("Welcome to Chai Point!"), then quiet (my call).
- **Category tips:** when a category section becomes the one in view, the mascot's line changes to that category's best seller: "Snacks? The peri peri fries are the most ordered here." Rules:
  - only categories with real data (§8.3); otherwise the mascot is silent for that category
  - each category tip is shown at most once per session
  - a tip never interrupts the welcome
  - tips stop after the guest adds the first item to the cart (my call: it is a partner, not a salesperson)
- **Interaction:** the bubble and the mascot never intercept taps meant for the page. Only the bubble's own action button and the existing hide button are tappable. The visitor can minimise the mascot (existing behaviour, remembered locally).

### 8.2 Rendering modes
- **Heavy:** the existing three.js engine (`frontend/src/mascot/engine`), dressed with the theme (hat band colour param, bubble colours from theme tokens).
- **Light:** **must not download three.js.** A flat version of the same character (pre-rendered images per expression, or SVG), with simple CSS motion for the gestures (bob, tilt, wave). It uses the same brain, config, flow and bubble, so behaviour is identical and only the drawing differs. The builder chooses the asset technique (e.g. render the 3D model once per expression to WebP at build time).
- **Reduced motion:** in either mode, honour `prefers-reduced-motion` as the mascot does today.
- **Failure:** if heavy fails (no WebGL), fall back to light, not to the logo poster.

### 8.3 "Best items" data
- Per category, the top item by number of separate orders in the last 30 days, with a minimum of 5 orders. This mirrors the existing popularity rule (`menuPopularity.service.ts`: `POPULAR_WINDOW_DAYS`, `POPULAR_MIN_ORDERS`), extended to rank per category.
- A dish the owner marked **House special** may be used when a category has no qualifying best seller ("Try our house special, the Bun Maska."). It is labelled as the café's pick, never as "most ordered".
- Computed server-side, cached per café (like the existing 10-minute popularity cache), and delivered with the menu.

### 8.4 Performance work on the heavy mascot
Baseline measured on 2026-10-17: the 3D engine chunk (`createEngine-*.js`) is **560 KB raw / 143 KB gzip**. It is loaded only after idle and never on the menu today. Work items:
- Cut the three.js footprint: replace `import * as THREE` with named imports, check what tree-shakes, and drop unused features. Target **≤ 100 KB gzip** for the engine chunk (a goal, not a hard gate; report the result).
- Keep the existing protections: pixel-ratio cap, pause while off-screen or tab hidden, calm frame rate, context-loss fallback.
- On the menu, the heavy engine is fetched only after idle **and** after the first meaningful paint of the menu. Its download must not compete with dish images above the fold (use idle-time prefetch).
- Light mode payload target: **≤ 30 KB gzip**, assets included.

### 8.5 Stress test: which mascot goes to production (D15)
Production rendering is **decided by measurement, not by preference**. Both modes run the same stress test. **Heavy ships only if it passes every limit below. Otherwise light ships**, and heavy waits for another round of optimisation. Light must pass too: it is the fallback, so if light fails, the failure is fixed before launch.

**Test conditions (cheap-phone profile):**
- **Emulated:** Chrome mobile emulation at 390×844, DPR 2, **4× CPU slowdown**, network **"Slow 4G"** (≈1.6 Mbps down, 150 ms RTT), and a cold cache.
- **Real device:** at least one low-end Android phone (≈₹8–12k class, 3–4 GB RAM), Chrome, over mobile data. Heavy must pass here too, not only in emulation.
- **Data:** a themed café (each of the three themes) with a realistic menu: **8 categories, 60 dishes, 40 with photos**, category tips present, and a returning guest so the welcome shows.
- **Baseline:** the same runs with the mascot **off**. Every limit below is a *difference from baseline* unless it says otherwise.

**Scenarios:**
1. **Cold open:** scan → menu interactive → the welcome appears.
2. **Scroll storm:** 30 s of continuous fling-scrolling through all categories, so category tips fire, with 10 add-to-cart taps spread through it.
3. **Tracker soak:** the order tracker left open for 10 minutes while the order moves PLACED → PREPARING → READY, with the daily question answered once.
4. **Navigation churn:** 20 round trips menu ↔ tracker without a reload.

**Limits (all must pass):**

| What | Limit |
|---|---|
| Menu becomes usable (first "Add" works) | ≤ **+100 ms** vs baseline |
| Largest Contentful Paint on the menu | ≤ **+100 ms** vs baseline |
| Mascot download starts | only **after** the menu is usable; never competes with above-the-fold images |
| Mascot download size | heavy ≤ **100 KB gzip**; light ≤ **30 KB gzip** (§8.4) |
| Scrolling during the scroll storm | median ≥ **50 fps**; ≤ **5 %** of frames longer than 50 ms |
| Long tasks caused by the mascot | none longer than **100 ms** |
| Add-to-cart responsiveness (INP, p75) | ≤ **200 ms**, and ≤ **+30 ms** vs baseline |
| Extra memory (JS heap + GPU estimate) | ≤ **40 MB** |
| Memory drift over the 10-min tracker soak | ≤ **5 MB** (no leak) |
| Main-thread CPU while the mascot idles (tracker) | ≤ **5 %** averaged over 60 s |
| Navigation churn | **0** WebGL context losses or errors over the 20 round trips; and if a context is lost on purpose, the light fallback appears within 1 s |

**How it is run:**
- A scripted harness drives headless Chrome over the DevTools protocol, the same way the screenshots in this project were taken. It applies the throttling, runs the four scenarios for each mode and theme, and writes a pass/fail report with the measured numbers.
- The harness lives outside the app bundle, e.g. `frontend/perf/mascot-stress/` with an npm script. Its numbers come from performance traces (frames, long tasks, LCP, INP via the web-vitals approach) and from `performance.measureUserAgentSpecificMemory` or heap snapshots.
- The real-device pass is done by hand with remote debugging, using the same scenarios, and recorded in the report.
- The report is checked in next to the harness, so the decision and its evidence stay together.
- The limits live in one config file in the harness, so tightening them later is a one-line change.

**Decision rule:**
1. Heavy passes everything, emulated and real device → production uses **heavy**.
2. Heavy fails anything → production uses **light**. The report says which limits failed and by how much. Heavy is re-tested after optimisation.
3. Light fails anything → launch is blocked until light passes.
4. Re-run the test whenever the mascot engine, the light renderer or the menu page changes in a way that could affect these numbers. Rendering can be switched with `cafeIdentity.mascotRendering` at any time without code changes (§7).

## 9. Part D: the order tracker as the café's stage

The tracker page (`CustomerOrderTrackingPage.tsx`) keeps its current structure: status first, with the mascot's status line (existing `ORDER_CONFIG` signals). Two new, optional blocks go **below the status**, under a small "While you wait" heading. They are shown only while the order is **PLACED or PREPARING**, and hidden once it is READY, COMPLETED or CANCELLED.

### 9.1 "Goes well with your order" (pairings)
- **What:** 1 or 2 dishes from the same café that guests most often order **together with** the items in this order, over the last 30 days. Minimum support: the pair appeared together in ≥ 5 orders (my call, mirroring `POPULAR_MIN_ORDERS`). The dish must be currently available and not already in the order.
- **Copy:** "Goes well with your masala chai: Bun Maska". A proportion such as "7 in 10 add it" may be shown **only if computed from real data** and only at ≥ 20 qualifying orders (my call). Otherwise there is no number.
- **Action:** **Add** adds the dish (quantity 1, adjustable before confirming) **to this same order** through the amend flow (§10.7). The guest sees a small confirm sheet on the tracker with the dish, the price and the new order total, and taps **Add to my order**. The tracker never navigates away.
- **When Add is offered:** only while the order is PLACED or PREPARING, **unpaid**, and not an online-checkout (SMEPay) order. For a paid or checkout order, the pairing is shown with "Ask your server to add it" and no button (my call: amending a paid order would need a second payment, which is out of scope).
- **Fallback:** no qualifying pairings means the block is not shown. A house special is not used here.

### 9.2 The daily question
- One playful question per order, from a **bank we write** (§9.4). It is answered with **one tap** from 2 to 5 options (text or emoji).
- Rotation: the guest is not asked a question they have already answered at this café until the bank is exhausted, and is not asked twice within one visit. Anonymous guests can't exist on the tracker (orders require a verified phone), so every answer can be remembered.
- After answering, the mascot replies in its bubble with a line written for that answer ("Kadak it is. Strong choice.") and a fitting gesture. The question card collapses to a small "Answered ✓" line.
- It is optional and dismissible ("Not now"), never blocks the status, and is never asked once the order is ready.

### 9.3 Mascot memory (Part F)
- **What is remembered**, per guest **per café**:
  - first name (from the order's `customerName`)
  - the latest answer to each question, with the date
  - the last visit date
  - the usual order: the guest's most-ordered dish at that café, derived from their orders at query time (no copy stored)
- **Keying:** the guest's verified 10-digit phone + businessId. Memory never crosses cafés.
- **Retention:** a record expires **365 days after the guest's last visit** at that café (TTL index; my call).
- **Use:** the next welcome (§8.1) is chosen from templates that use the remembered facts. Each answer option carries one or more welcome templates, e.g. for "kadak": "Welcome back, {name}! Kadak {usual} again?". When there is nothing to use, fall back to "Welcome back, {name}! Your usual {usual}?", then "Welcome back, {name}!".
- **Variety:** pick among the eligible templates, avoiding the one used last time for this guest (store the last template id).
- **Owners do not see individual answers.** Aggregate views ("60% of your regulars like it kadak") are a possible later feature and out of scope.

### 9.4 Copy banks (questions, replies, welcomes, tips)
- They live in code as typed data modules, with one place per bank (backend, see §10.2). The frontend never holds copy that the backend chooses.
- Each **question**: `id`, `text`, `options[] { id, label, emoji?, reply, replyGesture, welcomeTemplates[] }`, an optional `themes`/`cafeTypes` filter, and an `active` flag.
- Launch with **at least 12 questions** in a café-wide, friendly tone (examples: chai mood kadak/meetha, sleepiness 1–5, rain or sunshine person, sweet or spicy, morning or night person, first visit here was for…). Every question must be safe for every café and every guest:
  - no health, diet-shaming, religion, politics or personal-data questions
  - nothing that asks for information we'd then have to protect
- **Template placeholders:** `{name}` (first name), `{usual}` (dish name), `{cafe}`, `{category}`, `{dish}`. A template whose placeholders can't all be filled is skipped.
- **Copy rules** (extending the landing page's existing rule in `mascot/config.ts`): restate only what is true; no promises of time ("soon", "in 5 minutes"); no claims the data doesn't support.

## 10. Architecture

Follow the codebase's intended layering for new features (`routes → controllers → services → dao → models`, `ServiceError` for business errors, the standard response shape). Use the sectioned config (§7). Keep each concern in its own module so themes, questions and copy can be extended without touching logic.

### 10.1 Data model changes
- **Business:** add `identity: { enabled: boolean (default false; super admin only); enabledAt?: Date; themeId?: string; variantId?: string; tagline?: string; appliedAt?: Date }`. No theme = default look.
- **Order:** add `amendments: [{ at, source: 'pairing' | 'staff', items: [{ productId, name, pricePaise, quantity, itemTotalPaise }], amountPaise }]` (default empty). The order's own `items` and totals include amended items (§10.7). The list records what was added, when and from where.
- **Product:** add `isHouseSpecial: boolean` (default `false`).
- **New collection `GuestProfile`:** `{ businessId, phone (normalised to its last 10 digits; note that `Order.customerPhone` is stored as typed, so orders are matched by pattern as order recovery already does), firstName, answers: { [questionId]: { optionId, answeredAt } }, askedQuestionIds[], lastWelcomeTemplateId?, lastVisitAt, expireAt }`.
  - unique index `{ businessId: 1, phone: 1 }`
  - TTL on `expireAt`, which is set to lastVisitAt + 365 days and refreshed on each order
  - per the repo's index convention, size indexes to the queries
- **New collection `IdentityEvent`** (measurement, §11): `{ businessId, kind, at, orderId?, meta? }`, TTL ~400 days. No phone numbers or names stored here.

### 10.2 Backend modules (suggested names; keep the split)
- `constants/cafeThemes.ts`: the **allow-list** of theme ids and their variant ids (no styling, just ids and display names). It validates what owners and super admin may save. A test keeps it in sync with the frontend registry (as `tests/analyticsViews.test.ts` does for metric ids).
- `constants/guestQuestions.ts` and `constants/mascotCopy.ts`: the copy banks (§9.4).
- `utils/guestToken.ts`: the guest recognition token (§10.4), modelled on `utils/recoveryToken.ts`.
- **Services:**
  - `cafeIdentity.service.ts`: identity block, theme validation, owner/admin updates
  - `guestMemory.service.ts`: profile upsert on order, answers, the welcome line
  - `menuTips.service.ts`: per-category best sellers and tip lines, cached
  - `pairings.service.ts`: co-ordered dishes, cached
  - `dailyQuestion.service.ts`: picking the question, recording the answer, the reply
  - `identityEvents.service.ts`
- **DAOs** for GuestProfile and IdentityEvent: pure query wrappers.
- Every service checks `cafeIdentity.enabled` first and returns the "feature off" shape (empty or absent) when it is off. One helper owns that check.

### 10.3 API (suggested shapes; the builder may refine)
**Public:**
- `GET /public/c/:slug` (existing): adds `identity: { enabled, mascotRendering, theme: { id, variantId } | null, tagline }`.
- `GET /public/orders/:id` (existing, used by the tracker for its café details): adds the same `identity` block, because the tracker doesn't call `/c/:slug`.
- `GET /public/c/:businessId/menu` (existing): adds `categoryTips: { [categoryId]: { productId, line } }` and `houseSpecialIds[]` when identity is enabled.
- `GET /public/c/:businessId/welcome`: header `X-Guest-Token` → `{ line, usualProductId? }`, or `204` when the token is missing, invalid or expired, or memory is empty. Never returns the phone number.
- `GET /public/orders/:id/while-you-wait`: by order Mongo `_id` only (existing public-order rule) → `{ pairings[], question? }`.
- `POST /public/orders/:id/answer`: body `{ questionId, optionId }` → `{ reply, gesture }`. It records to the GuestProfile of the order's phone and café.
- `POST /public/orders/:id/add-items`: body `{ items: [{ productId, quantity }], source: 'pairing' }` → the updated public order. By order Mongo `_id` only. Requires the guest pass for this order's phone and café (`X-Guest-Token`), so only the device that placed it can add to it. Subject to the rules in §9.1 and §10.7.
- `POST /public/identity-events`: fire-and-forget measurement events (rate-limited).

**Order placement (existing `POST /public/orders`):** when identity is enabled, the response also carries `guestToken`, and the GuestProfile is upserted (firstName, lastVisitAt, expireAt), subject to the proof rule in §10.4. Orders paid through online checkout are created later, when the payment is confirmed, so their token is delivered with the checkout result or the tracker's first load instead (builder's choice of channel).

**Owner (protected):** `PUT /business/identity` with `{ themeId, variantId, tagline }`, OWNER only and validated against the allow-list. The `isHouseSpecial` toggle goes through the existing product update, with the max-3 rule enforced in the service.

**Super admin:** turn a café's identity on or off (`identity.enabled`); set or clear its theme and variant; read the measurement summary (§11).

**Rate limits:** the new public endpoints use limiters in the style of the existing ones in `publicRoutes.ts`.

### 10.4 Guest recognition and privacy
- Recognition works **only** through a **guest token** that the guest's own device received when it placed a verified order. **It never works from a phone number.** Knowing a phone number must not reveal a name, an answer or a usual order. This follows the existing stance on `VerifiedPhone` / RECOVERY in the codebase.
- The token is stateless and HMAC-signed with a key derived from the JWT secret, in the same way as `utils/recoveryToken.ts`, with its own `typ` (`guest`). It carries the phone and the businessId. It is **valid only at that one café** and lasts 180 days (my call).
- **Proof rule (D12).** A pass is issued only for an order placed with one of these two proofs:
  - **(i) fresh-OTP proof from this device.** When the guest completes an OTP in this browser (`/otp/verify` or `/otp/confirm-token`), the response also carries a short-lived **device proof**: a signed token with its own `typ`, valid about 30 minutes, for that phone. The order request sends it, and the order response returns a guest pass.
  - **(ii) a valid guest pass** for the same phone and café. The pass is **renewed** with a fresh 180-day expiry. No SMS is sent.
  
  An order placed **without** either proof is accepted exactly as today (inside the existing 14-day verification window). It **gets no pass and changes no memory**: no `firstName` update, no answers, no visit refresh. So knowing someone's number never earns their greeting, and never lets anyone rewrite their memory.
- **No extra SMS.** OTPs are only sent when the existing flow already asks for one (my call). A new device inside someone's 14-day window simply isn't recognised until that guest next completes a fresh OTP there.
- Every write to a GuestProfile (order upsert, question answers) requires one of the two proofs. Answers posted with a pass for a different phone or café are rejected.
- The frontend stores tokens per café in localStorage, using a small module like `utils/recentOrders.ts` (guarded, never throws, private windows just mean "not recognised").
- **"Not you?"** A small link in the welcome bubble forgets this café's token on this device, and the welcome becomes generic. This covers shared phones.
- The welcome shows the **first name only**.

### 10.5 Frontend modules (suggested layout)
- `src/themes/`: the theme system, isolated from pages.
  - `types.ts`: `ThemeDefinition { id, name, description, fonts, tokens, variants: VariantDefinition[] }`
  - `caos.ts` (default), `warmClassic.ts`, `modernMinimal.ts`, `cozyNight.ts`: one file per theme, pure data
  - `registry.ts`: all themes by id; `resolveTheme(themeId, variantId)` falls back to `caos`
  - `applyTheme.ts`: writes tokens as CSS variables on a scoped root element (not `<html>`, so the dashboard is never affected), and loads the theme's fonts on demand
  - `CafeThemeScope.tsx`: wraps a customer page and applies the resolved theme
- **Tailwind:** a `cafe` token namespace (e.g. `bg-cafe-page`, `bg-cafe-surface`, `text-cafe-ink`, `text-cafe-muted`, `border-cafe-line`, `font-cafe-display`, `font-cafe-body`, `rounded-cafe-card`, and the accent scale) reading those CSS variables, just as `brand-*` reads `--brand-*` today. The customer menu and tracker components move from hard-coded colours to `cafe-*` tokens. With the default `caos` theme the pages must look **identical to today**; check with before/after screenshots.
- **Mascot** (`src/mascot/`, extending what exists; see `src/mascot/README.md`):
  - new page ids `menu` (and the tracker keeps `order`)
  - `MENU_CONFIG` with `phoneFlow: { mode: 'dock' }`
  - **dynamic reactions:** the menu builds category-tip reactions at runtime from `categoryTips`. Extend `PageMascot` and `MascotBrain` to accept a page-supplied reaction map (merged with the config's signals) rather than hard-coding categories in config. Keep `validateConfig` covering them.
  - **dressing:** the theme supplies the hat band colour (engine param) and bubble colours (CSS variables on the mascot host)
  - **rendering:** `PageMascot` gains `rendering: 'heavy' | 'light'`. The light renderer lives in its own lazily loaded module and never imports `engine/`.
  - **welcome bubble with an action:** the bubble gains an optional action button (the one interactive element besides hide). Everything else stays `pointer-events: none`.
  - update the route-scoping test in `tests/mascotEngineLogic.test.ts`. The menu page may now import `PageMascot`, but `three` must still be imported only from `mascot/engine/`, and light mode must not pull the engine chunk.
- **Tracker:** `organisms/customer-order/WhileYouWait/` with `PairingCard` and `DailyQuestionCard`. These are presentational. Data comes through a `useWhileYouWait(orderId)` hook and a `services/public/whileYouWait/` service module, following the frontend service-layer convention.
- **Owner settings:** `organisms/dashboard/CafeLookCard/` with previews and variant swatches, using `services/dashboard/identity/`.

### 10.6 Extension points (designed in, not built now)
- **A new theme:** add a theme file to `src/themes/`, register it, add its ids to `backend/src/constants/cafeThemes.ts`. A sync test fails if they drift. No page code changes.
- **A new variant:** add to the theme file and the allow-list.
- **A new question or line of copy:** edit the backend copy bank. No frontend change.
- **Signature (exclusive) themes later:** the allow-list entry can carry `exclusiveTo?: businessId[]`, which the service enforces. The registry is unchanged.

### 10.7 The amend-order flow (D13)
A new capability of the order system, used by pairings now and by staff later (`source: 'staff'` is reserved, with no UI in this project). It must follow the same money rules as order placement. Build it next to `orderPlacement.service.ts`, reusing its pricing helpers rather than copying them.
- **Allowed when:**
  - the order is PLACED or PREPARING
  - `paymentStatus` is UNPAID
  - it is not a checkout (SMEPay) order
  - the café's identity is on (for `source: 'pairing'`)
  - every product is available and belongs to the café
  
  Otherwise the request is rejected with a `ServiceError` and a clear code (e.g. `ORDER_NOT_AMENDABLE`).
- **Money:** recompute subtotal, GST (the café's current `taxRatePercentage`, as at placement), commission/platform fee and `businessEarningsPaise` for the whole order, in integer paise. Update the financial ledger exactly as placement would have for the final totals. Use a transaction or an atomic update guarded on status, so a concurrent status change (e.g. the kitchen marking it READY) can't race an amendment in.
- **Kitchen:** emit the updated order to the business and order rooms (the mutate-then-emit pattern). The kitchen board and the order details show amended items clearly, e.g. an **"Added"** marker with the time on each amended line, so cooks notice them on a ticket already in progress.
- **Bill:** the e-bill and order totals show the amended items like any other line. The `amendments` list stays for audit.
- **Limits:** at most 3 amendments per order and 10 added units in total (my call), plus a rate limit on the endpoint.

## 11. Measurement: "be sure from our end"

- **Primary metric:** the **30-day return rate** per café. This is the share of guests (by phone) with an order whose next order at the same café comes within 30 days. It is computed from existing orders, with no new tracking. It is compared before and after the café's identity was switched on (`identity.enabledAt`). Theme adoption (`identity.appliedAt`) is shown alongside.
- **Engagement events** (`IdentityEvent`):
  - `welcome_shown`
  - `welcome_usual_added`
  - `tip_shown`
  - `pairing_shown`
  - `pairing_added`
  - `pairing_ordered` (an amendment with `source: 'pairing'`)
  - `question_shown`
  - `question_answered`
  - `not_you_clicked`
- **Readout:** a simple per-café table in super admin (return rate, adoption date, event counts for the last 30 days). There is no owner-facing analytics for this in v1 (my call).

## 12. Constraints and quality bars

- **Performance:**
  - the menu's first render and first "Add" tap are not delayed by any part of this
  - theme fonts load with `font-display: swap` and are limited to the weights the theme uses
  - theme CSS variables are applied before first paint of the themed area, with no flash of the default look on a themed café (the identity block arrives with the business payload the page already waits for)
- **Accessibility:**
  - every theme and variant passes **WCAG AA** contrast for body text and buttons (a unit test checks the token pairs)
  - the welcome and tips are announced politely, at most once each
  - the action button is reachable by keyboard
  - reduced motion is honoured
- **Phones first:** check at 360–390 px wide. The mascot never covers the cart bar, add buttons or the order status.
- **Security and privacy:** §10.4. New public endpoints are rate-limited, take ids only in the forms the app produces, and never echo phone numbers.
- **Off-switch fidelity:** with `cafeIdentity.enabled = false`, the guest pages are pixel-identical to today (a screenshot test or a documented manual check), and the new endpoints return their "off" shapes.
- **Existing conventions:** the config rule (no `process.env` reads), the standard response shape, money in paise, tests in `tests/` folders only, and the colour rule for the owner dashboard (`brand-*` accent, status colours only for meaning) in the new owner Settings card.
- **Tests:**
  - backend: services with an in-memory Mongo harness (`tests/helpers.ts`), covering:
    - token scope (one café only, rejected elsewhere), and never recognising by phone
    - **no pass and no memory write for an order placed without a fresh-OTP proof or a pass**
    - memory TTL fields
    - pairing and tip thresholds (no fabricated facts below the minimums)
    - both switch levels (global off, café off) returning their "off" shapes
    - **the amend flow:** totals, GST, commission and ledger match a placement of the final items; rejected when paid, checkout, READY or later; a status race can't let an amendment in; kitchen and order rooms receive the update
  - frontend: theme registry and contrast, the backend/frontend id sync, mascot config validity for the new pages, and that light mode does not import the engine

## 13. Rollout

1. Ship with `cafeIdentity.enabled = false` in production config. Turn it on in development and staging.
2. Turn the global switch on in production; every café's own switch is still off by default, so nothing changes yet. Then switch on the demo cafés (they already exist under `backend/src/demo`), then a few real cafés chosen by the team, from super admin.
3. Watch the readout (§11) for 4 weeks before wider enablement.
4. Before production enablement, run the stress test (§8.5) and set `mascotRendering` to whatever the decision rule picks. Until the test has been run, production config stays on `"light"`.

## 14. Left to the builder

- Exact variant colours per theme (3 each, AA-compliant, in each theme's spirit).
- The light mascot's asset technique, and the exact heavy-engine optimisations.
- Exact endpoint paths and response field names (keep the shapes in §10.3).
- Copy for questions, replies and welcome templates within the rules in §9.4 (the product owner may review the bank before launch).
- Exact dock insets and bubble placement on the menu, as long as nothing in §12 is broken.
- Internal file names within the module layout of §10.

## 15. Calls made by the designer (not decided by the product owner; check these)

1. The master and rendering switches are **config-file values** (restart to change), not a live super-admin toggle (§7).
2. `mascotRendering` applies to guest pages only; the marketing and login pages keep 3D (§7).
3. "Once per visit" means **once per café per browser session** (§8.1).
4. Category tips stop after the first item is added to the cart (§8.1).
5. A House special may stand in for a category with no best seller; at most 3 per café (§6.4, §8.3).
6. The checkout return page is not themed (§6.5).
7. A new café starts on the default look until it picks a theme (§6.6).
8. The tagline is optional, ≤ 80 characters, with suggestions (§6.4).
9. The guest token lasts 180 days and is valid at one café; memory expires 365 days after the last visit (§9.3, §10.4).
10. A "7 in 10 add it" style number appears only from ≥ 20 qualifying orders (§9.1).
11. A measurement readout in super admin only (§11).
12. Production starts with the feature off; rendering is chosen by the stress test (§8.5), with light as the placeholder until it has been run (§13).
13. Guest passes add no extra SMS. A new device within someone's 14-day window isn't recognised until they next complete a fresh OTP there (§10.4).
14. Pairing "Add" is offered only for unpaid, non-checkout orders; paid orders get "Ask your server to add it" (§9.1).
15. Amendment limits: 3 per order, 10 added units (§10.7).
16. The per-café switch gates *everything* for that café, the theme included, not only the guest features (§7).
