import { DEFAULT_COOLDOWN_MS, DEFAULT_PRIORITY, TIMING } from './config';
import type {
  Expression,
  GestureEvent,
  MascotConfig,
  MascotMessage,
  MascotReaction,
  MascotState,
  TriggerKind,
} from './types';

/** Gestures for the same trigger inside this window are dropped (rapid re-hover shouldn't re-nod). */
const GESTURE_REPEAT_MS = 1_200;

interface Layer {
  kind: TriggerKind;
  /** sectionId or targetId. */
  id: string;
  reaction: MascotReaction;
  priority: number;
  /** Not yet shown because a higher-priority layer owned the mascot when it activated. */
  fresh: boolean;
  /** Set while this layer's message is on screen; lets it be restored after an interruption. */
  messageUntil: number | null;
}

const KIND_RANK: Record<TriggerKind, number> = {
  section: 0,
  signal: 1,
  peek: 2,
  hover: 3,
  focus: 4,
};

const IDLE_STATE = (): MascotState => ({
  sectionId: null,
  expression: 'idle',
  gesture: null,
  message: null,
  priority: 0,
  source: 'idle',
});

/** Decides what the mascot is doing. Pure state machine: no DOM, no Three.js, no React. Triggers
 * (scroll, hover, focus) say what happened; the brain keeps one layer per trigger kind, lets the
 * highest-priority layer own the expression/message, and restores the layer underneath when a
 * higher one ends. The only side effects are timers (message expiry) and listener callbacks. */
export class MascotBrain {
  private layers: Partial<Record<TriggerKind, Layer>> = {};
  private lastShown = new Map<string, number>();
  private lastActivated = new Map<string, number>();
  private listeners = new Set<(state: MascotState) => void>();
  private messageTimer: ReturnType<typeof setTimeout> | null = null;
  private gestureNonce = 0;
  private gesture: GestureEvent | null = null;
  private message: MascotMessage | null = null;
  private state: MascotState;
  private disposed = false;
  /** Signals the page supplies at runtime (built from its own data), next to the config's. */
  private reactions: Record<string, MascotReaction> = {};

  constructor(private readonly config: MascotConfig) {
    this.state = IDLE_STATE();
  }

  getState(): MascotState {
    return this.state;
  }

