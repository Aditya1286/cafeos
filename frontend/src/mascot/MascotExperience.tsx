import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import logo from '@/assets/caos-logo.png';
import { MascotBrain } from './brain';
import { LAYOUT, MASCOT_CONFIGS, TIMING, resolveFlow, validateConfig } from './config';
import { createInteractionController } from './interactions';
import { readMinimized, writeMinimized } from './preference';
import { createSectionTracker, type ScrollSnapshot } from './sections';
import type { EngineOptions, MascotEngine } from './renderer';
import { createFlowController } from './flow';
import type {
  MascotAction,
  MascotConfig,
  MascotMessage,
  MascotPageProps,
  MascotRendering,
  PageId,
} from './types';
import './mascot.css';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Reduced motion rests the mascot in one place, a little smaller. */
const REDUCED_SIZE_SCALE = 0.7;

/** The bubble shows at most this many action buttons. */
const MAX_ACTIONS = 2;

const sizeForWidth = (width: number, scale: number): number =>
  Math.round(
    (LAYOUT.sizes.find((s) => width >= s.minWidth) ?? LAYOUT.sizes[LAYOUT.sizes.length - 1]).px *
      scale,
  );

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Tracks `prefers-reduced-motion`, including changes while the page is open. */
const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(REDUCED_QUERY);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

const PHONE_QUERY = `(max-width: ${LAYOUT.phoneMaxWidth}px)`;

/** Whether the viewport is phone-sized (the page's `phoneFlow` applies), tracked live (rotation). */
const useIsPhone = (): boolean => {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return phone;
};

/** `live`: a renderer (3D or light) is drawing. `fallback`: both failed, the static logo shows. */
type Mode = 'loading' | 'live' | 'fallback';

/** Each renderer is its own chunk, fetched only when chosen. The light one never touches three.js. */
const loadRenderer = (kind: MascotRendering): Promise<(opts: EngineOptions) => MascotEngine> =>
  kind === 'light'
    ? import('./lite/createLiteEngine').then((m) => m.createLiteEngine)
    : import('./engine/createEngine').then((m) => m.createMascotEngine);

const ActiveMascot: React.FC<
  MascotPageProps & {
    config: MascotConfig;
    onMinimize: () => void;
  }
