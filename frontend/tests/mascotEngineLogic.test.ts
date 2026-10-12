import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pickActiveSection } from '../src/mascot/sections';
import {
  flowPosition,
  flowPositionIn,
  overlaps,
  peekHeadBox,
  peekPlacement,
  firstClearAnchor,
  peekVisible,
  pickPeek,
} from '../src/mascot/flow';
import {
  LANDING_CONFIG,
  LOGIN_CONFIG,
  MASCOT_CONFIGS,
  validateConfig,
} from '../src/mascot/config';
import { FLOW, LAYOUT, PEEK } from '../src/mascot/config';
import {
  GESTURE_DURATION_MS,
  ZERO_OFFSETS,
  accumulate,
  gestureOffsets,
} from '../src/mascot/engine/gestures';
import type { Gesture } from '../src/mascot/types';

describe('pickActiveSection', () => {
  const rects = [
    { id: 'hero', top: -400, bottom: 300 },
    { id: 'features', top: 300, bottom: 1100 },
  ];

  it('picks the section under the probe line', () => {
    // 900px viewport, line at 45% = 405 → inside "features"
    expect(pickActiveSection(rects, 900, null)).toBe('features');
    expect(pickActiveSection(rects, 500, null)).toBe('hero'); // line at 225
  });

  it('keeps the previous section when the line falls in a gap', () => {
    const gap = [
      { id: 'a', top: -500, bottom: 100 },
      { id: 'b', top: 300, bottom: 900 },
    ];
    expect(pickActiveSection(gap, 600, 'a')).toBe('a'); // line at 270: between a and b
    expect(pickActiveSection(gap, 600, null)).toBeNull();
  });

  it('treats the bottom edge as exclusive so adjacent sections never both match', () => {
    const adjacent = [
      { id: 'a', top: 0, bottom: 405 },
      { id: 'b', top: 405, bottom: 900 },
    ];
    expect(pickActiveSection(adjacent, 900, null)).toBe('b');
  });

  it('copes with no sections on the page', () => {
    expect(pickActiveSection([], 800, 'x')).toBe('x');
  });
});

describe('flow path', () => {
  const vw = 1920;
  const vh = 940;
  const size = 280;

  it('starts on the right near the top and ends low on the page', () => {
    const top = flowPosition(0, vw, vh, size);
    const bottom = flowPosition(1, vw, vh, size);
    expect(top.x).toBeGreaterThan(vw / 2);
    expect(bottom.y).toBeGreaterThan(top.y);
    expect(bottom.y + size).toBeLessThanOrEqual(vh);
  });

  it('descends monotonically while sweeping both sides (the S-curve)', () => {
    let prevY = -Infinity;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const p = flowPosition(i / 200, vw, vh, size);
      expect(p.y).toBeGreaterThanOrEqual(prevY - 1e-9);
      prevY = p.y;
      min = Math.min(min, p.x);
      max = Math.max(max, p.x);
    }
    expect(min).toBeLessThan(vw * 0.15);
    expect(max).toBeGreaterThan(vw * 0.75);
  });

  it('stays inside the viewport margins at every progress, on any width', () => {
    for (const w of [360, 768, 1280, 1920]) {
      const s = w < 640 ? 128 : w < 1024 ? 210 : 280;
      for (let i = 0; i <= 100; i++) {
        const p = flowPosition(i / 100, w, 800, s);
        expect(p.x).toBeGreaterThanOrEqual(LAYOUT.margin - 1e-6);
        expect(p.x + s).toBeLessThanOrEqual(w - LAYOUT.margin + 1e-6);
      }
    }
  });

  it('is continuous: no teleporting between adjacent scroll positions', () => {
    let prev = flowPosition(0, vw, vh, size);
    for (let i = 1; i <= 1000; i++) {
      const p = flowPosition(i / 1000, vw, vh, size);
      expect(Math.abs(p.x - prev.x)).toBeLessThan(60);
      prev = p;
    }
    expect(FLOW.swings).toBeGreaterThan(1);
  });

  it('clamps out-of-range progress', () => {
    expect(flowPosition(-3, vw, vh, size)).toEqual(flowPosition(0, vw, vh, size));
    expect(flowPosition(9, vw, vh, size)).toEqual(flowPosition(1, vw, vh, size));
  });
});

