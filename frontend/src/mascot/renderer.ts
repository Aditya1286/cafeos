import type { Expression, GestureEvent } from './types';
import type { ScrollSnapshot } from './sections';

// The contract both renderers implement: the 3D engine (`engine/createEngine.ts`, three.js) and the
// light renderer (`lite/createLiteEngine.ts`, an SVG with CSS motion). It lives outside both folders
// so the light renderer never has to import anything from `engine/` (which would pull three.js).

export interface MascotEngine {
  /** Push the brain's latest expression/gesture. Cheap; call on every state change. */
  setExpression(expression: Expression): void;
  triggerGesture(gesture: GestureEvent): void;
  /** Direction to glance (-1..1 each axis), or null to look straight ahead. */
  setLook(x: number | null, y: number | null): void;
  /** Horizontal speed along the path (px/s), so the mascot leans into the curve. */
  setFlowVelocity(vx: number): void;
  setReducedMotion(reduced: boolean): void;
  /** Box size in CSS px (the drawing is square). */
  resize(sizePx: number): void;
  /** Pause drawing while the mascot is scrolled out of view (saves a phone's battery). */
  setVisible(visible: boolean): void;
  /** Slow ambient sway and occasional full turn (calm pages). Ignored in reduced motion. */
  setAmbientSpin(on: boolean): void;
  /** Pop in from nothing. Call once, when the mascot should appear. */
  startEntrance(): void;
  /** Colour of the hat band (a café theme's `mascotBand`), as a CSS hex colour like `#7a8b3c`. */
  setBandColor(hex: string): void;
  dispose(): void;
}

export interface EngineOptions {
  container: HTMLElement;
  scroll: ScrollSnapshot;
  reducedMotion: boolean;
  /** WebGL context lost / restored: the shell swaps to the light renderer when it is lost. The
   * light renderer never calls it. */
  onContextChange: (lost: boolean) => void;
}
