// Shared vocabulary for the landing-page mascot. The brain (what the mascot is doing), the engine
// (how it is drawn) and the config (what it reacts to) only talk to each other through these types.

export type Expression = 'idle' | 'curious' | 'confident' | 'excited' | 'shy';

/** Pages the mascot lives on. Each has its own config (copy, reactions, flow area). */
export type PageId = 'landing' | 'login' | 'order' | 'demo';

export type Gesture = 'pop' | 'nod' | 'tilt' | 'lean' | 'tipHat' | 'wiggle' | 'wave';

export interface MascotMessage {
  /** Stable id; repeat suppression and tests key on it. */
  id: string;
  text: string;
  /** How long the bubble stays up. The expression outlives it. Defaults to DEFAULTS.messageMs. */
  durationMs?: number;
  /** Also announce to screen readers. Off by default: the page already carries the same content. */
  announce?: boolean;
}

export interface MascotReaction {
  expression?: Expression;
  gesture?: Gesture;
  message?: MascotMessage;
  /** Higher wins. Defaults per trigger kind (section < hover < focus), see DEFAULT_PRIORITY. */
  priority?: number;
  /** Minimum gap before the same message may show again. Defaults per trigger kind. */
  cooldownMs?: number;
}

export interface SectionConfig {
  sectionId: string;
  /** CSS selector of the section's root element. */
  selector: string;
  enter?: MascotReaction;
  /** Fires on leaving for another section, before that section's own `enter`. Gesture only. */
  leave?: Pick<MascotReaction, 'gesture'>;
}

export interface TargetConfig {
  targetId: string;
  /** CSS selector matched against the pointer/focus target (via `closest`). */
  selector: string;
  hover?: MascotReaction;
  focus?: MascotReaction;
}

/** A card the mascot can pop up from behind to say hi. The card must paint above the mascot layer
 * (see `.caos-mascot` z-index) and be opaque, so the lower part of the mascot is hidden by it. */
export interface PeekConfig {
  peekId: string;
  /** CSS selector of the card element. */
  selector: string;
  /** Horizontal position of the mascot along the card's top edge: 0 = left edge, 1 = right edge. */
  anchor: number;
  /** Only pop up on viewports at most this wide (px). Use for phone-only spots. */
  maxViewportWidth?: number;
  /** Only pop up on viewports at least this wide (px). */
  minViewportWidth?: number;
  /** What the mascot does once it has popped up. */
  greet: MascotReaction;
}

/** Moving the mascot's path along as the visitor works through a form (pages that don't scroll). */
export interface FlowStep {
  /** CSS selector of the element that, when focused or hovered, moves the path to `progress`. */
  selector: string;
  /** Path progress 0..1 (0 = start of the curve, 1 = end). */
  progress: number;
}

/** How the mascot moves on a page. Defaults suit a long scrolling page (the landing page). */
export interface PageFlow {
  /** CSS selector of the area the mascot may glide in. Default: the whole viewport. If the element
   * is missing or hidden (e.g. a desktop-only panel on a phone) the mascot is parked: it only
   * appears when peeking from a card. */
  bounds?: string;
  /** Keep this much clear (px) at the top / bottom of the area (headers, text blocks). */
  insets?: { top?: number; bottom?: number };
  /** Scale on the responsive mascot size (1 = default). */
  sizeScale?: number;
  /** Fraction of the mascot that clears a card's top edge when it pops up (default: 0.7, or 0.45
   * on phone-sized mascots). Lower = just the hat and eyes over the edge. */
  peekVisible?: number;
  /** `scroll` (default): the path follows page scroll. `steps`: it follows `steps` below. */
  progress?: 'scroll' | 'steps';
  steps?: FlowStep[];
  /** How the mascot is placed (default: glide along the path):
   *  - `static`: no gliding or peeking; it rests in one corner of the area.
   *  - `dock`: rests small in one corner of the area, but still pops up from cards. Made for phones,
   *    where a path across the screen would sit on top of the text.
   *  - `slot`: lives in a reserved spot in the page itself (`slot`), scrolls with the page, covers
   *    nothing, and its message sits beside it (the order page, made for phones). */
  mode?: 'static' | 'dock' | 'slot';
  /** CSS selector of the reserved spot, for `mode: 'slot'`. */
  slot?: string;
  /** Fixed mascot size in px, instead of the responsive one. */
  size?: number;
  /** Which bottom corner a static or docked mascot rests in (default right). */
  corner?: 'left' | 'right';
  /** A slow, gentle turn: a sway of a few degrees plus an occasional full spin. Off in reduced motion. */
  ambientSpin?: boolean;
  /** Stay peeking this long, then sink and rejoin the flow. Default: until scrolled away. */
  peekHoldMs?: number;
  /** Peek from the same card again only after this long (Infinity = once per visit). */
  peekRepeatMs?: number;
}

export interface MascotConfig {
  sections: SectionConfig[];
  targets: TargetConfig[];
  peeks: PeekConfig[];
  /** Reactions the page drives from its own data (e.g. the order's status), by key. */
  signals?: Record<string, MascotReaction>;
  flow?: PageFlow;
  /** Overrides merged over `flow` on phone-sized viewports (see LAYOUT.phoneMaxWidth), so a page can
   * move the mascot differently on a phone (dock it, or give it a slot) without a second config.
   * Set a key to `undefined` to drop it there, e.g. `bounds: undefined` for the whole viewport. */
  phoneFlow?: Partial<PageFlow>;
}

export type TriggerKind = 'section' | 'signal' | 'peek' | 'hover' | 'focus';

export interface GestureEvent {
  name: Gesture;
  /** Increments on every trigger so the engine can tell a repeat from the same old value. */
  nonce: number;
}

export interface MascotState {
  sectionId: string | null;
  expression: Expression;
  gesture: GestureEvent | null;
  message: MascotMessage | null;
  /** Priority of whatever currently owns the expression (0 = idle). */
  priority: number;
  source: 'idle' | TriggerKind;
}
