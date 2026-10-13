import type { Expression, Gesture } from '../types';
import {
  GESTURE_DURATION_MS,
  ZERO_OFFSETS,
  accumulate,
  gestureOffsets,
  type GestureOffsets,
} from './gestures';
import { REST, type HamsterRig } from './model';

// Each concern owns its own channel and writes only its own numbers; `apply()` then sums every
// channel into the rig once per frame. Nothing else touches the rig's transforms, so a hover
// nod, a scroll lean and the idle breathing can never fight over the same property.
//
//   expression : damped target pose of the face (brows, lids, mouth, cheeks)
//   idle       : breathing, sway, blinks, ear twitches
//   scroll     : lean/pitch from scroll velocity, a quick shuffle when switching sides
//   look       : head turn toward the hovered/focused element
//   gestures   : timed one-shots (nod, tilt, lean, tipHat, wiggle, pop), cross-faded
//   entrance   : the first pop-in

interface FacePose {
  browLY: number;
  browLRot: number;
  browRY: number;
  browRRot: number;
  lidL: number;
  lidR: number;
  mouthScale: number;
  mouthRoll: number;
  cheek: number;
  headRoll: number;
}

// Brows slant inward-down (the logo's mischievous scowl); the right one does the talking. Lid
// angle: positive closes from the top, negative opens; ~-0.5 is "eyes fully open" and -0.9 is wide.
// The smirk is baked into the mouth geometry, so no pose below can flatten it.
const POSES: Record<Expression, FacePose> = {
  idle: {
    browLY: 0.0,
    browLRot: -0.2,
    browRY: 0.09,
    browRRot: 0.1,
    lidL: -0.62,
    lidR: -0.68,
    mouthScale: 1,
    mouthRoll: 0,
    cheek: 1,
    headRoll: 0.04,
  },
  curious: {
    browLY: 0.02,
    browLRot: -0.12,
    browRY: 0.2,
    browRRot: 0.02,
    lidL: -0.72,
    lidR: -0.82,
    mouthScale: 0.92,
    mouthRoll: 0.06,
    cheek: 1,
    headRoll: 0.12,
  },
  confident: {
    browLY: -0.02,
    browLRot: -0.34,
    browRY: 0.0,
    browRRot: 0.3,
    lidL: -0.36,
    lidR: -0.38,
    mouthScale: 1.14,
    mouthRoll: -0.05,
    cheek: 1.06,
    headRoll: -0.05,
  },
  excited: {
    browLY: 0.13,
    browLRot: 0.05,
    browRY: 0.15,
    browRRot: -0.05,
    lidL: -0.9,
    lidR: -0.9,
    mouthScale: 1.25,
    mouthRoll: -0.08,
    cheek: 1.12,
    headRoll: 0,
  },
  // Eyes squeezed shut, brows lifted inward: "I'm not looking" (the password field).
  shy: {
    browLY: 0.1,
    browLRot: 0.22,
    browRY: 0.1,
    browRRot: -0.22,
    lidL: 1.4,
    lidR: 1.4,
    mouthScale: 0.8,
    mouthRoll: 0.04,
    cheek: 1.1,
    headRoll: -0.08,
  },
};

const BLINK_MS = 140;
/** One full ambient spin. Slow enough to feel like a gentle turn, not a spin-cycle. */
const SPIN_MS = 3200;
const FADE_OUT_MS = 180;
const ENTRANCE_MS = 900;

const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface ActiveGesture {
  name: Gesture;
  startedAt: number;
  /** Set when a newer gesture took over; the old one fades out instead of snapping off. */
  fadingSince: number | null;
}

export class MascotAnimator {
  private pose: FacePose = { ...POSES.idle };
  private target: FacePose = { ...POSES.idle };
  private gestures: ActiveGesture[] = [];
  private offsets: GestureOffsets = { ...ZERO_OFFSETS };

  private lookX = 0;
  private lookY = 0;
  private lookTargetX = 0;
  private lookTargetY = 0;

