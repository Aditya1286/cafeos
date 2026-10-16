import type { MascotConfig, PageFlow, PageId, TriggerKind } from './types';

// ─── Behaviour tuning ──────────────────────────────────────────────────────────────────────────
// Everything numeric that shapes how the mascot feels lives here, not in the engine or hooks.

export const DEFAULT_PRIORITY: Record<TriggerKind, number> = {
  section: 1,
  signal: 2,
  peek: 3,
  hover: 5,
  focus: 6,
};

export const DEFAULT_COOLDOWN_MS: Record<TriggerKind, number> = {
  section: 20_000,
  // A signal speaks every time it changes; the page only changes it when something happened.
  signal: 0,
  peek: 45_000,
  hover: 6_000,
  focus: 6_000,
};

export const TIMING = {
  /** How long a bubble stays up when the message doesn't say. */
  messageMs: 4_500,
  /** Pointer must rest on a target this long before it counts, so sweeping across the page is quiet. */
  hoverIntentMs: 110,
  /** Grace after leaving a target before dropping back to the section state, so moving between
   * neighbouring elements doesn't flicker through the section message. */
  unhoverGraceMs: 160,
  /** Touch has no hover: a tap on a target holds its reaction for this long. */
  touchHoldMs: 2_200,
  /** After the page is idle, wait this long before the mascot appears so the hero lands first. */
  entranceDelayMs: 900,
} as const;

/** Viewport widths (px) where the mascot changes size, and the rendered box size at each. */
export const LAYOUT = {
  margin: 12,
  /** Viewports at most this wide (px) use a page's `phoneFlow` overrides (Tailwind's `md` minus 1). */
  phoneMaxWidth: 767,
  sizes: [
    { minWidth: 1024, px: 280 },
    { minWidth: 640, px: 210 },
    { minWidth: 0, px: 128 },
  ],
} as const;

/** The curvy descent: as the page scrolls from top to bottom the mascot sweeps across the viewport
 * in an S-curve while drifting down it. */
export const FLOW = {
  /** Full left-right swings from the top of the page to the bottom. */
  swings: 3.2,
  /** Phase offset (radians) so the page starts with the mascot on the right. */
  phase: Math.PI / 2,
  /** Higher = the mascot dwells longer near the edges and crosses the middle faster (tanh shaping,
   * smooth everywhere). 0 would be a plain sine. */
  edgeSharpness: 2.2,
  /** Viewport y of the mascot's top at the top / bottom of the page, as a fraction of the room left. */
  topStart: 0.16,
  bottomEnd: 1,
  /** Spring stiffness (1/s). Higher = tighter follow, lower = floatier. */
  follow: 5.5,
} as const;

/** Popping up from behind a card. */
export const PEEK = {
  /** Fraction of the mascot's height that stays visible above the card's top edge. */
  visible: 0.7,
  /** On small mascots (phones) less of it pops up: the gaps between stacked cards are small. */
  visibleCompact: 0.45,
  compactBelow: 160,
  /** The card's top edge must sit at least this far below the viewport top (clears the navbar). */
  clearTop: 84,
  /** ...and no lower than this fraction of the viewport height. */
  maxTop: 0.78,
  /** Rise / sink durations (ms), matched to the CSS transitions. */
  riseMs: 650,
  sinkMs: 450,
  fadeMs: 200,
  /** Wait after the rise starts before the greeting fires, so the wave lands on a visible mascot. */
  greetDelayMs: 380,
  /** How far (px) the mascot's head may graze surrounding content before the spot counts as taken.
   * Horizontal is looser: the head box is conservative at its sides (the figure is narrower than
   * the box), and a hat brim brushing the end of a heading is fine. */
  overlapSlackX: 20,
  overlapSlackY: 6,
  /** The same card won't pop up again inside this window. */
  repeatMs: 20_000,
} as const;

/** The scroll probe line (fraction of viewport height) that decides the active section. */
export const ACTIVE_LINE = 0.45;

// ─── Section + target reactions ────────────────────────────────────────────────────────────────
// Add a section: give its root element a selector and describe the `enter` reaction.
// Add a hover/focus reaction: add a target with a selector. Nothing in the engine changes.
// Add a card to pop up from behind: put `data-mascot-peek` on it (it needs to be opaque and sit above
// the mascot layer, i.e. `relative z-10`) and add an entry to `peeks`.
// Copy must only restate what the page already says (2-week trial, flat monthly fee, no app for
// guests); no guaranteed-savings or profit claims.

