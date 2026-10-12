import { TIMING } from './config';
import type { MascotBrain } from './brain';
import type { MascotConfig } from './types';

export interface InteractionController {
  dispose(): void;
}

interface InteractionOptions {
  config: MascotConfig;
  brain: MascotBrain;
  /** Called with the hovered/focused element's box (null when it ends) so the mascot can glance at it. */
  onLook?: (rect: DOMRect | null) => void;
  /** The visitor reached a form step (focused or hovered an element in `config.flow.steps`). */
  onStep?: (progress: number) => void;
}

/** Turns pointer, touch and keyboard focus on page elements into brain triggers. Delegated: five
 * listeners on the document no matter how many targets exist. Never calls preventDefault and never
 * renders anything, so it cannot get between a visitor and the page's own links and buttons. */
export const createInteractionController = ({
  config,
  brain,
  onLook,
  onStep,
}: InteractionOptions): InteractionController => {
  let hoverId: string | null = null;
  let intentTimer: ReturnType<typeof setTimeout> | null = null;
  let leaveTimer: ReturnType<typeof setTimeout> | null = null;
  let touchTimer: ReturnType<typeof setTimeout> | null = null;

  const clear = (timer: ReturnType<typeof setTimeout> | null) => {
    if (timer) clearTimeout(timer);
    return null;
  };

  /** First target whose selector matches the event target or one of its ancestors. */
  const match = (node: EventTarget | null): { id: string; el: Element } | null => {
    if (!(node instanceof Element)) return null;
    for (const target of config.targets) {
      const el = node.closest(target.selector);
      if (el) return { id: target.targetId, el };
    }
    return null;
  };

  /** Progress of the first flow step whose selector matches the node or an ancestor. */
  const stepFor = (node: EventTarget | null): number | null => {
    if (!(node instanceof Element)) return null;
    for (const step of config.flow?.steps ?? []) {
      if (node.closest(step.selector)) return step.progress;
    }
    return null;
  };

  const startHover = (id: string, el: Element, delay: number) => {
    intentTimer = clear(intentTimer);
    intentTimer = setTimeout(() => {
      intentTimer = null;
      leaveTimer = clear(leaveTimer);
      if (brain.hoverTarget(id)) {
        hoverId = id;
        onLook?.(el.getBoundingClientRect());
      }
    }, delay);
  };

  const endHover = (delay: number) => {
    intentTimer = clear(intentTimer);
    if (hoverId === null) return;
    leaveTimer = clear(leaveTimer);
    leaveTimer = setTimeout(() => {
      leaveTimer = null;
      if (hoverId !== null) brain.releaseHover(hoverId);
      hoverId = null;
      onLook?.(null);
    }, delay);
  };

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const step = stepFor(event.target);
    if (step !== null) onStep?.(step);
    const hit = match(event.target);
    if (!hit) return;
    if (hit.id === hoverId) {
      // Moved between children of the same target: stay put, cancel any pending leave.
      leaveTimer = clear(leaveTimer);
      return;
    }
    startHover(hit.id, hit.el, TIMING.hoverIntentMs);
  };

  const onPointerOut = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const from = match(event.target);
    if (!from) return;
    const to = match(event.relatedTarget);
    if (to && to.el === from.el) return; // still inside the same target
    endHover(TIMING.unhoverGraceMs);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    const hit = match(event.target);
    if (!hit) return;
    touchTimer = clear(touchTimer);
    intentTimer = clear(intentTimer);
    leaveTimer = clear(leaveTimer);
    if (brain.hoverTarget(hit.id)) {
      hoverId = hit.id;
      onLook?.(hit.el.getBoundingClientRect());
      touchTimer = setTimeout(() => {
        touchTimer = null;
        brain.releaseHover(hit.id);
        if (hoverId === hit.id) hoverId = null;
        onLook?.(null);
      }, TIMING.touchHoldMs);
    }
  };

  const isKeyboardFocus = (el: Element): boolean => {
    try {
      return el.matches(':focus-visible');
    } catch {
      return true; // very old engines: treat any focus as keyboard focus
    }
  };

  let focusId: string | null = null;

  const onFocusIn = (event: FocusEvent) => {
    const step = stepFor(event.target);
    if (step !== null) onStep?.(step);
    const hit = match(event.target);
    if (!hit || !(event.target instanceof Element) || !isKeyboardFocus(event.target)) return;
    if (brain.focusTarget(hit.id)) {
      focusId = hit.id;
      onLook?.(hit.el.getBoundingClientRect());
    }
  };

  const onFocusOut = (event: FocusEvent) => {
    if (focusId === null || !match(event.target)) return;
    brain.releaseFocus(focusId);
    focusId = null;
    if (hoverId === null) onLook?.(null);
  };

  document.addEventListener('pointerover', onPointerOver, { passive: true });
  document.addEventListener('pointerout', onPointerOut, { passive: true });
  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);

  return {
    dispose: () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      intentTimer = clear(intentTimer);
      leaveTimer = clear(leaveTimer);
      touchTimer = clear(touchTimer);
      onLook?.(null);
    },
  };
};