describe('flow path inside an area (login page panel)', () => {
  const area = { left: 0, right: 1037, top: 0, bottom: 937 };
  const insets = { top: 96, bottom: 300 };
  const size = 224;

  it('keeps the mascot inside the area and clear of the insets at every progress', () => {
    for (let i = 0; i <= 100; i++) {
      const p = flowPositionIn(i / 100, area, size, insets);
      expect(p.x).toBeGreaterThanOrEqual(area.left + LAYOUT.margin - 1e-6);
      expect(p.x + size).toBeLessThanOrEqual(area.right - LAYOUT.margin + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(area.top + insets.top - 1e-6);
      expect(p.y + size).toBeLessThanOrEqual(area.bottom - insets.bottom + 1e-6);
    }
  });

  it('is offset by the area, not the viewport (a panel that does not start at x=0)', () => {
    const shifted = { left: 800, right: 1837, top: 0, bottom: 937 };
    const a = flowPositionIn(0.5, area, size, insets);
    const b = flowPositionIn(0.5, shifted, size, insets);
    expect(b.x - a.x).toBeCloseTo(800);
    expect(b.y).toBeCloseTo(a.y);
  });

  it('degrades to a fixed spot when the area is smaller than the mascot', () => {
    const tiny = { left: 0, right: 200, top: 0, bottom: 500 };
    const p0 = flowPositionIn(0, tiny, size, insets);
    const p1 = flowPositionIn(1, tiny, size, insets);
    expect(p0.x).toBeCloseTo(p1.x);
  });

  it('flowPosition is the whole-viewport case of flowPositionIn', () => {
    expect(flowPosition(0.37, 1920, 940, 280)).toEqual(
      flowPositionIn(0.37, { left: 0, right: 1920, top: 0, bottom: 940 }, 280, { top: 76, bottom: 0 }),
    );
  });
});

describe('peek placement and selection', () => {
  const card = { top: 1000, bottom: 1600, left: 400, right: 900 };

  it('puts the box so only PEEK.visible of it clears the card top edge', () => {
    const p = peekPlacement(card, 280, 0.7);
    expect(p.y).toBeCloseTo(card.top - 280 * PEEK.visible);
    // ...and less of the small phone-sized mascot, since the gaps between stacked cards are small.
    expect(peekVisible(128)).toBe(PEEK.visibleCompact);
    expect(peekPlacement(card, 128, 0.7).y).toBeCloseTo(card.top - 128 * PEEK.visibleCompact);
    expect(p.x).toBeGreaterThanOrEqual(card.left);
    expect(p.x + 280).toBeLessThanOrEqual(card.right);
  });

  it('keeps the mascot centred on a card narrower than itself', () => {
    const p = peekPlacement({ top: 0, bottom: 500, left: 20, right: 200 }, 280, 0.9);
    expect(p.x + 140).toBeCloseTo(110);
  });

  const spot = (id: string, top: number) => ({ id, top, bottom: top + 500, left: 100, right: 700 });

  it('picks a card only when its top has room above it and is not too low', () => {
    expect(pickPeek([spot('a', 120)], 900, 280, null)).toBeNull();
    expect(pickPeek([spot('a', 800)], 900, 280, null)).toBeNull();
    expect(pickPeek([spot('a', 400)], 900, 280, null)).toBe('a');
  });

  it('keeps an active peek (hysteresis) until the card is clearly leaving', () => {
    expect(pickPeek([spot('a', 200)], 900, 280, 'a')).toBe('a');
    expect(pickPeek([spot('a', 120)], 900, 280, 'a')).toBeNull();
  });

  it('does not peek where something blocks the headroom (stacked cards on a phone)', () => {
    // The second stacked card: eligible by position, but its headroom is taken by the card above.
    const blocked = (id: string) => id === 'pro';
    expect(pickPeek([spot('pro', 400)], 900, 128, null, () => false, blocked)).toBeNull();
    // With a free spot elsewhere in the list, that one is chosen instead.
    expect(
      pickPeek([spot('pro', 400), spot('essential', 420)], 900, 128, null, () => false, blocked),
    ).toBe('essential');
  });

  it('detects the stacked-card overlap the phone layout produces, and not the desktop one', () => {
    const size = 128;
    // Phone: the Essential card ends 24px above the Pro card, so it sits inside the head box.
    const pro = { top: 800, bottom: 1500, left: 20, right: 370 };
    const head = peekHeadBox(pro, size, 0.8);
    const essentialCard = { top: 100, bottom: 776, left: 20, right: 370 };
    expect(overlaps(head, essentialCard)).toBe(true);
    // The Essential card has free space above it (just the section subtitle's bottom margin).
    const essential = { top: 100, bottom: 776, left: 20, right: 370 };
    const subtitleText = { top: 20, bottom: 44, left: 60, right: 330 };
    expect(overlaps(peekHeadBox(essential, size, 0.75), subtitleText)).toBe(false);
    // Desktop: Pro sits beside Essential and only a short subtitle (its text extent) is above.
    const proDesktop = { top: 800, bottom: 1500, left: 760, right: 1200 };
    const headDesktop = peekHeadBox(proDesktop, 280, 0.8);
    const desktopSubtitle = { top: 690, bottom: 714, left: 540, right: 880 };
    expect(overlaps(headDesktop, desktopSubtitle)).toBe(false);
  });

  it('fits under a phone section subtitle that ends 37px above the card (measured on a 390px layout)', () => {
    const card = { top: 300, bottom: 623, left: 16, right: 368 };
    const subtitleText = { top: 245, bottom: 263, left: 98, right: 285 };
    expect(overlaps(peekHeadBox(card, 128, 0.75), subtitleText)).toBe(false);
  });

  it('tolerates a glancing touch (17px horizontal, measured on the desktop Pro card heading)', () => {
    const card = { top: 430, bottom: 1000, left: 969, right: 1405 };
    const heading = { top: 255, bottom: 316, left: 720, right: 1194 };
    expect(overlaps(peekHeadBox(card, 280, 0.8), heading)).toBe(false);
    expect(firstClearAnchor(card, 280, 0.8, [heading])).toBe(0.8);
  });

  it('slides along the card edge to a clear spot when the preferred one is taken', () => {
    const card = { top: 430, bottom: 1000, left: 900, right: 1400 };
    // A link above the card's right end: blocks the preferred (and the clamped 0.92) spots.
    const link = { top: 300, bottom: 340, left: 1200, right: 1400 };
    expect(overlaps(peekHeadBox(card, 280, 0.8), link)).toBe(true);
    const anchor = firstClearAnchor(card, 280, 0.8, [link]);
    expect(anchor).toBe(0.08);
    expect(overlaps(peekHeadBox(card, 280, anchor as number), link)).toBe(false);
  });

  it('keeps the preferred spot when it is clear, and gives up when the whole edge is covered', () => {
    const card = { top: 430, bottom: 1000, left: 900, right: 1400 };
    expect(firstClearAnchor(card, 280, 0.8, [])).toBe(0.8);
    const wall = { top: 200, bottom: 428, left: 0, right: 3000 };
    expect(firstClearAnchor(card, 280, 0.8, [wall])).toBeNull();
  });

  it('every stacked-card section has a peek spot on phones, tablets and desktops', () => {
    const allowedAt = (id: string, vw: number) => {
      const p = LANDING_CONFIG.peeks.find((x) => x.peekId === id);
      return !!p && (p.maxViewportWidth ?? Infinity) >= vw && (p.minViewportWidth ?? 0) <= vw;
    };
    for (const vw of [360, 390, 600, 767]) {
      expect(allowedAt('pricing-essential', vw)).toBe(true);
      expect(allowedAt('why-old', vw)).toBe(true);
      expect(allowedAt('pricing', vw) || allowedAt('why', vw)).toBe(true); // may be blocked live
      expect(allowedAt('tour', vw)).toBe(false); // chips row sits right above the panel
    }
    for (const vw of [768, 1024, 1280, 1920]) {
      expect(allowedAt('pricing-essential', vw)).toBe(false);
      expect(allowedAt('why-old', vw)).toBe(false);
      expect(allowedAt('pricing', vw)).toBe(true);
      expect(allowedAt('why', vw)).toBe(true);
    }
    expect(allowedAt('tour', 1024)).toBe(true);
    expect(allowedAt('tour', 900)).toBe(false);
  });

  it('waits for a card that is still fading in (it would show the mascot through it)', () => {
    expect(pickPeek([{ ...spot('a', 400), ready: false }], 900, 280, null)).toBeNull();
    expect(pickPeek([{ ...spot('a', 400), ready: true }], 900, 280, null)).toBe('a');
  });

  it('skips cards that peeked recently', () => {
    expect(pickPeek([spot('a', 400), spot('b', 450)], 900, 280, null, (id) => id === 'a')).toBe('b');
  });

  it('ignores cards too short to hide a mascot behind', () => {
    expect(pickPeek([{ id: 's', top: 400, bottom: 450, left: 0, right: 500 }], 900, 280, null)).toBeNull();
  });
});

describe('gesture math', () => {
  const gestures = Object.keys(GESTURE_DURATION_MS) as Gesture[];

  it('every gesture starts and ends at neutral so nothing can leave the rig displaced', () => {
    for (const g of gestures) {
      for (const p of [0, 1]) {
        const o = gestureOffsets(g, p);
        for (const [key, value] of Object.entries(o)) {
          expect(Math.abs(value), `${g}@${p}.${key}`).toBeLessThan(1e-6);
        }
      }
    }
  });

  it('stays within sane bounds mid-gesture (no wild spins)', () => {
    for (const g of gestures) {
      for (let i = 0; i <= 50; i++) {
        const o = gestureOffsets(g, i / 50);
        expect(Math.abs(o.headPitch)).toBeLessThan(0.5);
        expect(Math.abs(o.headRoll)).toBeLessThan(0.5);
        expect(Math.abs(o.bodyPitch)).toBeLessThan(0.5);
        expect(Math.abs(o.hatLift)).toBeLessThan(0.5);
      }
    }
  });

  it('clamps progress outside 0..1 instead of extrapolating', () => {
    for (const g of gestures) {
      const a = gestureOffsets(g, 5);
      for (const v of Object.values(a)) expect(Math.abs(v)).toBeLessThan(1e-6);
    }
  });

  it('accumulate adds weighted offsets', () => {
    const sum = { ...ZERO_OFFSETS };
    accumulate(sum, { ...ZERO_OFFSETS, headRoll: 1 }, 0.5);
    accumulate(sum, { ...ZERO_OFFSETS, headRoll: 1 }, 0.25);
    expect(sum.headRoll).toBeCloseTo(0.75);
  });
});

// ── Route scoping ──────────────────────────────────────────────────────────────────────────────
// The mascot must be reachable from the landing page only. Static check over the real source: the
// only code outside src/mascot that may import it is pages/LandingPage.tsx, and three.js may only
// be imported from inside src/mascot/engine.
describe('mascot route scoping', () => {
  const srcRoot = join(__dirname, '..', 'src');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  const files = walk(srcRoot).filter((f) => /\.(ts|tsx)$/.test(f));
  const rel = (f: string) => relative(srcRoot, f).split('\\').join('/');

  it('is imported only by the landing and login pages', () => {
    const importers = files
      .filter((f) => !rel(f).startsWith('mascot/'))
      .filter((f) => /from\s+['"](@\/|\.{1,2}\/)([^'"]*\/)?mascot[\/'"]/.test(readFileSync(f, 'utf8')))
      .map(rel)
      .sort();
    expect(importers).toEqual(['pages/LandingPage.tsx', 'pages/LoginPage.tsx']);
  });

  it('every page mounts it through the lazy PageMascot entry, with its own page id', () => {
    const landing = readFileSync(join(srcRoot, 'pages/LandingPage.tsx'), 'utf8');
    const login = readFileSync(join(srcRoot, 'pages/LoginPage.tsx'), 'utf8');
    expect(landing).toMatch(/<PageMascot page="landing" \/>/);
    expect(login).toMatch(/<PageMascot page="login" \/>/);
    // The checkout, ordering, dashboard and register pages must stay mascot-free.
    for (const page of [
      'CustomerMenuPage',
      'CustomerOrderTrackingPage',
      'CheckoutReturnPage',
      'OwnerDashboard',
      'SuperAdminDashboard',
      'RegisterPage',
      'ForgotPasswordPage',
    ]) {
      expect(readFileSync(join(srcRoot, `pages/${page}.tsx`), 'utf8')).not.toMatch(/mascot/i);
    }
  });

  it('only LandingPage is routed at "/" and it is the only mount point', () => {
    const routes = readFileSync(join(srcRoot, 'routes.tsx'), 'utf8');
    expect(routes).not.toMatch(/mascot/i);
    const app = readFileSync(join(srcRoot, 'App.tsx'), 'utf8');
    expect(app).not.toMatch(/mascot/i);
  });

  it('keeps three.js inside the lazily loaded engine folder', () => {
    const users = files.filter((f) => /from\s+['"]three['"]/.test(readFileSync(f, 'utf8'))).map(rel);
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) expect(u.startsWith('mascot/engine/')).toBe(true);
  });

  it('loads the experience and the engine only through dynamic imports', () => {
    const landing = readFileSync(join(srcRoot, 'mascot/PageMascot.tsx'), 'utf8');
    expect(landing).toMatch(/lazy\(\(\) => import\('\.\/MascotExperience'\)\)/);
    expect(landing).not.toMatch(/^import .*MascotExperience/m);
    const shell = readFileSync(join(srcRoot, 'mascot/MascotExperience.tsx'), 'utf8');
    expect(shell).toMatch(/import\('\.\/engine\/createEngine'\)/);
    // `import type` is erased at build time, so only value imports would pull three into this chunk.
    expect(shell).not.toMatch(/^import (?!type\b).*from '\.\/engine\/createEngine'/m);
  });
});

describe('page configs', () => {
  it('has a config for every page id, each valid', () => {
    expect(Object.keys(MASCOT_CONFIGS).sort()).toEqual(['landing', 'login']);
    for (const config of Object.values(MASCOT_CONFIGS)) {
      expect(validateConfig(config)).toEqual([]);
    }
  });

  it('login: path follows form steps in order down the form, within 0..1', () => {
    const steps = LOGIN_CONFIG.flow?.steps ?? [];
    expect(LOGIN_CONFIG.flow?.progress).toBe('steps');
    expect(steps.map((s) => s.selector)).toEqual([
      '[data-mascot-field="identifier"]',
      '[data-mascot-field="password"]',
      '[data-mascot-field="submit"]',
    ]);
    const progress = steps.map((s) => s.progress);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
    expect(progress[progress.length - 1]).toBe(1);
  });

  it('login: each card peeks once per visit and only for a limited time', () => {
    expect(LOGIN_CONFIG.flow?.peekRepeatMs).toBe(Infinity);
    expect(LOGIN_CONFIG.flow?.peekHoldMs).toBeGreaterThan(2_000);
    expect(LOGIN_CONFIG.peeks.map((p) => p.peekId)).toEqual(['login-stage', 'login-form']);
  });

  it('login: the glide area is the left panel, and every page-markup hook it names exists', () => {
    const srcRoot = join(__dirname, '..', 'src');
    const markup = [
      'pages/LoginPage.tsx',
      'organisms/auth/LoginShowcase/LoginShowcase.tsx',
      'molecules/LoginIdentifierField/LoginIdentifierField.tsx',
    ]
      .map((f) => readFileSync(join(srcRoot, f), 'utf8'))
      .join('\n');
    const names = [
      LOGIN_CONFIG.flow?.bounds,
      ...LOGIN_CONFIG.sections.map((s) => s.selector),
      ...LOGIN_CONFIG.peeks.map((p) => p.selector),
      ...LOGIN_CONFIG.targets.map((t) => t.selector),
    ];
    for (const selector of names) {
      const attr = /\[(data-[a-z-]+)="([^"]+)"\]/.exec(selector ?? '');
      expect(attr, `selector ${selector}`).not.toBeNull();
      expect(markup, `${selector} is in the markup`).toContain(`${attr![1]}="${attr![2]}"`);
    }
  });
});