  private lean = 0;
  private scrollPitch = 0;
  /** Horizontal travel speed of the mascot on the page (px/s): leans it into the curve. */
  private flowVx = 0;
  private flowLean = 0;

  private gazeX = 0;
  private gazeY = 0;
  private gazeTargetX = 0;
  private gazeTargetY = 0;
  private nextGazeAt = 0;

  private nextBlinkAt = 0;
  private blinkStartedAt = -1;
  private nextTwitchAt = 0;
  private twitchStartedAt = -1;

  /** A slow turn for calm pages: a gentle sway plus an occasional full spin. */
  private ambientSpin = false;
  private spinStartedAt = -1;
  private nextSpinAt = 0;

  private entranceStartedAt: number | null = null;
  private reduced = false;
  /** False while anything besides idle breathing is still moving; the loop uses it to slow down or sleep. */
  private settled = false;

  constructor(
    private readonly rig: HamsterRig,
    startAt: number,
  ) {
    this.nextBlinkAt = startAt + 1800;
    this.nextTwitchAt = startAt + 5000;
    this.nextGazeAt = startAt + 2200;
    this.nextSpinAt = startAt + 6000;
  }

  setExpression(expression: Expression): void {
    this.target = { ...POSES[expression] };
    this.settled = false;
  }

  trigger(name: Gesture, now: number): void {
    if (this.reduced) return;
    for (const g of this.gestures) g.fadingSince ??= now;
    this.gestures.push({ name, startedAt: now, fadingSince: null });
    this.settled = false;
  }

  /** Normalised direction (-1..1) the head should glance toward, or null to look ahead. */
  setLook(x: number | null, y: number | null): void {
    this.lookTargetX = x ?? 0;
    this.lookTargetY = y ?? 0;
    this.settled = false;
  }

  setAmbientSpin(on: boolean): void {
    this.ambientSpin = on;
    this.spinStartedAt = -1;
    if (!on) this.rig.group.rotation.y = 0;
    this.settled = false;
  }

  /** Horizontal speed of the mascot along its path (px/s, + = rightward). */
  setFlowVelocity(vx: number): void {
    this.flowVx = this.reduced ? 0 : vx;
    if (Math.abs(vx) > 1) this.settled = false;
  }

