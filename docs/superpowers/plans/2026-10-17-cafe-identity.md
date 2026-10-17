# Café Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each café a Caos-approved theme, a mascot that recognises returning guests on the menu, a "while you wait" stage on the order tracker (pairings you can add to the order, plus a daily question), per-café guest memory, and platform and per-café switches. The production mascot (heavy or light) is decided by a stress test.

**Architecture:**
- **Backend:** new features follow the `routes → controllers → services → dao → models` split with `ServiceError`. A single `isIdentityOnFor(business)` gate is checked first by every new service. Copy banks and the theme allow-list are typed data modules.
- **Frontend:** a self-contained `src/themes/` system writes `--cafe-*` CSS variables onto a scoped wrapper around the two guest pages. The existing mascot (`src/mascot/`) is extended with page-supplied reactions, a bubble action, theme dressing and a light renderer.
- **Rollout:** everything is behind `cafeIdentity.enabled` (config) and `Business.identity.enabled` (super admin).

**Tech Stack:** Node 22 / Express / TypeScript / Mongoose (backend tests: `node:test` + supertest + mongodb-memory-server via `tests/helpers.ts`). React 18 / Vite / Tailwind / Vitest (frontend). three.js (mascot engine). Headless Chrome over CDP with `ws` (stress harness).

**Spec:** `docs/superpowers/specs/2026-10-17-cafe-identity-design.md`. Read it before any task; section numbers below (§n) refer to it.

## Global Constraints

- Backend config: a new setting lives in `backend/src/config/config_template.json` + `types.ts` + **every** `config.<env>.json`. Never read `process.env`/`nconf` outside `config/index.ts`.
- Controller response shape: `{ success, data?, message?, error?: { code, message } }`. Business errors are `throw new ServiceError(status, CODE, message)`.
- Money is integer paise in `*Paise` fields. Never floats.
- Public endpoints that touch an order look it up by Mongo `_id` only (`findOrderByPublicId`), never by the human `orderId`.
- Phone comparison uses `phoneKeyOf` from `backend/src/utils/phone.ts` (last 10 digits). Never echo a phone number in a public response.
- "Most ordered"/best-seller facts come only from real orders (≥ 5 separate orders in the last 30 days, excluding CANCELLED/REFUNDED). Never fabricate. A "7 in 10" style share is shown only from ≥ 20 qualifying orders (§9.1).
- Mascot copy: no time promises ("soon", minutes), no claims the data doesn't support (§9.4). Placeholders `{name} {usual} {cafe} {category} {dish}`; a template with an unfillable placeholder is skipped.
- Theme ids (exact, shared by backend and frontend): `warm-classic` (variants `terracotta`, `olive`, `plum`), `modern-minimal` (`sage`, `ocean`, `charcoal`), `cozy-night` (`amber`, `ember`, `mint`). The default look is the built-in theme id `caos` (variant `default`), never stored on a business.
- Every theme/variant passes WCAG AA (contrast ≥ 4.5 for body text and for on-accent button text).
- Limits: House specials ≤ 3 per café. Guest pass TTL 180 days. Device proof TTL 30 minutes. GuestProfile expires 365 days after the last visit. Amendments ≤ 3 per order and ≤ 10 added units in total.
- Mascot: `three` is imported only under `frontend/src/mascot/engine/`. Light rendering never imports `engine/`. Guest pages load the mascot only after the page is usable and the browser is idle.
- Dashboard UI follows the owner-dashboard colour rule (`brand-*` accent; emerald/amber/rose only for status).
- Tests live in `backend/tests/` and `frontend/tests/` only, never under `src/`.
- **Commits:** do not commit unless the human partner has authorised commits for this execution (the repo has their earlier uncommitted work). Where a step says "Commit", run it only when authorised; otherwise skip it and continue.

## Review Focus

1. **A retired or unknown theme/variant id stored on a business** → the guest pages render the default `caos` look with no error (Task 4 test `resolveTheme falls back for unknown ids`).
2. **A guest pass from café A sent to café B** (shared phone, two cafés) → café B's welcome returns 204 and never reveals A's data (Task 9 test `a pass for another café is rejected`).
3. **The kitchen marks the order READY while a pairing add is in flight** → the add is rejected with `ORDER_NOT_AMENDABLE` and totals are unchanged (Task 11 test `amend loses the race against a status change`).
4. **A category's best seller is now unavailable or archived** → no tip names it; the next qualifying item or nothing is used (Task 10 test `unavailable best seller is skipped`).
5. **localStorage blocked (private window)** → ordering still works, and there is simply no recognition and no crash (Task 14 test `pass storage tolerates throwing storage`).

---

## Phase 1: Backend foundation (switches, data, settings)

### Task 1: Platform switch config and the identity gate

**Files:**
- Modify: `backend/src/config/config_template.json`, `config.development.json`, `config.production.json`, `config.test.json`, `backend/src/config/types.ts`, `backend/src/config/index.ts`
- Create: `backend/src/services/cafeIdentity.service.ts`
- Test: `backend/tests/cafeIdentitySwitch.test.ts`

**Interfaces:**
- Produces: `cafeIdentity: ICafeIdentity` exported from `src/config` (`{ enabled: boolean; mascotRendering: 'heavy' | 'light' }`); `isIdentityOnFor(business: { identity?: { enabled?: boolean } } | null | undefined): boolean` in `cafeIdentity.service.ts`

- [ ] **Step 1: Write failing tests**: `isIdentityOnFor` returns `true` only when `cafeIdentity.enabled && business.identity.enabled === true`. It returns false for null, for a business without `identity`, for `identity.enabled` false, and when the global switch is mutated to false (restore it in `finally`).
- [ ] **Step 2: Run** `cd backend && NODE_ENV=test node --test --require ts-node/register tests/cafeIdentitySwitch.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
  - Add the `"cafeIdentity": { "enabled": …, "mascotRendering": … }` section with these values:
    - template: `true`, `"light"`
    - test: `true`, `"light"`
    - development: `true`, `"heavy"`
    - production: `false`, `"light"`
  - Add `ICafeIdentity` to `types.ts` and export `cafeIdentity` from `index.ts`.
  - Add `assertOneOf('cafeIdentity:mascotRendering', ['heavy', 'light'])`.
  - Write `isIdentityOnFor`.
- [ ] **Step 4: Run** the test, then `npx tsc --noEmit -p .`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat(identity): platform switch config and identity gate`.

### Task 2: Data model: business identity, house specials, order amendments, public identity block

