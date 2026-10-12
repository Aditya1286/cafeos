import * as THREE from 'three';
import type { Expression, GestureEvent } from '../types';
import type { ScrollSnapshot } from '../sections';
import { MascotAnimator } from './animator';
import { buildHamster } from './model';

export interface MascotEngine {
  /** Push the brain's latest expression/gesture. Cheap; call on every state change. */
  setExpression(expression: Expression): void;
  triggerGesture(gesture: GestureEvent): void;
  /** Direction to glance (-1..1 each axis), or null to look straight ahead. */
  setLook(x: number | null, y: number | null): void;
  /** Horizontal speed along the path (px/s), so the mascot leans into the curve. */
  setFlowVelocity(vx: number): void;
  setReducedMotion(reduced: boolean): void;
  /** Box size in CSS px (the canvas is square). */
  resize(sizePx: number): void;
  /** Pop in from nothing. Call once, when the mascot should appear. */
  startEntrance(): void;
  dispose(): void;
}

interface EngineOptions {
  container: HTMLElement;
  scroll: ScrollSnapshot;
  reducedMotion: boolean;
  /** WebGL context lost / restored: the shell swaps to its fallback while lost. */
  onContextChange: (lost: boolean) => void;
}

const CAMERA = { fov: 26, distance: 10.5, lookY: 0.15 } as const;
/** Cap on the pixel ratio: the mascot is small, so 2x is plenty and 3x is wasted fill. */
const MAX_PIXEL_RATIO = 2;
const CALM_FRAME_MS = 33;
/** A scroll velocity older than this is treated as stopped. */
const STALE_SCROLL_MS = 120;

/** Throws if WebGL is unavailable (the caller falls back to the static logo). One renderer, one
 * scene, one rAF loop; the loop sleeps in reduced-motion once the pose has settled and stops
 * while the tab is hidden. */
export const createMascotEngine = ({
  container,
  scroll,
  reducedMotion,
  onContextChange,
}: EngineOptions): MascotEngine => {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 50);
  camera.position.set(0, CAMERA.lookY + 0.2, CAMERA.distance);
  camera.lookAt(0, CAMERA.lookY, 0);

  const ambient = new THREE.AmbientLight(0xfff1e0, 1.5);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 5, 7);
  const rim = new THREE.DirectionalLight(0xffc9a8, 0.9);
  rim.position.set(4, 1, -3);
  scene.add(ambient, key, rim);

  const rig = buildHamster();
  scene.add(rig.group);

  const animator = new MascotAnimator(rig, performance.now());
  animator.setReducedMotion(reducedMotion);

  let reduced = reducedMotion;
  let raf = 0;
  let last = 0;
  let lastGestureNonce = 0;
  let disposed = false;
  let contextLost = false;

  const frame = (t: number) => {
    raf = 0;
    if (disposed || contextLost || document.hidden) return;

    const sinceLast = t - last;
    // Only idle breathing is moving: half-rate is indistinguishable and halves the cost.
    if (animator.isSettled && !reduced && sinceLast < CALM_FRAME_MS) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, Math.max(0.001, sinceLast / 1000));
    last = t;

    const fresh = t - scroll.updatedAt < STALE_SCROLL_MS;
    animator.update(t, dt, fresh ? scroll.velocity : 0);
    renderer.render(scene, camera);

    // In reduced motion the loop sleeps once the pose stops changing; any new input wakes it.
    if (reduced && animator.isSettled) return;
    raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (!raf && !disposed && !contextLost && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const onVisibility = () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else {
      wake();
    }
  };
  const onLost = (event: Event) => {
    event.preventDefault(); // allow the browser to restore the context
    contextLost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    onContextChange(true);
  };
  const onRestored = () => {
    contextLost = false;
    onContextChange(false);
    wake();
  };

  document.addEventListener('visibilitychange', onVisibility);
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  return {
    setExpression: (expression) => {
      animator.setExpression(expression);
      wake();
    },
    triggerGesture: (gesture) => {
      if (gesture.nonce === lastGestureNonce) return;
      lastGestureNonce = gesture.nonce;
      animator.trigger(gesture.name, performance.now());
      wake();
    },
    setLook: (x, y) => {
      animator.setLook(x, y);
      wake();
    },
    setFlowVelocity: (vx) => {
      animator.setFlowVelocity(vx);
      if (Math.abs(vx) > 1) wake();
    },
    setReducedMotion: (value) => {
      reduced = value;
      animator.setReducedMotion(value);
      wake();
    },
    resize: (sizePx) => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      renderer.setSize(sizePx, sizePx, false);
      wake();
    },
    startEntrance: () => {
      animator.startEntrance(performance.now());
      wake();
    },
    dispose: () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      scene.remove(rig.group);
      rig.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
};
