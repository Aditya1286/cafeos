import type { EngineOptions, MascotEngine } from '../renderer';
import hamsterSvg from './assets/hamster.svg?raw';
import './lite.css';

// The light renderer: the same hamster drawn as one inline SVG, posed and animated by CSS
// (lite.css). It implements the same MascotEngine as the 3D engine, so the brain, config, flow and
// bubble are shared and only the drawing differs. It never imports from ../engine (that would pull
// three.js into this chunk); tests/mascotEngineLogic.test.ts enforces that.
//
// There is no animation loop here: every call only flips an attribute or a CSS variable on the
// <svg>, and the browser animates the rest (and pauses it while the mascot is off screen).

const HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;
/** Flow speed (px/s) at which the lean is full, and the full lean. */
const LEAN_FULL_SPEED = 1_200;
const LEAN_MAX_DEG = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const createLiteEngine = ({ container, reducedMotion }: EngineOptions): MascotEngine => {
  const holder = document.createElement('div');
  holder.style.cssText = 'width:100%;height:100%;';
  holder.innerHTML = hamsterSvg;
  const svg = holder.querySelector('svg');
  if (!svg) throw new Error('light mascot: SVG missing');
  container.appendChild(holder);

  let reduced = reducedMotion;
  let lastGestureNonce = 0;
  let disposed = false;
  let offscreen = false;

  const flag = (name: string, on: boolean) => {
    if (on) svg.setAttribute(name, '');
    else svg.removeAttribute(name);
  };
  const setVar = (name: string, value: string) => svg.style.setProperty(name, value);

  flag('data-reduced', reduced);
  svg.setAttribute('data-expression', 'idle');

  // A gesture or the entrance clears itself when its animation ends, so the next one can replay.
  // They animate different elements (.caosl-fig vs .caosl-enter, see lite.css), so a gesture
  // during the entrance never cancels it.
  const onAnimationEnd = (event: AnimationEvent) => {
    if (event.animationName.startsWith('caosl-g-')) svg.removeAttribute('data-g');
    else if (event.animationName === 'caosl-in') flag('data-in', false);
  };
  svg.addEventListener('animationend', onAnimationEnd);

  // Paused while scrolled off screen or while the tab is hidden.
  const syncPaused = () => flag('data-paused', offscreen || document.hidden);
  const onVisibility = () => syncPaused();
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setExpression: (expression) => svg.setAttribute('data-expression', expression),
    triggerGesture: (gesture) => {
      if (gesture.nonce === lastGestureNonce || disposed) return;
      lastGestureNonce = gesture.nonce;
      if (reduced) return;
      // Restart even when the same gesture is still playing: drop it, force a style flush, re-add.
      svg.removeAttribute('data-g');
      void svg.getBoundingClientRect();
      svg.setAttribute('data-g', gesture.name);
    },
    setLook: (x, y) => {
      setVar('--lx', String(x ?? 0));
      setVar('--ly', String(y ?? 0));
    },
    setFlowVelocity: (vx) => {
      const lean = reduced ? 0 : clamp(vx / LEAN_FULL_SPEED, -1, 1) * LEAN_MAX_DEG;
      setVar('--lean', `${lean.toFixed(1)}deg`);
    },
    setReducedMotion: (value) => {
      reduced = value;
      flag('data-reduced', value);
      if (value) {
        svg.removeAttribute('data-g');
        flag('data-in', false);
        setVar('--lean', '0deg');
      }
    },
    // The SVG fills the host box and scales itself; nothing to recompute.
    resize: () => {},
    setVisible: (visible) => {
      offscreen = !visible;
      syncPaused();
    },
    setAmbientSpin: (on) => flag('data-ambient', on),
    startEntrance: () => {
      flag('data-pending', false);
      if (!reduced) flag('data-in', true);
    },
    setBandColor: (hex) => {
      if (HEX.test(hex)) setVar('--caosl-band', hex);
    },
    dispose: () => {
      disposed = true;
      svg.removeEventListener('animationend', onAnimationEnd);
      document.removeEventListener('visibilitychange', onVisibility);
      holder.remove();
    },
  };
};