**Files:**
- Modify: `backend/src/models/Business.ts`, `backend/src/models/Product.ts`, `backend/src/models/Order.ts`, `backend/src/routes/publicRoutes.ts` (`GET /c/:slug`), `backend/src/controllers/orderController.ts` (`sendOrderDetails`)
- Modify: `backend/src/services/cafeIdentity.service.ts`
- Test: `backend/tests/cafeIdentityPublic.test.ts`

**Interfaces:**
- Consumes: `isIdentityOnFor`, `cafeIdentity` (Task 1)
- Produces:
  - `Business.identity: { enabled: boolean; enabledAt?: Date; themeId?: string; variantId?: string; tagline?: string; appliedAt?: Date }` (schema default `{ enabled: false }`)
  - `Product.isHouseSpecial: boolean` (default false)
  - `Order.amendments: { at: Date; source: 'pairing' | 'staff'; items: IOrderItem[]; amountPaise: number }[]` (default `[]`)
  - `PublicIdentity` type and `toPublicIdentity(business): PublicIdentity` in `cafeIdentity.service.ts`, where `PublicIdentity = { enabled: boolean; mascotRendering: 'heavy' | 'light'; theme: { id: string; variantId: string } | null; tagline: string }`. When `!isIdentityOnFor(business)` → `{ enabled: false, mascotRendering, theme: null, tagline: '' }`.

- [ ] **Step 1: Write failing tests** through the harness (`startHarness`):
  - `GET /api/v1/public/c/artisan-cafe` → `data.identity` deep-equals `{ enabled: false, mascotRendering: 'light', theme: null, tagline: '' }` for a seeded café.
  - After `Business.updateOne({slug}, {identity: {enabled: true, themeId: 'warm-classic', variantId: 'olive', tagline: 'Kadak chai'}})` → `identity.enabled === true`, `theme` deep-equals `{ id: 'warm-classic', variantId: 'olive' }`, `tagline === 'Kadak chai'`.
  - `GET /api/v1/public/orders/:id` (order via `createOrderPlacer`) → `data.business.identity` is present with the same shape.
  - With the global switch off → `identity.enabled === false` even when the café's is on.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the schema fields and `toPublicIdentity`. Add `identity: toPublicIdentity(business)` to both public payloads. Keep `business.toJSON()` from leaking raw `identity.enabledAt`/`appliedAt`: strip `identity` from the spread before adding the public block.
- [ ] **Step 4: Run** the test and the full backend suite (`npm test`). Expected: PASS (268 existing + new).
- [ ] **Step 5: Commit** `feat(identity): business identity, house special and amendment fields`.

### Task 3: Theme allow-list, owner identity settings, admin switch, house specials

**Files:**
- Create: `backend/src/constants/cafeThemes.ts`, `backend/src/controllers/cafeIdentity.controller.ts`
- Modify: `backend/src/services/cafeIdentity.service.ts`, `backend/src/routes/businessRoutes.ts`, `backend/src/routes/adminRoutes.ts`, `backend/src/routes/menuRoutes.ts`
- Test: `backend/tests/cafeIdentitySettings.test.ts`

**Interfaces:**
- Produces:
  - `CAFE_THEMES: ReadonlyArray<{ id: string; name: string; variants: ReadonlyArray<{ id: string; name: string }> }>` (ids exactly as in Global Constraints)
  - `isValidTheme(themeId: string, variantId: string): boolean`
  - `HOUSE_SPECIAL_MAX = 3`
  - `updateOwnerIdentity(businessId: string, input: { themeId?: string | null; variantId?: string | null; tagline?: string }): Promise<PublicIdentity>`. Throws `IDENTITY_OFF` 403 when the gate is off, `INVALID_THEME` 400 for an unknown pair, `VALIDATION_ERROR` 400 for a tagline > 80 chars. Sets `appliedAt` when a theme is first set. `null` themeId clears theme and variant.
  - `adminSetIdentity(businessId: string, input: { enabled?: boolean; themeId?: string | null; variantId?: string | null }): Promise<PublicIdentity>`. Sets `enabledAt` when switched on.
  - `setHouseSpecial(businessId: string, productId: string, on: boolean): Promise<{ productId: string; isHouseSpecial: boolean }>`. Throws `HOUSE_SPECIAL_LIMIT` 400 on the 4th.
  - Routes:
    - `PUT /api/v1/business/identity` (OWNER)
    - `PUT /api/v1/admin/businesses/:id/identity` (super admin)
    - `PUT /api/v1/menu/products/:id/house-special` with body `{ on: boolean }` (OWNER, MANAGER)