export const LANDING_CONFIG: MascotConfig = {
  // On a phone the S-curve would sweep across the text: dock small in the corner instead, and keep
  // popping up from the cards (the phone-only peeks below).
  phoneFlow: { mode: 'dock', sizeScale: 0.78 },
  peeks: [
    {
      peekId: 'tour',
      selector: '[data-mascot-peek="tour"]',
      anchor: 0.85,
      // Below the lg breakpoint the tour's tabs become a row of chips right above the panel.
      minViewportWidth: 1024,
      greet: {
        expression: 'excited',
        gesture: 'wave',
        message: { id: 'tour.hi', text: 'Hi! I’m Caos. Psst, over here.' },
      },
    },
    {
      peekId: 'why',
      selector: '[data-mascot-peek="why"]',
      anchor: 0.82,
      greet: {
        expression: 'curious',
        gesture: 'wave',
        message: { id: 'why.hi', text: 'Hi! Peeking out from behind the easy way.' },
      },
    },
    {
      peekId: 'pricing',
      selector: '[data-mascot-peek="pricing"]',
      anchor: 0.8,
      greet: {
        expression: 'confident',
        gesture: 'wave',
        message: { id: 'pricing.hi', text: 'Hi again! Pro is the popular one.' },
      },
    },
    // Phone-only spots. When cards stack in one column, the second card's top edge sits right
    // under the first card, so there is no room to pop up there (the clear-headroom check blocks
    // it). These pop up from the first card of each stack instead, which has space above it.
    {
      peekId: 'why-old',
      selector: '[data-mascot-peek="why-old"]',
      anchor: 0.75,
      maxViewportWidth: 767,
      greet: {
        expression: 'curious',
        gesture: 'wave',
        message: { id: 'why-old.hi', text: 'Hi! Let me show you the easy way.' },
      },
    },
    {
      peekId: 'pricing-essential',
      selector: '[data-mascot-peek="pricing-essential"]',
      anchor: 0.75,
      maxViewportWidth: 767,
      greet: {
        expression: 'confident',
        gesture: 'wave',
        message: { id: 'pricing-essential.hi', text: 'Hi again! Essential covers the basics.' },
      },
    },
  ],
  sections: [
    {
      sectionId: 'hero',
      selector: '[data-mascot-section="hero"]',
      enter: {
        expression: 'confident',
        gesture: 'tipHat',
        message: { id: 'hero.enter', text: 'Hungry for a better way to order?' },
      },
    },
    {
      sectionId: 'promise',
      selector: '[data-mascot-section="promise"]',
      enter: {
        expression: 'confident',
        gesture: 'nod',
        message: { id: 'promise.enter', text: 'No app. No hardware. Just a QR.' },
      },
    },
    {
      sectionId: 'features',
      selector: '#features',
      enter: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'features.enter', text: 'Scan. Order. Done. Tap a step to peek.' },
      },
    },
    {
      sectionId: 'stats',
      selector: '[data-mascot-section="stats"]',
      enter: {
        expression: 'confident',
        gesture: 'nod',
        message: { id: 'stats.enter', text: 'Have a look at these numbers.' },
      },
    },
    {
      sectionId: 'why',
      selector: '[data-mascot-section="why"]',
      enter: {
        expression: 'curious',
        gesture: 'tilt',
        message: { id: 'why.enter', text: 'Old way, meet the easy way.' },
      },
    },
    {
      sectionId: 'pricing',
      selector: '#pricing',
      enter: {
        expression: 'curious',
        gesture: 'lean',
        priority: 2,
        message: { id: 'pricing.enter', text: 'Worried about pricing? One flat monthly fee.' },
      },
    },
    {
      sectionId: 'faq',
      selector: '#faq',
      enter: {
        expression: 'curious',
        gesture: 'tilt',
        message: { id: 'faq.enter', text: 'Got a question? Let’s clear it up.' },
      },
    },
    {
      sectionId: 'final',
      selector: '[data-mascot-section="final"]',
      enter: {
        expression: 'excited',
        gesture: 'tipHat',
        message: { id: 'final.enter', text: 'Ready to give CAOS a spin?' },
      },
    },
  ],
  targets: [
    {
      targetId: 'hero-cta',
      selector: '[data-mascot-section="hero"] a[href^="/request-demo"]',
      hover: {
        expression: 'excited',
        gesture: 'nod',
        message: { id: 'hero-cta.hover', text: 'Two weeks free. Let’s go.' },
      },
      focus: {
        expression: 'excited',
        gesture: 'nod',
        message: { id: 'hero-cta.focus', text: 'Two weeks free. Let’s go.' },
      },
    },
    {
      targetId: 'hero-demo',
      selector: '[data-mascot-section="hero"] a[href^="/c/"]',
      hover: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'hero-demo.hover', text: 'Order like a guest would.' },
      },
      focus: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'hero-demo.focus', text: 'Order like a guest would.' },
      },
    },
    {
      targetId: 'tour-step',
      selector: '#features [role="tab"]',
      hover: { expression: 'curious', gesture: 'nod' },
      focus: { expression: 'curious', gesture: 'nod' },
    },
    {
      targetId: 'pricing-plan',
      selector: '[data-mascot-target="pricing-plan"]',
      hover: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'pricing-plan.hover', text: 'Essential: QR, kitchen alerts, UPI.' },
      },
      focus: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'pricing-plan.focus', text: 'Essential: QR, kitchen alerts, UPI.' },
      },
    },
    {
      targetId: 'pricing-popular',
      selector: '[data-mascot-target="pricing-popular"]',
      hover: {
        expression: 'confident',
        gesture: 'nod',
        message: { id: 'pricing-popular.hover', text: 'Pro: see what sells, bring regulars back.' },
      },
      focus: {
        expression: 'confident',
        gesture: 'nod',
        message: { id: 'pricing-popular.focus', text: 'Pro: see what sells, bring regulars back.' },
      },
    },
    {
      targetId: 'faq-question',
      selector: '#faq button',
      hover: { expression: 'curious', gesture: 'tilt' },
      focus: { expression: 'curious', gesture: 'tilt' },
    },
    {
      targetId: 'final-cta',
      selector: '[data-mascot-section="final"] a',
      hover: {
        expression: 'excited',
        gesture: 'wiggle',
        message: { id: 'final-cta.hover', text: 'Two weeks free. Say the word.' },
      },
      focus: {
        expression: 'excited',
        gesture: 'wiggle',
        message: { id: 'final-cta.focus', text: 'Two weeks free. Say the word.' },
      },
    },
  ],
};

