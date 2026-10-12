import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import logo from '@/assets/caos-logo.png';
import { MascotBrain } from './brain';
import { LAYOUT, MASCOT_CONFIGS, TIMING, validateConfig } from './config';
import { createInteractionController } from './interactions';
import { readMinimized, writeMinimized } from './preference';
import { createSectionTracker, type ScrollSnapshot } from './sections';
import type { MascotEngine } from './engine/createEngine';
import { createFlowController } from './flow';
import type { MascotConfig, MascotMessage, PageId } from './types';
import './mascot.css';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Reduced motion rests the mascot in one place, a little smaller. */
const REDUCED_SIZE_SCALE = 0.7;

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

type Mode = 'loading' | '3d' | 'fallback';

const ActiveMascot: React.FC<{ config: MascotConfig; onMinimize: () => void }> = ({
  config,
  onMinimize,
}) => {
  const reduced = useReducedMotion();
  const scale = (config.flow?.sizeScale ?? 1) * (reduced ? REDUCED_SIZE_SCALE : 1);
  const [size, setSize] = useState(() => sizeForWidth(window.innerWidth, scale));
  const [mode, setMode] = useState<Mode>('loading');
  const [contextLost, setContextLost] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState<MascotMessage | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // The bubble keeps its last text while it fades out, so it never collapses to an empty pill.
  const [bubbleText, setBubbleText] = useState('');
  useEffect(() => {
    if (message) setBubbleText(message.text);
  }, [message]);

  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MascotEngine | null>(null);
  const scrollRef = useRef<ScrollSnapshot>({ progress: 0, velocity: 0, updatedAt: 0 });
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Responsive box size.
  useEffect(() => {
    const onResize = () => setSize(sizeForWidth(window.innerWidth, scale));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scale]);

  // Load the 3D engine (separate chunk). Any failure (no WebGL, chunk 404, shader error) drops to
  // the static logo; the brain, bubble and positioning keep working either way.
  useEffect(() => {
    let cancelled = false;
    let engine: MascotEngine | null = null;

    if (import.meta.env.DEV) {
      const problems = validateConfig(config);
      if (problems.length) console.warn('[mascot] invalid config:', problems);
    }

    const stage = stageRef.current;
    import('./engine/createEngine')
      .then(({ createMascotEngine }) => {
        if (cancelled || !stage) return;
        engine = createMascotEngine({
          container: stage,
          scroll: scrollRef.current,
          reducedMotion: reducedRef.current,
          onContextChange: (lost) => setContextLost(lost),
        });
        engine.resize(sizeRef.current);
        engineRef.current = engine;
        setMode('3d');
      })
      .catch((err: unknown) => {
        console.warn('[mascot] 3D unavailable, using the static logo:', err);
        if (!cancelled) setMode('fallback');
      });

    return () => {
      cancelled = true;
      engineRef.current = null;
      engine?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the engine is created once per mount
  }, []);

  useEffect(() => {
    engineRef.current?.resize(size);
  }, [size, mode]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reduced);
  }, [reduced, mode]);

  // Reveal once the mascot is ready (3D or fallback) and the hero has had its moment.
  useEffect(() => {
    if (mode === 'loading') return;
    const timer = setTimeout(() => setRevealed(true), TIMING.entranceDelayMs);
    return () => clearTimeout(timer);
  }, [mode]);

  // Once revealed: start the entrance and wire scroll, hover, focus and the flow path to the brain
  // and engine. Reduced motion skips the flow entirely: the mascot rests in a fixed corner.
  useEffect(() => {
    if (!revealed) return;
    const engine = engineRef.current;
    engine?.startEntrance();

    const brain = new MascotBrain(config);
    const unsubscribe = brain.subscribe((state) => {
      engine?.setExpression(state.expression);
      if (state.gesture) engine?.triggerGesture(state.gesture);
      setMessage(state.message);
      if (state.message?.announce) setAnnouncement(state.message.text);
    });

    const host = hostRef.current;
    const flow = host
      ? createFlowController({
          host,
          peeks: config.peeks,
          scroll: scrollRef.current,
          getSize: () => sizeRef.current,
          onPeek: (id) => (id ? brain.peek(id) : brain.unpeek()),
          onVelocity: (vx) => engine?.setFlowVelocity(vx),
          flow: config.flow,
          staticMode: reduced,
        })
      : null;

    const tracker = createSectionTracker({
      sections: config.sections,
      // The engine holds this same object and reads it per frame, so scrolling never re-renders.
      scroll: scrollRef.current,
      // Pages whose path follows form steps (not scroll) set progress themselves, below.
      trackProgress: config.flow?.progress !== 'steps',
      onFrame: () => flow?.update(),
      onActiveChange: (id) => (id ? brain.enterSection(id) : brain.clearSection()),
    });

    const interactions = createInteractionController({
      config,
      brain,
      onStep: (progress) => {
        scrollRef.current.progress = progress;
        flow?.update();
      },
      onLook: (rect) => {
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

    return () => {
      interactions.dispose();
      tracker.dispose();
      flow?.dispose();
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
  }, [revealed, reduced]);

  const showPoster = mode === 'fallback' || (mode === '3d' && contextLost);
  const live3d = mode === '3d' && !contextLost;

  const onHideClick = useCallback(() => onMinimize(), [onMinimize]);

  return (
    <div
      ref={hostRef}
      className="caos-mascot"
      data-visible={revealed}
      data-reduced={reduced}
      style={{ ['--m-size' as string]: `${size}px` }}
    >
      <div
        className="caos-mascot__bubble"
        data-open={revealed && message !== null}
        aria-hidden="true"
      >
        {bubbleText}
      </div>
      <div className="caos-mascot__body">
        <div
          ref={stageRef}
          className="caos-mascot__stage"
          style={{ display: live3d ? 'block' : 'none' }}
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
      <button
        type="button"
        className="caos-mascot__hide"
        onClick={onHideClick}
        aria-label="Hide the CAOS mascot"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
};

/** The mascot: a 3D hamster that glides down the page, pops up from behind cards and reacts to the
 * section in view and to hover/focus on key elements. Which page it is on picks its config. Mounted
 * only by PageMascot. */
const MascotExperience: React.FC<{ page: PageId }> = ({ page }) => {
  const [minimized, setMinimized] = useState(readMinimized);

  const minimize = useCallback(() => {
    writeMinimized(true);
    setMinimized(true);
  }, []);
  const restore = useCallback(() => {
    writeMinimized(false);
    setMinimized(false);
  }, []);

  if (minimized) {
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
  return <ActiveMascot config={MASCOT_CONFIGS[page]} onMinimize={minimize} />;
};

export default MascotExperience;