- [ ] **Step 1: Write failing tests:**
  - an owner sets `{themeId:'cozy-night', variantId:'ember'}` while the café is enabled → 200 with `theme` echoed
  - the same request when the café is disabled → 403 `IDENTITY_OFF`
  - `{themeId:'street-bold'}` → 400 `INVALID_THEME`
  - a MANAGER calling `PUT /business/identity` → 403
  - super admin enables a café → `enabledAt` set
  - a 4th house special → 400 `HOUSE_SPECIAL_LIMIT`
  - turning one off then another on succeeds
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the allow-list, the service functions and thin controllers mapping `ServiceError` to the response shape (copy the support-ticket controller pattern).
- [ ] **Step 4: Run** the test and the backend suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat(identity): theme allow-list, owner/admin identity settings, house specials`.

## Phase 2: Themes on the frontend

### Task 4: Theme registry, tokens and the three launch themes

**Files:**
- Create: `frontend/src/themes/types.ts`, `caos.ts`, `warmClassic.ts`, `modernMinimal.ts`, `cozyNight.ts`, `registry.ts`, `applyTheme.ts`, `contrast.ts`, `index.ts`
- Test: `frontend/tests/themes.test.ts`

**Interfaces:**
- Produces:
  - `ThemeTokens = { page: string; surface: string; raised: string; line: string; ink: string; muted: string; onAccent: string; accent: Record<'50'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900'|'950', string>; radiusCard: string; radiusChip: string; radiusButton: string; radiusImage: string; cardShadow: string; badgeSpecial: { bg: string; fg: string }; badgePopular: { bg: string; fg: string }; coverFallback: string; mascotBand: string; bubbleBg: string; bubbleFg: string; bubbleBorder: string }`
    - Colours are `"r g b"` triplets, like `--brand-*`. Radii and shadow are CSS values. `coverFallback` is a CSS background value.
  - `ThemeFonts = { display: string; body: string; href?: string }`. `href` is a Google Fonts CSS URL, loaded on demand.
  - `VariantDefinition = { id: string; name: string; swatch: string; tokens: Partial<ThemeTokens> }`
  - `ThemeDefinition = { id: string; name: string; description: string; fonts: ThemeFonts; tokens: ThemeTokens; variants: VariantDefinition[] }`
  - `THEMES: Record<string, ThemeDefinition>` (includes `caos`)
  - `resolveTheme(themeId?: string | null, variantId?: string | null): { theme: ThemeDefinition; variantId: string; tokens: ThemeTokens }`. Unknown or missing ids → `caos`/`default`. A variant overrides only the keys it sets.
  - `applyTheme(root: HTMLElement, resolved: ReturnType<typeof resolveTheme>): void`. Sets `--cafe-<token>` on `root`, for example:
    - `--cafe-page`
    - `--cafe-accent-600`
    - `--cafe-radius-card`
    - `--cafe-font-display`, `--cafe-font-body`
    - `--cafe-mascot-band`
    
    It injects the fonts `<link>` once per href.
  - `contrastRatio(a: string, b: string): number`, for `"r g b"` inputs.
- Values:
  - `caos` reproduces today's guest pages: page white, accent = `DEFAULT_BRAND_PALETTE` from `constants/theme.ts`, the system font stack the pages use today, today's radii.
  - Warm Classic / Modern Minimal / Cozy Night bases and default accents as in spec §6.2 (`#fbf5ec`/`#3b2a1e`/`#b4532a`; `#ffffff`/`#18181b`/`#2f6b45`; `#1c1612`/`#f3e9dc`/`#f59e0b`) and fonts (Fraunces+Inter; Inter; Space Grotesk). The other variants' colours are the implementer's call within each theme's spirit.

- [ ] **Step 1: Write failing tests:**
  - `resolveTheme('warm-classic','olive').theme.id === 'warm-classic'`
  - `resolveTheme falls back for unknown ids`: `resolveTheme('street-bold','x').theme.id === 'caos'`, and `resolveTheme('warm-classic','nope').variantId === 'terracotta'`
  - **AA:** for every theme × variant, `contrastRatio(ink, page) ≥ 4.5`, `contrastRatio(ink, surface) ≥ 4.5`, `contrastRatio(onAccent, accent['600']) ≥ 4.5`
  - **id sync:** read `backend/src/constants/cafeThemes.ts` as text (like `tests/analyticsViews.test.ts` does), parse the ids, and assert they equal the non-`caos` themes and variant ids in `THEMES`
  - `applyTheme` sets `--cafe-page` on a jsdom element
- [ ] **Step 2: Run** `cd frontend && npx vitest run tests/themes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the files, one theme per file, as pure data.
- [ ] **Step 4: Run** the tests and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(themes): theme registry, tokens and launch themes`.

### Task 5: Themed guest pages (`cafe-*` tokens, CafeThemeScope)

**Files:**
- Modify: `frontend/tailwind.config.js` (add a `cafe` color/font/radius namespace reading `--cafe-*`, with `<alpha-value>` for colours as `brand` does)
- Create: `frontend/src/themes/CafeThemeScope.tsx`
- Modify: `frontend/src/pages/CustomerMenuPage.tsx`, `frontend/src/pages/CustomerOrderTrackingPage.tsx`, `frontend/src/organisms/customer-menu/**`, and the public services' `types.d.ts` (add `identity: PublicIdentity`)
- Test: `frontend/tests/cafeThemeScope.test.ts`

**Interfaces:**
- Consumes: `resolveTheme`, `applyTheme` (Task 4); `identity` in the `/c/:slug` and public-order payloads (Task 2)
- Produces:
  - `<CafeThemeScope identity={PublicIdentity | null | undefined}>{children}</CafeThemeScope>`. It renders a `div.min-h-screen` with the variables applied via a layout effect (before paint), and uses the `caos` look when `!identity?.enabled`.
  - frontend type `PublicIdentity` in `frontend/src/themes/types.ts`, mirroring the backend shape

- [ ] **Step 1: Write failing tests** (Vitest + jsdom): rendering `CafeThemeScope` with `{enabled:true, theme:{id:'cozy-night',variantId:'amber'}}` sets `--cafe-page` to Cozy Night's page token. With `enabled:false` it sets the `caos` value. Null identity → `caos`.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the scope.
  - Wrap both guest pages in it.
  - Replace hard-coded colours, fonts and radii on those pages and their `customer-menu` organisms with `cafe-*` utilities. Badges: "Popular" → `badgePopular`; a new "House special" badge for `product.isHouseSpecial` → `badgeSpecial`.
  - Cover: `coverImageUrl` with the theme's treatment, `coverFallback` when empty. Tagline under the name when non-empty.
- [ ] **Step 4: Verify the default look is unchanged.**
  - Run the throwaway screenshot setup from this project's earlier work: in-memory backend + Vite on spare ports, as `scratchpad/shots/boot-*.js` did. Use a CDP script to capture the menu and tracker at 390×844 with the identity off. Compare with captures taken *before* Step 3 (take those first). Expected: no visible difference.
  - Then capture the three themes and attach them to the task report.
- [ ] **Step 5: Run** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(themes): theme guest menu and tracker with cafe tokens`.

### Task 6: Owner "Café look" card and super admin identity controls

**Files:**
- Create: `frontend/src/organisms/dashboard/CafeLookCard/CafeLookCard.tsx`, `ThemePreview.tsx`, `index.ts`
- Create: `frontend/src/services/dashboard/identity/{identity.ts,types.d.ts,index.ts}`, `frontend/src/services/superAdmin/identity/{identity.ts,types.d.ts,index.ts}`
- Create: `frontend/src/hooks/useCafeIdentity.ts`
- Modify: `frontend/src/organisms/dashboard/SettingsPanel/SettingsPanel.tsx` (render the card for OWNER when `identity.enabled`); `frontend/src/organisms/super-admin/BusinessManagementModal/BusinessManagementModal.tsx` (a "Café identity" section: on/off toggle, theme + variant selects); `frontend/src/organisms/dashboard/DigitalMenuPanel/DigitalMenuPanel.tsx` (a House special toggle per dish, showing the 3-limit error from the API)
- Test: `frontend/tests/cafeLookCard.test.tsx`

**Interfaces:**
- Consumes:
  - `PUT /business/identity`, `PUT /admin/businesses/:id/identity`, `PUT /menu/products/:id/house-special` (Task 3)
  - `THEMES` and `resolveTheme` (Task 4)
  - the owner's own menu data (existing `menuService` calls)
- Produces:
  - `identityService.update({ themeId, variantId, tagline }): Promise<PublicIdentity>`
  - `adminIdentityService.set(businessId, { enabled?, themeId?, variantId? })`
  - `menuService.setHouseSpecial(productId: string, on: boolean)`

- [ ] **Step 1: Write failing tests** (Testing Library):
  - the card lists exactly the three launch themes, each with its 3 swatches
  - choosing a variant calls `identityService.update` with the pair
  - the tagline input caps at 80 characters
  - suggested taglines fill the input on click
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement.**
  - `ThemePreview` renders a phone-sized mini menu from the owner's name, logo, cover and first 2 categories/dishes, wrapped in `CafeThemeScope` for that theme.
  - Suggested taglines are a small constant list in the card's folder.
  - Use the dashboard colour rule for the card chrome.
- [ ] **Step 4: Run** the frontend tests, then type-check. Manually screenshot the Settings tab (theme card) and the admin modal section.
- [ ] **Step 5: Commit** `feat(identity): owner café look card, admin identity controls, house special toggle`.

## Phase 3: Recognition and memory (backend)

### Task 7: Device proof and guest pass tokens

**Files:**
- Create: `backend/src/utils/guestToken.ts`
- Modify: `backend/src/utils/phone.ts` (move `phonePattern` from `orderRecovery.service.ts` here as `phoneMatchPattern(key: string): RegExp`, and import it back in `orderRecovery.service.ts`)
- Test: `backend/tests/guestToken.test.ts`

**Interfaces:**
- Produces:
  - `DEVICE_PROOF_TTL_SECONDS = 30 * 60`
  - `GUEST_PASS_TTL_SECONDS = 180 * 24 * 60 * 60`
  - `signDeviceProof(phoneKey: string): string`
  - `verifyDeviceProof(token: unknown): { phone: string } | null`
  - `signGuestPass(p: { phone: string; businessId: string }): { token: string; expiresAt: Date }`
  - `verifyGuestPass(token: unknown, businessId: string): { phone: string } | null`. Returns null when `bid` ≠ businessId.
  - The token types `'device-proof'` and `'guest'` have their own derived HMAC keys (`'device-proof-v1'`, `'guest-pass-v1'`), as in `recoveryToken.ts`.

- [ ] **Step 1: Write failing tests:**
  - round trip for both tokens
  - a guest pass verified against another businessId → null
  - a device proof is rejected as a guest pass and vice versa
  - a recovery token and a login JWT are rejected by both
  - expired tokens (sign with a negative TTL via an optional `ttlSeconds` param) → null
  - non-string input → null
  - `orderRecovery.test.ts` still passes after the move
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the new test plus `tests/orderRecovery.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(identity): device proof and guest pass tokens`.

### Task 8: Pass issuing on OTP and order; GuestProfile memory

**Files:**
- Create: `backend/src/models/GuestProfile.ts`, `backend/src/dao/guestProfile.dao.ts`, `backend/src/services/guestMemory.service.ts`
- Modify: `backend/src/controllers/otp.controller.ts` (`confirmOtp`, `confirmWidgetToken`: when purpose is DEFAULT and the result is success with code ≠ `ALREADY_VERIFIED`, add `deviceProof: signDeviceProof(phoneKeyOf(phone))` to the JSON)
- Modify: `backend/src/controllers/orderController.ts` (`createOrder`: read `deviceProof` from the body and `X-Guest-Token` from the header; after `placeOrder`, call `recordVisit` and add `guestToken` to `data` when issued)
- Modify: `backend/src/services/checkout.service.ts`: the checkout start stores the proof kind on the session, and the confirmed checkout's public result carries `guestToken`. Decide the channel by reading the checkout code; document it in the task report.
- Test: `backend/tests/guestMemory.test.ts`

**Interfaces:**
- Consumes: Task 7 tokens, `isIdentityOnFor` (Task 1), `phoneKeyOf`
- Produces:
  - `GuestProfile` model: `{ businessId: ObjectId; phone: string (phoneKeyOf); firstName: string; answers: Map<string, { optionId: string; answeredAt: Date }>; askedQuestionIds: string[]; lastWelcomeTemplateId?: string; lastVisitAt: Date; expireAt: Date }`
    - unique index `{ businessId: 1, phone: 1 }`
    - TTL index on `expireAt` (`expireAfterSeconds: 0`)
  - `GUEST_MEMORY_TTL_DAYS = 365`
  - `recordVisit(params: { business: BusinessDoc; order: OrderDoc; deviceProof?: unknown; guestPass?: unknown }): Promise<{ guestToken?: string; guestTokenExpiresAt?: Date }>`
    - when the gate is off → `{}`
    - a proof qualifies only if its phone equals `phoneKeyOf(order.customerPhone)` (and, for a pass, it is for this business)
    - with no qualifying proof → `{}` and **no write**
    - otherwise → upsert the profile (`firstName` = first word of `customerName`, trimmed, max 40 chars; `lastVisitAt` = now; `expireAt` = now + 365 d) and return a fresh pass
  - `firstNameOf(customerName: string): string`

- [ ] **Step 1: Write failing tests:**
  - an order with a valid device proof → response `data.guestToken` exists and a GuestProfile with `firstName` exists
  - an order with neither proof → no `guestToken`, no profile, **and an existing profile's firstName is unchanged** after a second "impostor" order under the same phone with name "Mallory"
  - an order with a valid pass (no device proof) → a renewed token whose expiry is later than the old one
  - a pass for another café → no token, no write
  - a device proof for a different phone → no token
  - café switch off → no token
  - `/otp/verify` (mock mode) for a fresh phone returns `deviceProof`; for an already order-verified phone (`ALREADY_VERIFIED` path of `/otp/request` then verify) returns none
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the model, dao (pure queries), service and controller wiring. The order is already saved when `recordVisit` runs, so its failure is logged, never thrown (as `touchPhoneOrderVerification` is).
- [ ] **Step 4: Run** the new test and the backend suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat(identity): proof-gated guest passes and guest memory`.

### Task 9: Copy banks and the welcome endpoint

**Files:**
- Create: `backend/src/constants/mascotCopy.ts`, `backend/src/constants/guestQuestions.ts`, `backend/src/services/welcome.service.ts`
- Modify: `backend/src/routes/publicRoutes.ts` and a new `backend/src/controllers/guestExperience.controller.ts`
- Test: `backend/tests/welcome.test.ts`, `backend/tests/copyBanks.test.ts`

**Interfaces:**
- Produces:
  - `GuestQuestion = { id: string; text: string; options: { id: string; label: string; emoji?: string; reply: string; replyGesture: 'nod' | 'tilt' | 'wave' | 'pop' | 'wiggle' | 'tipHat' | 'lean'; welcomeTemplates: { id: string; text: string }[] }[]; active: boolean }`
  - `GUEST_QUESTIONS: GuestQuestion[]`: ≥ 12 active questions within the rules of spec §9.4
  - `MASCOT_COPY = { welcomeFallbacks: { id: string; text: string }[]; firstVisit: { id: string; text: string }[]; categoryTip: { id: string; text: string }[]; houseSpecialTip: { id: string; text: string }[]; pairing: { id: string; text: string }[]; pairingShare: { id: string; text: string }[] }`. The fallback order follows spec §9.3: with usual → with name only.
  - `fillTemplate(text: string, values: Partial<Record<'name' | 'usual' | 'cafe' | 'category' | 'dish', string>>): string | null` (null if any placeholder is unfilled)
  - `usualProductFor(businessId: string, phoneKey: string): Promise<{ productId: string; name: string } | null>`: the guest's most-ordered *currently available* product at this café (non-cancelled orders; match the phone with `phoneMatchPattern`)
  - `welcomeFor(business: BusinessDoc, guestPass: unknown): Promise<{ line: string; usualProductId?: string } | null>`
    - null when the gate is off, the pass is invalid/foreign, or there is no profile
    - picks among eligible templates from the latest answers, then the fallbacks, avoiding `lastWelcomeTemplateId`, and stores the chosen id
  - Route `GET /api/v1/public/c/:businessId/welcome` (header `X-Guest-Token`) → `200 { success, data: { line, usualProductId? } }` or `204`. Use a limiter in the existing style.

- [ ] **Step 1: Write failing tests:**
  - `copyBanks.test.ts`:
    - every template's placeholders are in the allowed set
    - no copy matches `/\b(soon|minute|min|guarantee)\b/i`
    - question and option ids are unique
    - ≥ 12 active questions
  - `welcome.test.ts`:
    - after a proof-gated order, the welcome with the pass → 200, the line contains the first name and the usual dish name, and the body never contains the phone digits
    - two consecutive calls return different template ids when ≥ 2 are eligible
    - `a pass for another café is rejected` → 204
    - no header → 204
    - café switch off → 204
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** and expect PASS. Then run the backend suite.
- [ ] **Step 5: Commit** `feat(identity): mascot copy banks and returning-guest welcome`.

## Phase 4: Menu tips, tracker stage, amendments, measurement (backend)

### Task 10: Category tips and house specials in the menu payload

**Files:**
- Create: `backend/src/services/menuTips.service.ts`
- Modify: `backend/src/controllers/menuController.ts` (`getPublicMenu` adds `categoryTips` and `houseSpecialIds` when the gate is on)
- Test: `backend/tests/menuTips.test.ts`

**Interfaces:**
- Produces:
  - `getCategoryTips(business: BusinessDoc): Promise<Record<string, { productId: string; line: string; kind: 'best-seller' | 'house-special' }>>`
    - cached 10 min per business; reuse the window/min constants from `menuPopularity.service.ts`
    - per category: the available product with the most separate orders (≥ 5) in 30 days
    - else an available house special in that category
    - else no entry
    - line from `MASCOT_COPY.categoryTip` / `houseSpecialTip` via `fillTemplate`
  - `clearCategoryTipCache(): void`

- [ ] **Step 1: Write failing tests:**
  - 6 orders containing a dish → its category has `kind: 'best-seller'` naming it
  - 4 orders → no best-seller entry
  - cancelled orders don't count
  - `unavailable best seller is skipped`: set `isAvailable=false` → the entry falls to the next qualifying item or disappears
  - a house special in an empty category → `kind: 'house-special'`
  - gate off → the menu payload has no `categoryTips`
- [ ] **Step 2: Run** and expect FAIL. **Step 3: Implement.** **Step 4: Run** and expect PASS, then run the suite.
- [ ] **Step 5: Commit** `feat(identity): category tips from real sales`.

### Task 11: The amend-order flow

**Files:**
- Modify: `backend/src/services/orderPlacement.service.ts`. Extract from `prepareOrder`:
  - `priceItems(business: BusinessDoc, items: { productId: string; quantity: number; variantName?: string; addons?: { name: string }[]; notes?: string }[]): Promise<{ items: IOrderItem[]; subtotalPaise: number }>`
  - `computeTotals(business: BusinessDoc, subtotalPaise: number): { taxPaise: number; discountPaise: number; platformFeePaise: number; totalAmountPaise: number; businessEarningsPaise: number }`
  
  `prepareOrder` then calls both, with unchanged behaviour.
- Create: `backend/src/services/orderAmendment.service.ts`
- Modify: `backend/src/routes/publicRoutes.ts` and the guest-experience controller; the kitchen and order-details UI (`frontend/src/organisms/dashboard/KitchenKdsBoard/*Ticket*.tsx`, `KdsColumn.tsx`, `OrderDetailsDrawer.tsx`) show an **"Added"** marker with the time on amended lines (match lines to `order.amendments[*].items` by productId + position)
- Test: `backend/tests/orderAmendment.test.ts`, `frontend/tests/amendedItems.test.ts`

**Interfaces:**
- Produces:
  - `AMEND_MAX_PER_ORDER = 3`, `AMEND_MAX_UNITS = 10`
  - `canAmend(order: OrderDoc): boolean`: PLACED or PREPARING, UNPAID, not `paymentMethod === 'CHECKOUT'`, under the limits
  - `amendOrder(params: { orderId: string; guestPass: unknown; items: { productId: string; quantity: number }[]; source: 'pairing' }): Promise<OrderDoc>`
    - verifies the pass belongs to the order's phone and café (`NOT_YOUR_ORDER` 403) and the gate is on
    - prices the new items with `priceItems`, appends them, recomputes all totals with `computeTotals` on the new subtotal
    - pushes the amendment entry
    - persists with **one atomic `findOneAndUpdate` guarded on `{ _id, orderStatus: { $in: ['PLACED','PREPARING'] }, paymentStatus: 'UNPAID', 'amendments.<AMEND_MAX_PER_ORDER-1>': { $exists: false } }`**; no match → `ORDER_NOT_AMENDABLE` 409
    - then emits `order:updated` to the business and order rooms with the curated payload the status-change path uses
  - Route `POST /api/v1/public/orders/:id/add-items`, body `{ items, source }`, header `X-Guest-Token` → the updated public order

- [ ] **Step 1: Write failing tests:**
  - **parity:** amending an order with item B gives the same `subtotalPaise`, `taxPaise`, `platformFeePaise`, `totalAmountPaise` and `businessEarningsPaise` as a fresh order containing A+B (set `taxRatePercentage` to 5 for this test)
  - PAID order → 409
  - CHECKOUT order → 409
  - READY order → 409
  - `amend loses the race against a status change`: flip the status to READY between `priceItems` and the update (stub via a test hook, or perform the status update first and call amend with a stale document) → 409, and the totals are unchanged in the DB
  - the 4th amendment → 409; 11 units → 400 `AMEND_LIMIT`
  - a socket client in the business room receives `order:updated` with the new total
  - wrong pass → 403
  - existing `orderLifecycle`/`checkout` tests still pass
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the extraction first. Run the full suite to prove `prepareOrder` is unchanged. Then add the amend service, route and the KDS/drawer markers.
- [ ] **Step 4: Run** the backend suite plus `npx vitest run tests/amendedItems.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(orders): amend unpaid orders from the tracker`.

### Task 12: While-you-wait: pairings and the daily question

**Files:**
- Create: `backend/src/services/pairings.service.ts`, `backend/src/services/dailyQuestion.service.ts`
- Modify: `backend/src/controllers/guestExperience.controller.ts`, `backend/src/routes/publicRoutes.ts`
- Test: `backend/tests/whileYouWait.test.ts`

**Interfaces:**
- Produces:
  - `pairingsFor(order: OrderDoc): Promise<{ productId: string; name: string; pricePaise: number; line: string; addable: boolean }[]>`
    - ≤ 2 items, by co-occurrence in this café's orders over 30 days, ≥ 5 shared orders, available, not in the order
    - `line` uses `pairingShare` only when the base dish has ≥ 20 qualifying orders, with the share computed from the data; otherwise `pairing`
    - `addable` = `canAmend(order)` (Task 11) is true
  - `questionFor(order: OrderDoc): Promise<{ id: string; text: string; options: { id: string; label: string; emoji?: string }[] } | null>`
    - null when the order is not PLACED/PREPARING, already has an answered question, or every question was asked
    - otherwise the first active question not in the profile's `askedQuestionIds`, which is recorded as asked
  - `answerQuestion(order: OrderDoc, guestPass: unknown, questionId: string, optionId: string): Promise<{ reply: string; gesture: string }>`
    - throws `NOT_YOUR_ORDER` 403 if the pass phone ≠ the order phone, `INVALID_ANSWER` 400 for unknown ids
    - records `answers[questionId]` on the profile
  - `Order.answeredQuestionId?: string`: add to the Order schema to enforce one answer per order
  - Routes:
    - `GET /api/v1/public/orders/:id/while-you-wait` → `{ pairings, question }`. Empty arrays/null when the gate is off or the status is not PLACED/PREPARING.
    - `POST /api/v1/public/orders/:id/answer` (header `X-Guest-Token`)

- [ ] **Step 1: Write failing tests:**
  - with 5 seeded orders containing A+B, an order with A → pairing B
  - with 4 → none
  - no `pairingShare` line below 20
  - READY order → empty
  - questions rotate: a second order by the same guest gets a different question id
  - answering with the order's pass → reply text from the bank, and the profile has the answer
  - answering with another phone's pass → 403
  - answering twice on the same order → 400 `ALREADY_ANSWERED`
- [ ] **Step 2: Run** and expect FAIL. **Step 3: Implement.** **Step 4: Run** and expect PASS, then run the suite.
- [ ] **Step 5: Commit** `feat(identity): while-you-wait pairings and daily question`.

### Task 13: Measurement events and the super admin readout

**Files:**
- Create: `backend/src/models/IdentityEvent.ts`, `backend/src/dao/identityEvent.dao.ts`, `backend/src/services/identityEvents.service.ts`
- Modify: `backend/src/routes/publicRoutes.ts`, `backend/src/routes/adminRoutes.ts`, `backend/src/services/orderAmendment.service.ts` (record `pairing_ordered`)
- Create: `frontend/src/services/superAdmin/identity/` (extend from Task 6) and `frontend/src/organisms/super-admin/CafeIdentityPanel/CafeIdentityPanel.tsx` (a table, reached from the super admin nav)
- Test: `backend/tests/identityEvents.test.ts`

**Interfaces:**
- Produces:
  - `IDENTITY_EVENT_KINDS = ['welcome_shown','welcome_usual_added','tip_shown','pairing_shown','pairing_added','pairing_ordered','question_shown','question_answered','not_you_clicked'] as const`
  - `recordEvent(businessId: string, kind: IdentityEventKind, meta?: Record<string, string | number>): Promise<void>`. Ignored when the gate is off. TTL 400 days. No phone/name fields.
  - `returnRate30d(businessId: string, from: Date, to: Date): Promise<{ guests: number; returned: number; rate: number }>`: over orders in [from, to], the guests (by `phoneKeyOf`) whose next order at the café came within 30 days
  - `identitySummary(): Promise<{ businessId: string; name: string; enabledAt?: Date; appliedAt?: Date; returnRateBefore: number | null; returnRateAfter: number | null; events30d: Partial<Record<IdentityEventKind, number>> }[]>`
  - Routes:
    - `POST /api/v1/public/identity-events` with `{ businessId, kind, orderId? }`, rate-limited, unknown kind → 400
    - `GET /api/v1/admin/cafe-identity/summary`

- [ ] **Step 1: Write failing tests:**
  - an event with an unknown kind → 400
  - events are not stored when the gate is off
  - `returnRate30d` with seeded orders (two guests, one returns on day 10, one on day 40) → `{ guests: 2, returned: 1, rate: 0.5 }`
  - the summary lists enabled cafés with before/after rates (before = the 60 days before `enabledAt`, after = since)
- [ ] **Step 2: Run** and expect FAIL. **Step 3: Implement.** **Step 4: Run** and expect PASS, then run the suite.
- [ ] **Step 5: Commit** `feat(identity): engagement events and return-rate readout`.

## Phase 5: Guest experience on the frontend

### Task 14: Guest pass storage and sending proofs with orders

**Files:**
- Create: `frontend/src/utils/guestPass.ts`
- Modify: `frontend/src/services/otp/types.d.ts` (`deviceProof?: string` on `OtpActionResponse`), `frontend/src/hooks/useOtpVerification.ts` (expose `deviceProof: string | null` from the last successful verify/confirm), `frontend/src/pages/CustomerMenuPage.tsx` (`handlePlaceOrder` sends `deviceProof` and the stored pass header; stores `res.data.guestToken`), `frontend/src/services/public/orders/orders.ts` (`create(payload, { guestToken })` adds `X-Guest-Token`), and the checkout return path per the Task 8 channel
- Modify: `frontend/src/services/api.ts`: allow extra headers (`apiRequest(endpoint, method, body, headers?)`)
- Test: `frontend/tests/guestPass.test.ts`

**Interfaces:**
- Produces:
  - `GUEST_PASS_KEY = 'caos_guest_passes'`
  - `readGuestPass(businessId: string, store?: KeyValueStore): string | null`. Drops expired entries.
  - `saveGuestPass(businessId: string, token: string, expiresAt: string, store?): void`
  - `forgetGuestPass(businessId: string, store?): void`
  
  All three are modelled on `utils/recentOrders.ts`: guarded, never throw.

- [ ] **Step 1: Write failing tests:**
  - save then read round trip
  - expired → null
  - a corrupt JSON store → null
  - `pass storage tolerates throwing storage`: a store whose `getItem`/`setItem` throw → read returns null and save does not throw
  - passes are kept per businessId (saving for B doesn't touch A)
- [ ] **Step 2: Run** and expect FAIL. **Step 3: Implement** and wire the menu page. **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(identity): store guest passes and send proofs with orders`.

### Task 15: Mascot extensions: page reactions, bubble action, theme dressing, light renderer

**Files:**
- Modify: `frontend/src/mascot/types.ts` (`PageId` adds `'menu'`; `MascotMessage.action?: { label: string; id: string }`), `config.ts` (`MENU_CONFIG`; register it), `brain.ts` (`setReactions(map: Record<string, MascotReaction>)`, merged into signals), `PageMascot.tsx` (props `rendering?: 'heavy' | 'light'`, `reactions?`, `dress?: { band: string; bubbleBg: string; bubbleFg: string; bubbleBorder: string }`, `onAction?: (id: string) => void`), `MascotExperience.tsx`, `mascot.css` (bubble colours from `--m-bubble-*`; the action button `pointer-events: auto`), `engine/model.ts` + `engine/createEngine.ts` (`setBandColor(hex: string)`)
- Create: `frontend/src/mascot/lite/createLiteEngine.ts`, `frontend/src/mascot/lite/lite.css`, and `frontend/src/mascot/lite/assets/*` (one image per expression, ≤ 30 KB gzip in total for the lite chunk). It has the same `MascotEngine` interface as `createEngine` (gestures as CSS animations; `setLook` as a small translate; `setBandColor` tints a band layer).
- Modify: `frontend/src/mascot/README.md` (document the new props and the menu page)
- Test: `frontend/tests/mascotEngineLogic.test.ts`, `frontend/tests/mascotBrain.test.ts` (extend)

**Interfaces:**
- Consumes: `PublicIdentity.mascotRendering`, theme tokens `mascotBand`, `bubble*` (Task 4)
- Produces:
  - `MENU_CONFIG`: `phoneFlow: { mode: 'dock' }`, `sections: []`, `targets: []`, `peeks: []`. Its signals are only those passed at runtime. The desktop flow is `{ mode: 'dock' }` too.
  - `<PageMascot page="menu" rendering={…} reactions={…} signal={…} dress={…} onAction={…} />`
  - `MascotBrain.setReactions` replaces page reactions. `setSignal(key)` looks keys up in config signals, then page reactions.
  - `createLiteEngine(opts): MascotEngine`, with the same `EngineOptions` as `createMascotEngine`

- [ ] **Step 1: Write failing tests:**
  - **brain:** `setReactions({ 'tip:c1': {...} })` then `setSignal('tip:c1')` shows that message; replacing the reactions removes old keys
  - **validateConfig** accepts `MENU_CONFIG`
  - **route scoping:**
    - importers now include `pages/CustomerMenuPage.tsx`
    - the CustomerMenuPage stays out of the "mascot-free" list
    - `three` is still only under `mascot/engine/`
    - files under `mascot/lite/` import nothing from `mascot/engine/`
    - `MascotExperience.tsx` imports `./lite/createLiteEngine` only via dynamic `import()`
  - the message `action` renders a button only when present (Testing Library on the experience with a stub engine)
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement.**
  - When `rendering === 'light'`, `MascotExperience` imports `./lite/createLiteEngine` instead of `./engine/createEngine`.
  - Heavy failure → fall back to lite (not the poster).
  - The light assets are produced once, by rendering the 3D model per expression with the existing headless-Chrome technique, and committed.
- [ ] **Step 4: Run** `npx vitest run` and `npx vite build`. Expected: PASS, and the build lists a separate lite chunk ≤ 30 KB gzip with no three.js in it.
- [ ] **Step 5: Commit** `feat(mascot): page reactions, bubble action, theme dressing, light renderer`.

### Task 16: The mascot on the menu: welcome, category tips, "Not you?"

**Files:**
- Create: `frontend/src/hooks/useMenuMascot.ts`, `frontend/src/services/public/guest/{guest.ts,types.d.ts,index.ts}`
- Modify: `frontend/src/pages/CustomerMenuPage.tsx` (each category section gets `data-category-id`; render `<PageMascot page="menu" …/>` when `identity.enabled`), `frontend/src/organisms/customer-menu/MenuSection/*` (the attribute)
- Test: `frontend/tests/useMenuMascot.test.ts`

**Interfaces:**
- Consumes:
  - `GET /public/c/:businessId/welcome` (Task 9), `categoryTips` (Task 10), `POST /public/identity-events` (Task 13)
  - `readGuestPass`/`forgetGuestPass` (Task 14), `PageMascot` props (Task 15)
- Produces: `useMenuMascot({ business, categoryTips, cartCount, addToCart }): { signal: string | null; reactions: Record<string, MascotReaction>; onAction: (id: string) => void }`
  - Welcome:
    - `signal = 'welcome'` once per session (sessionStorage key `caos_welcomed_<businessId>`)
    - the welcome reaction's message gets the action `{ id: 'add-usual', label: 'Add' }` when `usualProductId` is on the menu and available, and a second action `{ id: 'not-you', label: 'Not you?' }`
    - **Add** adds the usual product to the cart
    - **Not you?** calls `forgetGuestPass` and swaps to the generic welcome
  - Category tips:
    - an IntersectionObserver on `[data-category-id]` sets `signal = 'tip:<categoryId>'` for categories with a tip, each at most once per session
    - none before the welcome has finished
    - none once `cartCount > 0`
  - Records `welcome_shown`, `welcome_usual_added`, `tip_shown`, `not_you_clicked`.

- [ ] **Step 1: Write failing tests** (hook with fake timers and a mocked service):
  - first render with a pass → the signal becomes `welcome` once, and not again after a remount in the same session
  - no pass → the generic first-visit line
  - a tip signal is not emitted while the welcome is up
  - each category tip fires at most once
  - no tips after `cartCount > 0`
  - the `add-usual` action calls `addToCart` with the usual product
  - `not-you` calls `forgetGuestPass`
- [ ] **Step 2: Run** and expect FAIL. **Step 3: Implement.** **Step 4: Run** the tests. Then use the throwaway screenshot setup at 390×844 to capture the welcome bubble and a category tip on a themed café, and check that the mascot clears the cart bar.
- [ ] **Step 5: Commit** `feat(identity): mascot welcome and category tips on the menu`.

### Task 17: Tracker "While you wait": pairings with Add, the daily question

**Files:**
- Create: `frontend/src/organisms/customer-order/WhileYouWait/{WhileYouWait.tsx,PairingCard.tsx,AddToOrderSheet.tsx,DailyQuestionCard.tsx,index.ts}`, `frontend/src/hooks/useWhileYouWait.ts`, `frontend/src/services/public/whileYouWait/{whileYouWait.ts,types.d.ts,index.ts}`
- Modify: `frontend/src/pages/CustomerOrderTrackingPage.tsx` (render under the status; pass the mascot reply as a signal through `PageMascot`'s `reactions`)
- Test: `frontend/tests/whileYouWait.test.tsx`

**Interfaces:**
- Consumes:
  - `GET /public/orders/:id/while-you-wait`, `POST /public/orders/:id/answer` (Task 12)
  - `POST /public/orders/:id/add-items` (Task 11), events (Task 13)
  - `readGuestPass` (Task 14)
- Produces: `useWhileYouWait(orderId: string, orderStatus: string, businessId: string): { pairings; question; addToOrder(productId: string, quantity: number): Promise<void>; answer(optionId: string): Promise<{ reply: string; gesture: string }>; mascotReply: string | null }`
  - It refetches when the status changes and returns nothing unless PLACED/PREPARING.

- [ ] **Step 1: Write failing tests** (Testing Library, mocked services):
  - hidden when the status is READY
  - an `addable` pairing shows **Add**, which opens the sheet with the price and the new total; confirm calls `add-items` and closes the sheet
  - a non-addable pairing shows "Ask your server to add it" and no button
  - answering a question calls `answer`, collapses to "Answered ✓", and sets `mascotReply`
  - "Not now" hides the question without answering
- [ ] **Step 2: Run** and expect FAIL. **Step 3: Implement.** Use `cafe-*` tokens throughout. **Step 4: Run** the tests, then screenshot the tracker in each theme at 390×844.
- [ ] **Step 5: Commit** `feat(identity): while-you-wait on the order tracker`.

## Phase 6: Performance and the production decision

### Task 18: Make the heavy engine lighter

**Files:**
- Modify: `frontend/src/mascot/engine/*.ts` (named `three` imports; remove unused features)
- Create: `frontend/perf/bundle-budget.mjs` and an npm script `perf:bundle` that builds and fails if the `createEngine` chunk > 100 KB gzip or the lite chunk > 30 KB gzip
- Test: the existing mascot tests plus `npm run perf:bundle`

- [ ] **Step 1: Run** `npm run perf:bundle` (create the script first; it reads `vite build` output sizes). Expected: FAIL at the current 143 KB.
- [ ] **Step 2: Optimise.** Named imports only. Check the geometry/material classes actually used. Drop unneeded loaders/helpers. Keep the pixel-ratio cap and the pause-when-hidden behaviour.
- [ ] **Step 3: Run** `npm run perf:bundle` and the mascot tests. Expected: PASS. If 100 KB can't be reached, stop and report the best result with what is left in the chunk. Per spec §8.4 the target is a goal; the stress test (Task 19) decides.
- [ ] **Step 4: Commit** `perf(mascot): slimmer three.js engine chunk`.

### Task 19: Stress harness and the production rendering decision

**Files:**
- Create: `frontend/perf/mascot-stress/limits.json` (every limit from spec §8.5, verbatim), `frontend/perf/mascot-stress/run.mjs`, `frontend/perf/mascot-stress/seed.ts` (the realistic café: 8 categories, 60 dishes, 40 photos, a returning guest with a pass), `frontend/perf/mascot-stress/README.md`, and an npm script `perf:mascot`
- Create (output): `frontend/perf/mascot-stress/report-YYYY-MM-DD.md`
- Modify: `backend/src/config/config.production.json` (`cafeIdentity.mascotRendering` set per the decision)

**Interfaces:**
- `run.mjs` boots the in-memory backend and Vite on spare ports (the technique from this project's screenshots). It drives headless Chrome over CDP with the profile from §8.5:
  - 390×844, DPR 2
  - `Emulation.setCPUThrottlingRate {rate: 4}`
  - `Network.emulateNetworkConditions` for Slow 4G (download ≈ 1.6 Mbps, 150 ms RTT)
  - cold cache
  
  It runs scenarios 1–4 for `rendering ∈ {off, light, heavy}` × each launch theme, and writes the report: measured value, limit, pass/fail per row, and the decision per the rule in §8.5.
- Metrics:
  - LCP, plus the "first Add usable" mark: add `performance.mark('menu-usable')` when the first add button is enabled
  - frames and long tasks from a `Tracing` trace or a `PerformanceObserver`
  - INP via the Event Timing API
  - memory via `performance.measureUserAgentSpecificMemory` with a heap-snapshot fallback
  - CPU from a 60 s `Profiler` sample
  - WebGL errors via `webglcontextlost` listeners

- [ ] **Step 1: Write** `limits.json` and the harness. Self-check by running it with rendering `off` only; expected: the baseline rows are recorded and no comparisons are made.
- [ ] **Step 2: Run** `npm run perf:mascot` for all modes. Expected: the report is written with pass/fail for each limit.
- [ ] **Step 3: Real device pass.** Ask the human partner to run scenarios 1–4 on a low-end Android with remote debugging (instructions in the harness README) and record the numbers in the report. Until then the decision is marked "emulated only".
- [ ] **Step 4: Apply the decision rule** (§8.5). Set `config.production.json` `cafeIdentity.mascotRendering` to `heavy` only if heavy passed everything (emulated and real device); otherwise `light`. If light failed anything, stop and report: launch is blocked.
- [ ] **Step 5: Commit** `perf(mascot): stress harness, report and production rendering decision`.

---

## Self-review notes

- **Spec coverage:**
  - §6 themes → Tasks 2–6
  - §7 switches → Tasks 1–3
  - §8.1 menu behaviour → Tasks 15–16
  - §8.2 rendering → Task 15
  - §8.3 best items → Task 10
  - §8.4 performance → Task 18
  - §8.5 stress test → Task 19
  - §9.1 pairings → Tasks 11, 12, 17 (11 = amend, 12 = pairings)
  - §9.2 question → Tasks 12, 17
  - §9.3 memory → Tasks 8, 9
  - §9.4 copy → Task 9
  - §10.4 privacy → Tasks 7, 8, 9
  - §10.7 amend → Task 11
  - §11 measurement → Task 13
  - §13 rollout → Tasks 1 (prod config off) and 19
- **Deliberately not built** (spec non-goals): bill card, stamp card, WhatsApp, signature themes (only the `exclusiveTo` extension point is designed; nothing is built for it), dashboard theming.
