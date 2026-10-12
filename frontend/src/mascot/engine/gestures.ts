import type { Gesture } from '../types';

/** Additive offsets one gesture contributes at a moment in time. Radians for angles, model units
 * for lift/shift, multipliers (1 = neutral) for scale. Summed across active gestures. */
export interface GestureOffsets {
  headPitch: number;
  headYaw: number;
  headRoll: number;
  bodyPitch: number;
  bodyLift: number;
  bodyScale: number;
  hatLift: number;
  hatRoll: number;
  earWiggle: number;
  /** Raised-paw wave: 0 = paw at rest holding the QR, 1 = raised beside the head. */
  pawWave: number;
  /** Waving sway of the raised paw (radians). */
  pawSwing: number;
}

export const ZERO_OFFSETS: GestureOffsets = {
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  bodyPitch: 0,
  bodyLift: 0,
  bodyScale: 0,
  hatLift: 0,
  hatRoll: 0,
  earWiggle: 0,
  pawWave: 0,
  pawSwing: 0,
};

export const GESTURE_DURATION_MS: Record<Gesture, number> = {
  pop: 650,
  nod: 700,
  tilt: 1100,
  lean: 1200,
  tipHat: 1000,
  wiggle: 800,
  wave: 1800,
};

/** Smooth 0 → 1 → 0 hump over p in [0, 1]. */
const hump = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
/** Hump that rises over the first `rise` fraction, holds, then falls over the last `fall`. */
const plateau = (p: number, rise = 0.25, fall = 0.3) => {
  const c = Math.min(1, Math.max(0, p));
  if (c < rise) return Math.sin((c / rise) * (Math.PI / 2));
  if (c > 1 - fall) return Math.sin(((1 - c) / fall) * (Math.PI / 2));
  return 1;
};

/** Offsets for `gesture` at progress p (0..1). Pure, so it can be tested without a renderer. */
export const gestureOffsets = (gesture: Gesture, p: number): GestureOffsets => {
  const o = { ...ZERO_OFFSETS };
  switch (gesture) {
    case 'pop':
      // Squash, then spring up with a little overshoot.
      o.bodyScale = 0.1 * hump(p) * Math.cos(p * Math.PI * 1.5);
      o.bodyLift = 0.18 * hump(p);
      break;
    case 'nod':
      o.headPitch = 0.28 * Math.abs(Math.sin(p * Math.PI * 2)) * (1 - p * 0.4);
      break;
    case 'tilt':
      o.headRoll = 0.3 * plateau(p);
      o.headYaw = -0.12 * plateau(p);
      break;
    case 'lean':
      o.bodyPitch = 0.2 * plateau(p, 0.3, 0.3);
      o.headPitch = 0.1 * plateau(p, 0.3, 0.3);
      o.bodyLift = -0.05 * plateau(p);
      break;
    case 'tipHat':
      o.hatLift = 0.28 * hump(Math.min(1, p * 1.2));
      o.hatRoll = -0.35 * hump(Math.min(1, p * 1.2));
      o.headPitch = 0.1 * hump(p);
      break;
    case 'wiggle':
      o.headRoll = 0.14 * Math.sin(p * Math.PI * 6) * (1 - p);
      o.earWiggle = 0.4 * Math.sin(p * Math.PI * 8) * (1 - p);
      o.bodyLift = 0.08 * hump(p);
      break;
    case 'wave':
      // Paw up, a few friendly swings, paw down; head tips and nods hello.
      o.pawWave = plateau(p, 0.15, 0.2);
      o.pawSwing = 0.5 * Math.sin(p * Math.PI * 7) * plateau(p, 0.2, 0.25);
      o.headRoll = 0.12 * hump(p);
      o.headPitch = 0.12 * Math.abs(Math.sin(p * Math.PI * 2));
      o.bodyLift = 0.06 * hump(p);
      break;
  }
  return o;
};

/** Adds `b` scaled by `weight` into `a` in place. */
export const accumulate = (a: GestureOffsets, b: GestureOffsets, weight: number): void => {
  const keys = Object.keys(a) as (keyof GestureOffsets)[];
  for (const key of keys) a[key] += b[key] * weight;
};