// ─── Login page ────────────────────────────────────────────────────────────────────────────────
// A page that doesn't scroll on desktop: the mascot glides down the left (visual) panel as the
// visitor works down the form, looks toward whichever field they are on, covers its eyes while a
// password is typed, and pops up from behind the stage and form cards once each to say hi. On
// phones the left panel is hidden, so it is parked and only appears when peeking.

export const LOGIN_CONFIG: MascotConfig = {
  flow: {
    bounds: '[data-mascot-bounds="login"]',
    insets: { top: 96, bottom: 300 },
    sizeScale: 0.8,
    // Dense page: only the hat and eyes pop over a card's edge, so each peek fits the gap above it.
    peekVisible: 0.46,
    progress: 'steps',
    steps: [
      { selector: '[data-mascot-field="identifier"]', progress: 0.3 },
      { selector: '[data-mascot-field="password"]', progress: 0.65 },
      { selector: '[data-mascot-field="submit"]', progress: 1 },
    ],
    peekHoldMs: 5_500,
    peekRepeatMs: Infinity,
  },
  peeks: [
    {
      peekId: 'login-stage',
      selector: '[data-mascot-peek="login-stage"]',
      anchor: 0.82,
      greet: {
        expression: 'excited',
        gesture: 'wave',
        message: { id: 'login-stage.hi', text: 'Hi! I’m Caos. Welcome back.' },
      },
    },
    {
      peekId: 'login-form',
      selector: '[data-mascot-peek="login-form"]',
      anchor: 0.85,
      greet: {
        expression: 'confident',
        gesture: 'wave',
        // Short: there is no free space beside this peek, so the bubble sits over the demo card.
        message: {
          id: 'login-form.hi',
          text: 'Hi again! Sign in whenever you’re ready.',
          durationMs: 3_000,
        },
      },
    },
  ],
  sections: [
    {
      sectionId: 'login',
      selector: '[data-mascot-section="login"]',
      enter: {
        expression: 'confident',
        gesture: 'tipHat',
        message: { id: 'login.enter', text: 'Ready to check on your café?' },
      },
    },
  ],
  targets: [
    {
      targetId: 'login-identifier',
      selector: '[data-mascot-field="identifier"]',
      focus: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'login-identifier.focus', text: 'The email or phone you signed up with.' },
      },
    },
    {
      targetId: 'login-password',
      selector: '[data-mascot-field="password"]',
      focus: {
        expression: 'shy',
        message: { id: 'login-password.focus', text: 'I’m not looking!' },
      },
    },
    {
      targetId: 'login-submit',
      selector: '[data-mascot-field="submit"]',
      hover: {
        expression: 'excited',
        gesture: 'nod',
        message: { id: 'login-submit.hover', text: 'Let’s go!' },
      },
      focus: {
        expression: 'excited',
        gesture: 'nod',
        message: { id: 'login-submit.focus', text: 'Let’s go!' },
      },
    },
    {
      targetId: 'login-demo',
      selector: '[data-mascot-field="demo"]',
      hover: {
        expression: 'curious',
        gesture: 'tilt',
        message: { id: 'login-demo.hover', text: 'No password needed. Take a look around.' },
      },
      focus: {
        expression: 'curious',
        gesture: 'tilt',
        message: { id: 'login-demo.focus', text: 'No password needed. Take a look around.' },
      },
    },
  ],
};