  startEntrance(now: number): void {
    this.entranceStartedAt = this.reduced ? null : now;
    this.settled = false;
  }

  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
    if (reduced) {
      this.gestures = [];
      this.entranceStartedAt = null;
      this.lean = this.flowLean = this.scrollPitch = 0;
    }
    this.settled = false;
  }

  get isSettled(): boolean {
    return this.settled;
  }

  /** Advance every channel by `dt` seconds and write the result to the rig. `now` is in ms. */
  update(now: number, dt: number, scrollVelocity: number): void {
    const reduced = this.reduced;
    const snap = reduced ? 1 : 0;

    // Face pose: ease toward the target (snap straight there in reduced motion).
    let settled = true;
    for (const key of Object.keys(this.pose) as (keyof FacePose)[]) {
      this.pose[key] = snap ? this.target[key] : damp(this.pose[key], this.target[key], 9, dt);
      if (Math.abs(this.pose[key] - this.target[key]) > 0.002) settled = false;
    }

    // Look.
    this.lookX = snap ? this.lookTargetX : damp(this.lookX, this.lookTargetX, 6, dt);
    this.lookY = snap ? this.lookTargetY : damp(this.lookY, this.lookTargetY, 6, dt);
    if (
      Math.abs(this.lookX - this.lookTargetX) > 0.002 ||
      Math.abs(this.lookY - this.lookTargetY) > 0.002
    ) {
      settled = false;
    }

    // Scroll: lean back a touch on a fast scroll down and look into the scroll direction.
    const v = reduced ? 0 : clamp(scrollVelocity / 2500, -1, 1);
    this.lean = damp(this.lean, v, 5, dt);
    this.scrollPitch = damp(this.scrollPitch, v * 0.18, 4, dt);
    this.flowLean = damp(this.flowLean, reduced ? 0 : clamp(this.flowVx / 700, -1, 1), 6, dt);
    if (Math.abs(this.lean) > 0.003 || Math.abs(this.flowLean) > 0.003) settled = false;

    // Gestures.
    const sum: GestureOffsets = { ...ZERO_OFFSETS };
    this.gestures = this.gestures.filter((g) => {
      const duration = GESTURE_DURATION_MS[g.name];
      const progress = (now - g.startedAt) / duration;
      if (progress >= 1) return false;
      let weight = 1;
      if (g.fadingSince !== null) {
        weight = 1 - (now - g.fadingSince) / FADE_OUT_MS;
        if (weight <= 0) return false;
      }
      accumulate(sum, gestureOffsets(g.name, progress), weight);
      return true;
    });
    this.offsets = sum;
    if (this.gestures.length > 0) settled = false;

    // Idle: breathing, sway, blinks, ear twitches. None of it runs in reduced motion.
    let breathe = 0;
    let sway = 0;
    let blink = 0;
    let twitch = 0;
    if (!reduced) {
      const t = now / 1000;
      breathe = Math.sin(t * 1.9) * 0.012;
      sway = Math.sin(t * 0.8) * 0.03;
      if (now >= this.nextBlinkAt && this.blinkStartedAt < 0) this.blinkStartedAt = now;
      if (this.blinkStartedAt >= 0) {
        const p = (now - this.blinkStartedAt) / BLINK_MS;
        if (p >= 1) {
          this.blinkStartedAt = -1;
          this.nextBlinkAt = now + 2600 + Math.random() * 3200;
        } else {
          blink = Math.sin(p * Math.PI);
        }
      }
      // Curious eyes: every few seconds the pupils dart to a new spot, then settle back.
      if (now >= this.nextGazeAt) {
        const dart = Math.random() < 0.35;
        this.gazeTargetX = dart ? (Math.random() - 0.5) * 2 : 0;
        this.gazeTargetY = dart ? (Math.random() - 0.5) * 1.2 : 0;
        this.nextGazeAt = now + (dart ? 700 + Math.random() * 900 : 1800 + Math.random() * 2800);
      }
      if (now >= this.nextTwitchAt && this.twitchStartedAt < 0) this.twitchStartedAt = now;
      if (this.twitchStartedAt >= 0) {
        const p = (now - this.twitchStartedAt) / 420;
        if (p >= 1) {
          this.twitchStartedAt = -1;
          this.nextTwitchAt = now + 6000 + Math.random() * 6000;
        } else {
          twitch = Math.sin(p * Math.PI * 3) * (1 - p) * 0.3;
        }
      }
    }

    // Gaze follows the look target when there is one, otherwise the idle darts.
    const gx =
      this.lookTargetX !== 0 || this.lookTargetY !== 0 ? this.lookTargetX : this.gazeTargetX;
    const gy =
      this.lookTargetX !== 0 || this.lookTargetY !== 0 ? this.lookTargetY : this.gazeTargetY;
    this.gazeX = snap ? gx : damp(this.gazeX, gx, 14, dt);
    this.gazeY = snap ? gy : damp(this.gazeY, gy, 14, dt);

    // Entrance: pop up from nothing with a little overshoot.
    let entrance = 1;
    if (this.entranceStartedAt !== null) {
      const p = (now - this.entranceStartedAt) / ENTRANCE_MS;
      if (p >= 1) {
        this.entranceStartedAt = null;
      } else {
        const c = clamp(p, 0, 1);
        // easeOutBack
        const k = 1.9;
        entrance = 1 + (k + 1) * Math.pow(c - 1, 3) + k * Math.pow(c - 1, 2);
        settled = false;
      }
    }

    // Ambient turn: a few degrees of sway all the time, and every so often one slow full spin.
    if (this.ambientSpin && !reduced) {
      const t = now / 1000;
      let spin = 0;
      if (this.spinStartedAt < 0 && now >= this.nextSpinAt) this.spinStartedAt = now;
      if (this.spinStartedAt >= 0) {
        const p = (now - this.spinStartedAt) / SPIN_MS;
        if (p >= 1) {
          this.spinStartedAt = -1;
          this.nextSpinAt = now + 11_000 + Math.random() * 6_000;
        } else {
          spin = Math.PI * 2 * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2); // easeInOutQuad
          settled = false;
        }
      }
      this.rig.group.rotation.y = Math.sin(t * 0.5) * 0.35 + spin;
    } else if (this.rig.group.rotation.y !== 0) {
      this.rig.group.rotation.y = 0;
    }

    this.settled = settled;

    this.apply(sum, { breathe, sway, blink, twitch, entrance });
  }

  private apply(
    g: GestureOffsets,
    idle: { breathe: number; sway: number; blink: number; twitch: number; entrance: number },
  ): void {
    const { rig, pose } = this;

    rig.group.scale.setScalar(Math.max(0.001, idle.entrance));
    rig.bodyPivot.position.y = -1.5 + g.bodyLift;
    rig.bodyPivot.scale.set(
      1 + g.bodyScale * 0.6 + idle.breathe,
      1 - g.bodyScale + idle.breathe * 2,
      1,
    );
    rig.bodyPivot.rotation.x = g.bodyPitch + this.scrollPitch * 0.6;
    rig.bodyPivot.rotation.z = -this.lean * 0.12 - this.flowLean * 0.2;
    rig.bodyPivot.rotation.y = this.lookX * 0.12 + idle.sway * 0.5;

    rig.head.rotation.x = g.headPitch + this.scrollPitch + this.lookY * 0.28;
    rig.head.rotation.y = g.headYaw + this.lookX * 0.5 + idle.sway;
    rig.head.rotation.z = pose.headRoll + g.headRoll + this.lean * 0.05 - this.flowLean * 0.08;

    rig.hat.position.y = REST.hatY + g.hatLift;
    rig.hat.rotation.z = REST.hatRoll + g.hatRoll;

    rig.earL.rotation.z = REST.earTilt + g.earWiggle + idle.twitch;
    rig.earR.rotation.z = -REST.earTilt - g.earWiggle - idle.twitch * 0.4;

    rig.browL.position.y = REST.browY + pose.browLY;
    rig.browL.rotation.z = pose.browLRot;
    rig.browR.position.y = REST.browY + pose.browRY;
    rig.browR.rotation.z = pose.browRRot;

    rig.lidL.rotation.x = clamp(pose.lidL + idle.blink * 2.1, -0.95, 1.5);
    rig.lidR.rotation.x = clamp(pose.lidR + idle.blink * 2.1, -0.95, 1.5);

    rig.eyeL.position.set(this.gazeX * 0.07, -this.gazeY * 0.05, 0);
    rig.eyeR.position.set(this.gazeX * 0.07, -this.gazeY * 0.05, 0);

    rig.whiskersL.rotation.z = idle.twitch * 0.35 + idle.sway * 0.4;
    rig.whiskersR.rotation.z = -idle.twitch * 0.35 - idle.sway * 0.4;

    // Waving paw: lifts from holding the QR to beside the head, swinging side to side.
    const w = g.pawWave;
    rig.pawR.position.set(REST.pawRX + w * 0.82, REST.pawRY + w * 1.62, REST.pawRZ + w * 0.2);
    rig.pawR.scale.set(1.1 + w * 0.35, 0.9 + w * 0.3, 0.9 + w * 0.3);
    rig.pawR.rotation.z = g.pawSwing;
    rig.qr.rotation.z = -0.08 - w * 0.12;

    rig.mouth.scale.set(pose.mouthScale, 1 + (pose.mouthScale - 1) * 0.4, 1);
    rig.mouth.rotation.z = pose.mouthRoll;
    rig.cheekL.scale.set(pose.cheek, 0.92 * pose.cheek, 0.95 * pose.cheek);
    rig.cheekR.scale.set(pose.cheek, 0.92 * pose.cheek, 0.95 * pose.cheek);
  }
}