> = ({ config, signal, rendering, reactions, dress, onAction, onMinimize }) => {
  const reduced = useReducedMotion();
  const isPhone = useIsPhone();
  // The page's flow for this viewport; everything below reads this, never `config.flow` directly.
  const flow = resolveFlow(config, isPhone);
  const slotMode = flow?.mode === 'slot';
  const fixedSize = flow?.size;
  const scale = (flow?.sizeScale ?? 1) * (reduced && !slotMode ? REDUCED_SIZE_SCALE : 1);
  const pickSize = (width: number) => fixedSize ?? sizeForWidth(width, scale);
  const [size, setSize] = useState(() => pickSize(window.innerWidth));
  const [mode, setMode] = useState<Mode>('loading');
  // Which renderer is drawing. Starts as the page asked; a failing 3D engine drops to `light`.
  const [renderer, setRenderer] = useState<MascotRendering>(rendering ?? 'heavy');
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState<MascotMessage | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // The bubble keeps its last text (and buttons) while it fades out, so it never collapses to an
  // empty pill.
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleActions, setBubbleActions] = useState<MascotAction[]>([]);
  useEffect(() => {
    if (!message) return;
    setBubbleText(message.text);
    setBubbleActions(message.actions?.slice(0, MAX_ACTIONS) ?? []);
  }, [message]);

  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MascotEngine | null>(null);
  const scrollRef = useRef<ScrollSnapshot>({ progress: 0, velocity: 0, updatedAt: 0 });
  const brainRef = useRef<MascotBrain | null>(null);
  const signalRef = useRef<string | null>(signal ?? null);
  signalRef.current = signal ?? null;
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;
  const bandRef = useRef(dress?.band);
  bandRef.current = dress?.band;
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Responsive box size.
  useEffect(() => {
    const onResize = () => setSize(pickSize(window.innerWidth));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pickSize only reads these two
  }, [scale, fixedSize]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const problems = validateConfig(config);
      if (problems.length) console.warn('[mascot] invalid config:', problems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `config` is a constant per page
  }, []);

  // The page switched rendering (the café's setting arrived or changed).
  useEffect(() => {
    setRenderer(rendering ?? 'heavy');
  }, [rendering]);

  // Load the chosen renderer (each is a separate chunk). If the 3D engine fails (no WebGL, chunk
  // 404, shader error) or later loses its WebGL context, the light renderer takes over; only if
  // that fails too does the static logo show. The brain, bubble and positioning keep working
  // throughout.
  useEffect(() => {
    let cancelled = false;
    let engine: MascotEngine | null = null;
    const stage = stageRef.current;
    const dropToLight = () => {
      if (cancelled) return;
      setMode('loading');
      setRenderer('light');
    };

    loadRenderer(renderer)
      .then((create) => {
        if (cancelled || !stage) return;
        engine = create({
          container: stage,
          scroll: scrollRef.current,
          reducedMotion: reducedRef.current,
          onContextChange: (lost) => {
            if (!lost) return;
            console.warn('[mascot] WebGL context lost, switching to the light mascot');
            dropToLight();
          },
        });
        engine.resize(sizeRef.current);
        if (bandRef.current) engine.setBandColor(bandRef.current);
        engineRef.current = engine;
        // Swapped in after the mascot had already appeared: catch up with what it is doing.
        const brain = brainRef.current;
        if (brain) {
          engine.setAmbientSpin(!!flowRef.current?.ambientSpin);
          engine.setExpression(brain.getState().expression);
          engine.startEntrance();
        }
        setMode('live');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (renderer === 'heavy') {
          console.warn('[mascot] 3D unavailable, using the light mascot:', err);
          dropToLight();
        } else {
          console.warn('[mascot] light mascot unavailable, using the static logo:', err);
          setMode('fallback');
        }
      });

    return () => {
      cancelled = true;
      if (engineRef.current === engine) engineRef.current = null;
      engine?.dispose();
    };
  }, [renderer]);

  useEffect(() => {
    engineRef.current?.resize(size);
  }, [size, mode]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reduced);
  }, [reduced, mode]);

  useEffect(() => {
    if (dress?.band) engineRef.current?.setBandColor(dress.band);
  }, [dress?.band, mode]);

  // Reveal once the mascot is ready (a renderer or the fallback) and the hero has had its moment.
  useEffect(() => {
    if (mode === 'loading') return;
    const timer = setTimeout(() => setRevealed(true), TIMING.entranceDelayMs);
    return () => clearTimeout(timer);
  }, [mode]);

  // Once revealed: start the entrance and wire scroll, hover, focus and the flow path to the brain
  // and engine. Reduced motion skips the flow entirely: the mascot rests in a fixed corner. The
  // engine is always read through engineRef, because the renderer can be swapped later.
  useEffect(() => {
    if (!revealed) return;
    engineRef.current?.startEntrance();

    const brain = new MascotBrain(config);
    brainRef.current = brain;
    engineRef.current?.setAmbientSpin(!!flow?.ambientSpin);
    const unsubscribe = brain.subscribe((state) => {
      const engine = engineRef.current;
      engine?.setExpression(state.expression);
      if (state.gesture) engine?.triggerGesture(state.gesture);
      setMessage(state.message);
      if (state.message?.announce) setAnnouncement(state.message.text);
    });

    const host = hostRef.current;
    // Places the host on the page (path, dock, slot or peek); `flow` is the page's settings for it.
    const mover = host
      ? createFlowController({
          host,
          peeks: config.peeks,
          scroll: scrollRef.current,
          getSize: () => sizeRef.current,
          onPeek: (id) => (id ? brain.peek(id) : brain.unpeek()),
          onVelocity: (vx) => engineRef.current?.setFlowVelocity(vx),
          flow,
          staticMode: reduced || flow?.mode === 'static',
          onVisible: (visible) => engineRef.current?.setVisible(visible),
        })
      : null;

    const tracker = createSectionTracker({
      sections: config.sections,
      // The engine holds this same object and reads it per frame, so scrolling never re-renders.
      scroll: scrollRef.current,
      // Pages whose path follows form steps (not scroll) set progress themselves, below.
      trackProgress: flow?.progress !== 'steps',
      onFrame: () => mover?.update(),
      onActiveChange: (id) => (id ? brain.enterSection(id) : brain.clearSection()),
    });

    const interactions = createInteractionController({
      config,
      brain,
      onStep: (progress) => {
        scrollRef.current.progress = progress;
        mover?.update();
      },
      onLook: (rect) => {
        const engine = engineRef.current;
        if (!rect) return engine?.setLook(null, null);
        const box = hostRef.current?.getBoundingClientRect();
        if (!box) return;
        const dx = rect.left + rect.width / 2 - (box.left + box.width / 2);
        const dy = rect.top + rect.height / 2 - (box.top + box.height / 2);
        engine?.setLook(
          clamp(dx / (window.innerWidth / 2), -1, 1),
          clamp(dy / (window.innerHeight / 2), -1, 1),
        );
      },
    });

    // The page may already have reactions and a signal (its data loaded before the mascot was
    // ready). Reactions first: the signal may be one of their keys.
    brain.setReactions(reactionsRef.current ?? {});
    if (signalRef.current) brain.setSignal(signalRef.current);

    return () => {
      brainRef.current = null;
      interactions.dispose();
      tracker.dispose();
      mover?.dispose();
      unsubscribe();
      brain.dispose();
      // Leave the host in a neutral state for the next run (reduced-motion toggle, remount).
      const el = hostRef.current;
      if (el) {
        el.style.transform = '';
        delete el.dataset.mode;
        delete el.dataset.phase;
        delete el.dataset.body;
        delete el.dataset.bx;
        delete el.dataset.by;
        delete el.dataset.parked;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `config` is a constant per page
  }, [revealed, reduced, isPhone]);

  // The page's runtime reactions changed (its data arrived or moved on). Re-apply the signal
  // afterwards: it may name a key that only exists now.
  useEffect(() => {
    const brain = brainRef.current;
    if (!brain) return;
    brain.setReactions(reactions ?? {});
    brain.setSignal(signalRef.current);
  }, [reactions]);

  // Later changes to the page's signal (status moved on, the wait got long).
  useEffect(() => {
    brainRef.current?.setSignal(signal ?? null);
  }, [signal]);

  const showPoster = mode === 'fallback';
  const live = mode === 'live';
  const bubbleOpen = revealed && message !== null;

  const onHideClick = useCallback(() => onMinimize(), [onMinimize]);
  const onActionClick = useCallback((id: string) => {
    onActionRef.current?.(id);
    brainRef.current?.dismissMessage();
  }, []);

  const hostStyle: Record<string, string> = { '--m-size': `${size}px` };
  if (dress) {
    hostStyle['--m-bubble-bg'] = dress.bubbleBg;
    hostStyle['--m-bubble-fg'] = dress.bubbleFg;
    hostStyle['--m-bubble-border'] = dress.bubbleBorder;
  }

  return (
    <div
      ref={hostRef}
      className="caos-mascot"
      data-visible={revealed}
      data-reduced={reduced}
      data-slot={slotMode ? 'true' : undefined}
      style={hostStyle as React.CSSProperties}
    >
      <div className="caos-mascot__bubble" data-open={bubbleOpen}>
        <span aria-hidden="true">{bubbleText}</span>
        {bubbleActions.length > 0 && (
          // The only part of the bubble that takes taps. Named by the bubble's text, so a screen
          // reader hears what "Add" is about.
          <span
            className="caos-mascot__actions"
            role="group"
            aria-label={bubbleText}
            aria-hidden={!bubbleOpen}
          >
            {bubbleActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="caos-mascot__action"
                tabIndex={bubbleOpen ? 0 : -1}
                onClick={() => onActionClick(action.id)}
              >
                {action.label}
              </button>
            ))}
          </span>
        )}
      </div>
      <div className="caos-mascot__body">
        <div
          ref={stageRef}
          className="caos-mascot__stage"
          data-renderer={renderer}
          style={{ display: live ? 'block' : 'none' }}
        />
        {showPoster && (
          <img
            className="caos-mascot__poster"
            src={logo}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        )}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {/* In a slot the mascot is part of the page, not an overlay: nothing to dismiss. */}
      {!slotMode && (
        <button
          type="button"
          className="caos-mascot__hide"
          onClick={onHideClick}
          aria-label="Hide the CAOS mascot"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

/** The mascot: a hamster (3D, or flat in light rendering) that glides down the page, pops up from
 * behind cards and reacts to the section in view, to hover/focus on key elements and to the page's
 * own signals. Which page it is on picks its config. Mounted only by PageMascot. */
const MascotExperience: React.FC<MascotPageProps & { page: PageId }> = ({ page, ...props }) => {
  const [minimized, setMinimized] = useState(readMinimized);
  const isPhone = useIsPhone();

  const minimize = useCallback(() => {
    writeMinimized(true);
    setMinimized(true);
  }, []);
  const restore = useCallback(() => {
    writeMinimized(false);
    setMinimized(false);
  }, []);

  // A slotted mascot ignores the hide preference: there is no overlay to dismiss, and hiding it
  // would leave its reserved spot empty.
  const slotMode = resolveFlow(MASCOT_CONFIGS[page], isPhone)?.mode === 'slot';

  if (minimized && !slotMode) {
    return (
      <button
        type="button"
        className="caos-mascot__restore"
        onClick={restore}
        aria-label="Show the CAOS mascot"
      >
        <img src={logo} alt="" aria-hidden="true" draggable={false} />
      </button>
    );
  }
  return <ActiveMascot config={MASCOT_CONFIGS[page]} {...props} onMinimize={minimize} />;
};

export default MascotExperience;