// ─── Order page (the customer's live order tracker) ─────────────────────────────────────────────
// Calm on purpose and built for a phone: it lives in a reserved spot at the top of the order card
// (covering nothing), turns slowly, and reacts only to what happens to the order. Its message
// stays beside it until the status changes, and is read out to screen readers. Past ten minutes it reassures; past twenty it points at the staff. Copy never
// promises a time, only what is true.

export const ORDER_CONFIG: MascotConfig = {
  flow: {
    mode: 'slot',
    slot: '[data-mascot-slot="order"]',
    size: 112,
    ambientSpin: true,
  },
  sections: [],
  targets: [],
  peeks: [],
  signals: {
    placed: {
      expression: 'excited',
      gesture: 'wave',
      message: {
        id: 'order.placed',
        text: 'Order sent! I’ll keep you posted.',
        durationMs: Infinity,
        announce: true,
      },
    },
    preparing: {
      expression: 'curious',
      gesture: 'nod',
      message: {
        id: 'order.preparing',
        text: 'The kitchen is making your order.',
        durationMs: Infinity,
        announce: true,
      },
    },
    ready: {
      expression: 'excited',
      gesture: 'pop',
      message: { id: 'order.ready', text: 'Ready! Enjoy.', durationMs: Infinity, announce: true },
    },
    completed: {
      expression: 'confident',
      gesture: 'tipHat',
      message: {
        id: 'order.completed',
        text: 'Enjoy! Thanks for ordering.',
        durationMs: Infinity,
        announce: true,
      },
    },
    cancelled: {
      expression: 'idle',
      message: {
        id: 'order.cancelled',
        text: 'Sorry, this order was cancelled.',
        durationMs: Infinity,
        announce: true,
      },
    },
    'wait-long': {
      expression: 'confident',
      gesture: 'nod',
      message: {
        id: 'order.wait-long',
        text: 'Taking a little longer than usual. Your order is still in good hands. Take a breath.',
        durationMs: Infinity,
        announce: true,
      },
    },
    'wait-longer': {
      expression: 'confident',
      gesture: 'tilt',
      message: {
        id: 'order.wait-longer',
        text: 'Still working on it. Feel free to ask the café team for an update.',
        durationMs: Infinity,
        announce: true,
      },
    },
  },
};

// ─── Request-a-demo page ───────────────────────────────────────────────────────────────────────
// A form page. On desktop the mascot has its own stage under the benefits list and moves across it
// as the visitor works down the form, reacting to each field; it pops up from the form card once to
// say hi. On phones it lives in a reserved spot at the top of the form card (so it never covers a
// field you're typing into), with its message beside it. The page drives three signals from the
// submit: `submitting`, `error` and `sent`. They outrank field focus, because focus is usually still
// on the submit button when the answer comes back.

const field = (name: string) => `[data-mascot-field="demo-${name}"]`;