  subscribe(listener: (state: MascotState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** The viewport's active section changed. Returns false for an id with no configuration. */
  enterSection(sectionId: string): boolean {
    const section = this.config.sections.find((s) => s.sectionId === sectionId);
    if (!section || this.disposed) return false;
    if (this.layers.section?.id === sectionId) return true;

    const previous = this.layers.section
      ? this.config.sections.find((s) => s.sectionId === this.layers.section?.id)
      : undefined;

    delete this.layers.section;
    this.activate('section', sectionId, section.enter ?? {});

    // A section with no gesture of its own still gets a farewell from the one it left.
    if (previous?.leave?.gesture && !section.enter?.gesture)
      this.fireGesture(previous.leave.gesture);
    return true;
  }

  /** The viewport is between sections (or the page is unmounting its sections). */
  clearSection(): void {
    if (!this.layers.section) return;
    delete this.layers.section;
    this.settle();
  }

  /** Replace the page's runtime reactions (e.g. a menu's welcome and category tips, built from the
   * café's data). They act as extra signals: `setSignal(key)` looks a key up in the config's
   * signals first, then here. Keys that are gone stop working, and an active signal whose key is
   * gone is dropped; one whose key stays is left as it is (no repeat). */
  setReactions(map: Record<string, MascotReaction>): void {
    if (this.disposed) return;
    this.reactions = { ...map };
    const active = this.layers.signal;
    if (active && !this.signalReaction(active.id)) {
      delete this.layers.signal;
      this.settle();
    }
  }

  /** The page's own state changed (e.g. the order is ready). Null clears it. Returns false for a key
   * neither the config's signals nor the page's reactions know. Setting the signal it already has
   * does nothing. */
  setSignal(key: string | null): boolean {
    if (this.disposed) return false;
    if (key === null) {
      if (this.layers.signal) {
        delete this.layers.signal;
        this.settle();
      }
      return true;
    }
    const reaction = this.signalReaction(key);
    if (!reaction) return false;
    if (this.layers.signal?.id === key) return true;
    delete this.layers.signal;
    this.activate('signal', key, reaction);
    return true;
  }

  /** The mascot has popped up from behind a card. Returns false for an unknown peek id. */
  peek(peekId: string): boolean {
    const peek = this.config.peeks.find((p) => p.peekId === peekId);
    if (!peek || this.disposed) return false;
    if (this.layers.peek?.id === peekId) return true;
    delete this.layers.peek;
    this.activate('peek', peekId, peek.greet);
    return true;
  }

  /** The mascot has gone back behind its card. */
  unpeek(peekId?: string): void {
    const layer = this.layers.peek;
    if (!layer || (peekId !== undefined && layer.id !== peekId)) return;
    delete this.layers.peek;
    this.settle();
  }

  hoverTarget(targetId: string): boolean {
    return this.activateTarget('hover', targetId);
  }

  releaseHover(targetId?: string): void {
    this.releaseTarget('hover', targetId);
  }

  focusTarget(targetId: string): boolean {
    return this.activateTarget('focus', targetId);
  }

  releaseFocus(targetId?: string): void {
    this.releaseTarget('focus', targetId);
  }

  /** Hide the bubble now; the expression is untouched. */
  dismissMessage(): void {
    this.hideMessage();
    this.emit();
  }

  dispose(): void {
    this.disposed = true;
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = null;
    this.listeners.clear();
    this.layers = {};
  }

  // ─── internals ───────────────────────────────────────────────────────────────────────────────

  /** A signal key's reaction: the config's own signals first, then the page's runtime reactions. */
  private signalReaction(key: string): MascotReaction | undefined {
    const own = (map: Record<string, MascotReaction> | undefined) =>
      map && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
    return own(this.config.signals) ?? own(this.reactions);
  }

  private activateTarget(kind: 'hover' | 'focus', targetId: string): boolean {
    const target = this.config.targets.find((t) => t.targetId === targetId);
    const reaction = target?.[kind];
    if (!reaction || this.disposed) return false;
    if (this.layers[kind]?.id === targetId) return true;
    delete this.layers[kind];
    this.activate(kind, targetId, reaction);
    return true;
  }

  private releaseTarget(kind: 'hover' | 'focus', targetId?: string): void {
    const layer = this.layers[kind];
    if (!layer || (targetId !== undefined && layer.id !== targetId)) return;
    delete this.layers[kind];
    this.settle();
  }

  private activate(kind: TriggerKind, id: string, reaction: MascotReaction): void {
    const layer: Layer = {
      kind,
      id,
      reaction,
      priority: reaction.priority ?? DEFAULT_PRIORITY[kind],
      fresh: true,
      messageUntil: null,
    };
    this.layers[kind] = layer;
    this.settle();
  }

  private winner(): Layer | null {
    let best: Layer | null = null;
    for (const layer of Object.values(this.layers)) {
      if (!layer) continue;
      if (
        !best ||
        layer.priority > best.priority ||
        (layer.priority === best.priority && KIND_RANK[layer.kind] > KIND_RANK[best.kind])
      ) {
        best = layer;
      }
    }
    return best;
  }

  /** Recompute who owns the mascot and apply that layer's gesture/message if it is newly on top. */
  private settle(): void {
    const owner = this.winner();
    const previousMessageId = this.message?.id ?? null;

    if (!owner) {
      this.hideMessage();
      this.emit();
      return;
    }

    if (owner.fresh) {
      owner.fresh = false;
      const key = `${owner.kind}:${owner.id}`;
      const now = Date.now();
      const lastGesture = this.lastActivated.get(key);
      this.lastActivated.set(key, now);
      if (
        owner.reaction.gesture &&
        (lastGesture === undefined || now - lastGesture > GESTURE_REPEAT_MS)
      ) {
        this.fireGesture(owner.reaction.gesture);
      }
      this.showMessage(owner, owner.reaction.message);
    } else if (owner.messageUntil !== null && owner.reaction.message) {
      // Back on top after an interruption: bring the message back if it still has time left.
      const remaining = owner.messageUntil - Date.now();
      if (remaining > 0) this.presentMessage(owner.reaction.message, remaining);
      else this.hideMessage();
    } else if (previousMessageId !== null) {
      this.hideMessage();
    }
    this.emit();
  }

  private showMessage(owner: Layer, message: MascotMessage | undefined): void {
    this.hideMessage();
    if (!message) return;
    const now = Date.now();
    const cooldown = owner.reaction.cooldownMs ?? DEFAULT_COOLDOWN_MS[owner.kind];
    const last = this.lastShown.get(message.id);
    if (last !== undefined && now - last < cooldown) return;
    this.lastShown.set(message.id, now);
    const duration = message.durationMs ?? TIMING.messageMs;
    owner.messageUntil = now + duration;
    this.presentMessage(message, duration);
  }

  private presentMessage(message: MascotMessage, durationMs: number): void {
    this.message = message;
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = null;
    // An unbounded message (the order page's status line) stays until something replaces it.
    if (!Number.isFinite(durationMs)) return;
    this.messageTimer = setTimeout(() => {
      this.messageTimer = null;
      this.message = null;
      this.emit();
    }, durationMs);
  }

  private hideMessage(): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = null;
    this.message = null;
  }

  private fireGesture(name: GestureEvent['name']): void {
    this.gestureNonce += 1;
    this.gesture = { name, nonce: this.gestureNonce };
  }

  private emit(): void {
    if (this.disposed) return;
    const owner = this.winner();
    const expression: Expression = owner?.reaction.expression ?? 'idle';
    const next: MascotState = {
      sectionId: this.layers.section?.id ?? null,
      expression,
      gesture: this.gesture,
      message: this.message,
      priority: owner?.priority ?? 0,
      source: owner?.kind ?? 'idle',
    };
    const prev = this.state;
    if (
      prev.sectionId === next.sectionId &&
      prev.expression === next.expression &&
      prev.gesture === next.gesture &&
      prev.message === next.message &&
      prev.priority === next.priority &&
      prev.source === next.source
    ) {
      return;
    }
    this.state = next;
    for (const listener of [...this.listeners]) listener(next);
  }
}