export const DEMO_CONFIG: MascotConfig = {
  flow: {
    bounds: '[data-mascot-bounds="demo"]',
    insets: { top: 12, bottom: 12 },
    sizeScale: 0.75,
    peekVisible: 0.46,
    progress: 'steps',
    steps: [
      { selector: field('name'), progress: 0.12 },
      { selector: field('brand'), progress: 0.26 },
      { selector: field('phone'), progress: 0.4 },
      { selector: field('city'), progress: 0.52 },
      { selector: field('email'), progress: 0.62 },
      { selector: field('type'), progress: 0.72 },
      { selector: field('message'), progress: 0.82 },
      { selector: field('consent'), progress: 0.92 },
      { selector: field('submit'), progress: 1 },
    ],
    peekHoldMs: 5_000,
    peekRepeatMs: Infinity,
  },
  phoneFlow: { mode: 'slot', slot: '[data-mascot-slot="demo"]', size: 84 },
  peeks: [
    {
      peekId: 'demo-form',
      selector: '[data-mascot-peek="demo-form"]',
      anchor: 0.86,
      // Phones use the slot instead (the card's top edge sits right under the benefits list there).
      minViewportWidth: LAYOUT.phoneMaxWidth + 1,
      greet: {
        expression: 'excited',
        gesture: 'wave',
        message: { id: 'demo-form.hi', text: 'Hi! I’m Caos. Let’s get you started.' },
      },
    },
  ],
  sections: [
    {
      sectionId: 'demo',
      selector: '[data-mascot-section="demo"]',
      enter: {
        expression: 'confident',
        gesture: 'tipHat',
        message: { id: 'demo.enter', text: 'Two weeks free, and we set it up with you.' },
      },
    },
  ],
  targets: [
    {
      targetId: 'demo-name',
      selector: field('name'),
      focus: {
        expression: 'excited',
        gesture: 'wave',
        message: { id: 'demo-name.focus', text: 'Hi! Nice to meet you.' },
      },
    },
    {
      targetId: 'demo-brand',
      selector: field('brand'),
      focus: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'demo-brand.focus', text: 'Ooh, what’s your café called?' },
      },
    },
    {
      targetId: 'demo-phone',
      selector: field('phone'),
      focus: {
        expression: 'confident',
        gesture: 'nod',
        message: { id: 'demo-phone.focus', text: 'We’ll call this number about your trial.' },
      },
    },
    {
      targetId: 'demo-city',
      selector: field('city'),
      focus: {
        expression: 'curious',
        gesture: 'tilt',
        message: { id: 'demo-city.focus', text: 'Where’s your café?' },
      },
    },
    {
      targetId: 'demo-email',
      selector: field('email'),
      focus: {
        expression: 'curious',
        gesture: 'nod',
        message: { id: 'demo-email.focus', text: 'Optional. Skip it if you like.' },
      },
    },
    {
      targetId: 'demo-type',
      selector: field('type'),
      focus: {
        expression: 'curious',
        gesture: 'lean',
        message: { id: 'demo-type.focus', text: 'Optional. Pick whatever fits best.' },
      },
    },
    {
      targetId: 'demo-message',
      selector: field('message'),
      focus: {
        expression: 'curious',
        gesture: 'tilt',
        message: { id: 'demo-message.focus', text: 'Menus, timings, questions. Anything helps.' },
      },
    },
    {
      targetId: 'demo-consent',
      selector: field('consent'),
      focus: {
        expression: 'confident',
        gesture: 'nod',
        message: { id: 'demo-consent.focus', text: 'Only about your trial. Never shared.' },
      },
    },
    {
      targetId: 'demo-submit',
      selector: field('submit'),
      hover: {
        expression: 'excited',
        gesture: 'wiggle',
        message: { id: 'demo-submit.hover', text: 'Two weeks free. Let’s go!' },
      },
      focus: {
        expression: 'excited',
        gesture: 'wiggle',
        message: { id: 'demo-submit.focus', text: 'Two weeks free. Let’s go!' },
      },
    },
  ],
  signals: {
    submitting: {
      expression: 'curious',
      gesture: 'nod',
      priority: 7,
      message: { id: 'demo.submitting', text: 'Sending it over…', durationMs: Infinity },
    },
    error: {
      expression: 'curious',
      gesture: 'tilt',
      priority: 7,
      message: {
        id: 'demo.error',
        text: 'Almost there. Check the note above the button.',
        durationMs: 6_000,
      },
    },
    sent: {
      expression: 'excited',
      gesture: 'pop',
      priority: 7,
      message: { id: 'demo.sent', text: 'You’re in! We’ll give you a call.', durationMs: Infinity },
    },
  },
};

// ─── Customer menu page ────────────────────────────────────────────────────────────────────────
// A café's own menu. The mascot rests small in a corner on every viewport and says nothing of its
// own: everything it says (the returning-guest welcome, category tips) comes from the café's data,
// which the page hands over at runtime as `reactions` and drives with `signal`.

export const MENU_CONFIG: MascotConfig = {
  flow: { mode: 'dock' },
  phoneFlow: { mode: 'dock' },
  sections: [],
  targets: [],
  peeks: [],
};

export const MASCOT_CONFIGS: Record<PageId, MascotConfig> = {
  landing: LANDING_CONFIG,
  login: LOGIN_CONFIG,
  order: ORDER_CONFIG,
  demo: DEMO_CONFIG,
  menu: MENU_CONFIG,
};

/** The flow a page uses at this viewport: `flow`, with `phoneFlow` merged over it on phones. Pure. */
export const resolveFlow = (config: MascotConfig, isPhone: boolean): PageFlow | undefined =>
  isPhone && config.phoneFlow ? { ...config.flow, ...config.phoneFlow } : config.flow;

/** Returns human-readable problems with a config (empty when it is sound). Cheap enough to run in
 * dev on every mount; tests run it against MASCOT_CONFIG. */
export const validateConfig = (config: MascotConfig): string[] => {
  const problems: string[] = [];
  const seen = new Set<string>();
  const messageIds = new Set<string>();

  const checkReaction = (owner: string, reaction: MascotConfig['sections'][number]['enter']) => {
    if (!reaction) return;
    if (reaction.priority !== undefined && !Number.isFinite(reaction.priority)) {
      problems.push(`${owner}: priority must be a finite number`);
    }
    const message = reaction.message;
    if (!message) return;
    if (!message.id || !message.text.trim()) {
      problems.push(`${owner}: message needs a non-empty id and text`);
    } else if (messageIds.has(message.id)) {
      problems.push(`${owner}: duplicate message id "${message.id}"`);
    } else {
      messageIds.add(message.id);
    }
  };

  for (const s of config.sections) {
    if (!s.sectionId || !s.selector) problems.push('section needs sectionId and selector');
    if (seen.has(`s:${s.sectionId}`)) problems.push(`duplicate sectionId "${s.sectionId}"`);
    seen.add(`s:${s.sectionId}`);
    checkReaction(`section ${s.sectionId}`, s.enter);
  }
  for (const p of config.peeks) {
    if (!p.peekId || !p.selector) problems.push('peek needs peekId and selector');
    if (seen.has(`p:${p.peekId}`)) problems.push(`duplicate peekId "${p.peekId}"`);
    seen.add(`p:${p.peekId}`);
    if (!(p.anchor >= 0 && p.anchor <= 1)) problems.push(`peek ${p.peekId}: anchor must be 0..1`);
    checkReaction(`peek ${p.peekId}`, p.greet);
  }
  for (const step of [...(config.flow?.steps ?? []), ...(config.phoneFlow?.steps ?? [])]) {
    if (!step.selector) problems.push('flow step needs a selector');
    if (!(step.progress >= 0 && step.progress <= 1))
      problems.push(`flow step ${step.selector}: progress must be 0..1`);
  }
  for (const flow of [config.flow, config.phoneFlow]) {
    if (flow?.mode === 'slot' && !flow.slot) problems.push('slot mode needs a slot selector');
  }
  for (const [key, reaction] of Object.entries(config.signals ?? {})) {
    checkReaction(`signal ${key}`, reaction);
  }
  for (const t of config.targets) {
    if (!t.targetId || !t.selector) problems.push('target needs targetId and selector');
    if (seen.has(`t:${t.targetId}`)) problems.push(`duplicate targetId "${t.targetId}"`);
    seen.add(`t:${t.targetId}`);
    checkReaction(`target ${t.targetId} hover`, t.hover);
    checkReaction(`target ${t.targetId} focus`, t.focus);
  }
  return problems;
};
